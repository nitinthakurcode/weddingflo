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
 *   - canConnect() read-only check
 *   - SSEConnectionLimitError details
 *
 * Uses an in-memory Redis mock — no live Redis credentials required.
 *
 * RUN: npx jest tests/security/sse-connection-manager.test.ts
 *
 * WeddingFlo Security Remediation — Phase 2.5 (Tests)
 */

// ---------------------------------------------------------------------------
// In-memory Redis mock — everything inside factory to avoid jest.mock hoisting.
// jest.mock() factories are hoisted above ALL const/let declarations.
// The store is created inside the factory and attached to globalThis.
// ---------------------------------------------------------------------------

vi.mock('@upstash/redis', () => {
  const store = new Map<string, number>();
  // Expose for test cleanup if needed
  (globalThis as Record<string, unknown>).__sseTestStore = store;

  function createPipeline() {
    const ops: Array<() => number | string> = [];

    const p = {
      incr(key: string) {
        ops.push(() => {
          const val = (store.get(key) ?? 0) + 1;
          store.set(key, val);
          return val;
        });
        return p;
      },
      decr(key: string) {
        ops.push(() => {
          const val = (store.get(key) ?? 0) - 1;
          store.set(key, val);
          return val;
        });
        return p;
      },
      expire() {
        ops.push(() => 'OK');
        return p;
      },
      async exec() {
        return ops.map((op) => op());
      },
    };

    return p;
  }

  return {
    Redis: {
      fromEnv: vi.fn(() => ({
        get: vi.fn(async (key: string) => store.get(key) ?? null),
        del: vi.fn(async (key: string) => { store.delete(key); return 1; }),
        pipeline: vi.fn(() => createPipeline()),
      })),
    },
  };
});

// ---------------------------------------------------------------------------
// Imports (after mock declaration)
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import {
  SSEConnectionManager,
  SSEConnectionLimitError,
} from '../../src/lib/sse/connection-manager';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const manager = new SSEConnectionManager({
  maxPerUser: 3,
  maxPerCompany: 5,
  counterTtlSeconds: 60,
});

const testId = Date.now().toString(36);
const USER_A = `test-user-a-${testId}`;
const USER_B = `test-user-b-${testId}`;
const COMPANY = `test-company-${testId}`;
const COMPANY_2 = `test-company-2-${testId}`;

// ---------------------------------------------------------------------------
// Cleanup between tests
// ---------------------------------------------------------------------------

beforeEach(async () => {
  await manager.forceDisconnectUser(USER_A);
  await manager.forceDisconnectUser(USER_B);
  await manager.forceDisconnectCompany(COMPANY);
  await manager.forceDisconnectCompany(COMPANY_2);
});

afterAll(async () => {
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

      for (const g of guards) await g.release();
    });

    it('rejects when per-user limit is exceeded', async () => {
      const guards = [];
      for (let i = 0; i < 3; i++) {
        guards.push(await manager.acquire(USER_A, COMPANY));
      }

      await expect(manager.acquire(USER_A, COMPANY)).rejects.toThrow(
        SSEConnectionLimitError
      );

      for (const g of guards) await g.release();
    });

    it('allows new connection after releasing one', async () => {
      const guards = [];
      for (let i = 0; i < 3; i++) {
        guards.push(await manager.acquire(USER_A, COMPANY));
      }

      await guards[0]!.release();

      const newGuard = await manager.acquire(USER_A, COMPANY);
      expect(newGuard.released).toBe(false);

      await newGuard.release();
      for (const g of guards.slice(1)) await g.release();
    });
  });

  // ---- Per-company limits ----
  describe('per-company limits', () => {
    it('rejects when per-company limit is exceeded', async () => {
      const guards = [];
      for (let i = 0; i < 3; i++) {
        guards.push(await manager.acquire(USER_A, COMPANY));
      }
      for (let i = 0; i < 2; i++) {
        guards.push(await manager.acquire(USER_B, COMPANY));
      }

      const counts = await manager.getCounts(USER_A, COMPANY);
      expect(counts.companyConnections).toBe(5);

      await expect(manager.acquire(USER_B, COMPANY)).rejects.toThrow(
        SSEConnectionLimitError
      );

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
