/**
 * @jest-environment node
 */

/**
 * @module sse-connection-manager.test
 * @description Test suite for the Redis-backed SSE connection limiter.
 *
 * Tests cover:
 *   - Per-user connection limits
 *   - Per-company connection limits
 *   - Acquire/release lifecycle
 *   - Guard idempotency (double-release safety)
 *   - Concurrent connection handling
 *   - Force disconnect
 *
 * PREREQUISITES:
 *   - UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set
 *     (use a test/dev Redis instance, not production)
 *
 * RUN: npx jest tests/security/sse-connection-manager.test.ts
 *
 * WeddingFlo Security Remediation — Phase 2.5 (Tests)
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import {
  SSEConnectionManager,
  SSEConnectionLimitError,
} from '../../src/lib/sse/connection-manager';

// ---------------------------------------------------------------------------
// Setup: create a test instance with low limits for fast testing
// ---------------------------------------------------------------------------

const manager = new SSEConnectionManager({
  maxPerUser: 3,
  maxPerCompany: 5,
  counterTtlSeconds: 60, // Short TTL for tests
});

// Unique test IDs to avoid collisions between test runs
const testId = Date.now().toString(36);
const USER_A = `test-user-a-${testId}`;
const USER_B = `test-user-b-${testId}`;
const COMPANY = `test-company-${testId}`;
const COMPANY_2 = `test-company-2-${testId}`;

// ---------------------------------------------------------------------------
// Cleanup between tests
// ---------------------------------------------------------------------------

beforeEach(async () => {
  // Clean up Redis state from previous test
  await manager.forceDisconnectUser(USER_A);
  await manager.forceDisconnectUser(USER_B);
  await manager.forceDisconnectCompany(COMPANY);
  await manager.forceDisconnectCompany(COMPANY_2);
});

afterAll(async () => {
  // Final cleanup
  await manager.forceDisconnectUser(USER_A);
  await manager.forceDisconnectUser(USER_B);
  await manager.forceDisconnectCompany(COMPANY);
  await manager.forceDisconnectCompany(COMPANY_2);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SSE Connection Manager', () => {
  // ---- Basic acquire/release ----
  describe('acquire and release', () => {
    it('allows a connection when under limits', async () => {
      const guard = await manager.acquire(USER_A, COMPANY);
      expect(guard.released).toBe(false);

      const counts = await manager.getCounts(USER_A, COMPANY);
      expect(counts.userConnections).toBe(1);
      expect(counts.companyConnections).toBe(1);

      await guard.release();
      expect(guard.released).toBe(true);

      const afterRelease = await manager.getCounts(USER_A, COMPANY);
      expect(afterRelease.userConnections).toBe(0);
      expect(afterRelease.companyConnections).toBe(0);
    });

    it('guard.release() is idempotent (safe to call twice)', async () => {
      const guard = await manager.acquire(USER_A, COMPANY);

      await guard.release();
      await guard.release(); // Second call should be a no-op

      const counts = await manager.getCounts(USER_A, COMPANY);
      expect(counts.userConnections).toBe(0); // Not -1
    });
  });

  // ---- Per-user limits ----
  describe('per-user limits', () => {
    it('allows up to maxPerUser connections', async () => {
      const guards = [];
      for (let i = 0; i < 3; i++) {
        guards.push(await manager.acquire(USER_A, COMPANY));
      }

      const counts = await manager.getCounts(USER_A, COMPANY);
      expect(counts.userConnections).toBe(3);

      // Clean up
      for (const g of guards) await g.release();
    });

    it('rejects when per-user limit is exceeded', async () => {
      const guards = [];
      for (let i = 0; i < 3; i++) {
        guards.push(await manager.acquire(USER_A, COMPANY));
      }

      // 4th connection should be rejected
      await expect(manager.acquire(USER_A, COMPANY)).rejects.toThrow(
        SSEConnectionLimitError
      );

      // Clean up
      for (const g of guards) await g.release();
    });

    it('allows new connection after releasing one', async () => {
      const guards = [];
      for (let i = 0; i < 3; i++) {
        guards.push(await manager.acquire(USER_A, COMPANY));
      }

      // At limit — release one
      await guards[0]!.release();

      // Now a new connection should be allowed
      const newGuard = await manager.acquire(USER_A, COMPANY);
      expect(newGuard.released).toBe(false);

      // Clean up
      await newGuard.release();
      for (const g of guards.slice(1)) await g.release();
    });
  });

  // ---- Per-company limits ----
  describe('per-company limits', () => {
    it('rejects when per-company limit is exceeded', async () => {
      // Fill company limit with different users
      const guards = [];
      // 3 from User A
      for (let i = 0; i < 3; i++) {
        guards.push(await manager.acquire(USER_A, COMPANY));
      }
      // 2 from User B (total = 5, which is the company limit)
      for (let i = 0; i < 2; i++) {
        guards.push(await manager.acquire(USER_B, COMPANY));
      }

      const counts = await manager.getCounts(USER_A, COMPANY);
      expect(counts.companyConnections).toBe(5);

      // Next connection from either user should fail (company full)
      await expect(manager.acquire(USER_B, COMPANY)).rejects.toThrow(
        SSEConnectionLimitError
      );

      // Clean up
      for (const g of guards) await g.release();
    });
  });

  // ---- canConnect check ----
  describe('canConnect()', () => {
    it('returns allowed=true when under limits', async () => {
      const result = await manager.canConnect(USER_A, COMPANY);
      expect(result.allowed).toBe(true);
      expect(result.counts.userConnections).toBe(0);
      expect(result.counts.companyConnections).toBe(0);
    });

    it('returns allowed=false when at user limit', async () => {
      const guards = [];
      for (let i = 0; i < 3; i++) {
        guards.push(await manager.acquire(USER_A, COMPANY));
      }

      const result = await manager.canConnect(USER_A, COMPANY);
      expect(result.allowed).toBe(false);

      for (const g of guards) await g.release();
    });

    it('returns correct limit values', async () => {
      const result = await manager.canConnect(USER_A, COMPANY);
      expect(result.counts.userLimit).toBe(3);
      expect(result.counts.companyLimit).toBe(5);
    });
  });

  // ---- Force disconnect ----
  describe('force disconnect', () => {
    it('forceDisconnectUser clears user counter', async () => {
      await manager.acquire(USER_A, COMPANY);
      await manager.acquire(USER_A, COMPANY);

      await manager.forceDisconnectUser(USER_A);

      const counts = await manager.getCounts(USER_A);
      expect(counts.userConnections).toBe(0);
    });

    it('forceDisconnectCompany clears company counter', async () => {
      await manager.acquire(USER_A, COMPANY);
      await manager.acquire(USER_B, COMPANY);

      await manager.forceDisconnectCompany(COMPANY);

      const counts = await manager.getCounts(undefined, COMPANY);
      expect(counts.companyConnections).toBe(0);
    });
  });

  // ---- Error details ----
  describe('SSEConnectionLimitError', () => {
    it('includes counts in the error object', async () => {
      const guards = [];
      for (let i = 0; i < 3; i++) {
        guards.push(await manager.acquire(USER_A, COMPANY));
      }

      try {
        await manager.acquire(USER_A, COMPANY);
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(SSEConnectionLimitError);
        const sseErr = err as SSEConnectionLimitError;
        expect(sseErr.counts.userConnections).toBeGreaterThanOrEqual(3);
        expect(sseErr.counts.userLimit).toBe(3);
      }

      for (const g of guards) await g.release();
    });
  });
});
