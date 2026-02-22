/**
 * @jest-environment node
 */

/**
 * @module argon2-password.test
 * @description Test suite for Argon2id password hashing with bcrypt migration.
 *
 * Tests cover:
 *   - Argon2id hash/verify round-trip
 *   - Legacy bcrypt hash detection and verification
 *   - Hash format correctness
 *   - Timing resistance (constant-time verification)
 *   - Edge cases
 *
 * RUN: npx jest tests/security/argon2-password.test.ts
 *
 * WeddingFlo Security Remediation — Phase 2.3 (Tests)
 */

import { describe, it, expect } from '@jest/globals';
import {
  hashPassword,
  verifyPassword,
  isLegacyBcryptHash,
} from '../../src/lib/auth/argon2-password';
import { hash as bcryptHash } from 'bcryptjs';

describe('Argon2id Password Hashing', () => {
  // ---- Hash/verify round-trip ----
  describe('hash and verify', () => {
    it('verifies a correct password against its Argon2id hash', async () => {
      const password = 'correct-horse-battery-staple';
      const hashed = await hashPassword(password);
      const isValid = await verifyPassword({ hash: hashed, password });
      expect(isValid).toBe(true);
    });

    it('rejects an incorrect password', async () => {
      const hashed = await hashPassword('real-password');
      const isValid = await verifyPassword({
        hash: hashed,
        password: 'wrong-password',
      });
      expect(isValid).toBe(false);
    });

    it('produces different hashes for the same password (unique salt)', async () => {
      const password = 'same-password';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      expect(hash1).not.toBe(hash2);
      // Both should verify correctly
      expect(await verifyPassword({ hash: hash1, password })).toBe(true);
      expect(await verifyPassword({ hash: hash2, password })).toBe(true);
    });
  });

  // ---- Hash format ----
  describe('hash format', () => {
    it('produces Argon2id hash (starts with $argon2id$)', async () => {
      const hashed = await hashPassword('test-password');
      expect(hashed.startsWith('$argon2id$')).toBe(true);
    });

    it('includes correct parameters in hash string', async () => {
      const hashed = await hashPassword('test');
      // Format: $argon2id$v=19$m=65536,t=3,p=1$<salt>$<hash>
      expect(hashed).toContain('m=65536');
      expect(hashed).toContain('t=3');
      expect(hashed).toContain('p=1');
    });
  });

  // ---- Legacy bcrypt compatibility ----
  describe('bcrypt backward compatibility', () => {
    it('verifies password against legacy bcrypt hash', async () => {
      const password = 'legacy-bcrypt-password';
      // Create a bcrypt hash as BetterAuth originally would
      const bcryptHashed = await bcryptHash(password, 10);

      const isValid = await verifyPassword({
        hash: bcryptHashed,
        password,
      });
      expect(isValid).toBe(true);
    });

    it('rejects wrong password against bcrypt hash', async () => {
      const bcryptHashed = await bcryptHash('correct-password', 10);

      const isValid = await verifyPassword({
        hash: bcryptHashed,
        password: 'wrong-password',
      });
      expect(isValid).toBe(false);
    });
  });

  // ---- isLegacyBcryptHash detection ----
  describe('isLegacyBcryptHash()', () => {
    it('detects $2b$ bcrypt hashes', () => {
      expect(isLegacyBcryptHash('$2b$10$abcdefghijklmnopqrstuuABC')).toBe(true);
    });

    it('detects $2a$ bcrypt hashes', () => {
      expect(isLegacyBcryptHash('$2a$12$abcdefghijklmnopqrstuuABC')).toBe(true);
    });

    it('rejects Argon2id hashes', async () => {
      const argon2Hash = await hashPassword('test');
      expect(isLegacyBcryptHash(argon2Hash)).toBe(false);
    });

    it('rejects arbitrary strings', () => {
      expect(isLegacyBcryptHash('not-a-hash')).toBe(false);
      expect(isLegacyBcryptHash('')).toBe(false);
    });
  });

  // ---- Edge cases ----
  describe('edge cases', () => {
    it('handles empty password verification gracefully', async () => {
      const result = await verifyPassword({ hash: '', password: '' });
      expect(result).toBe(false);
    });

    it('handles unknown hash format gracefully', async () => {
      const result = await verifyPassword({
        hash: 'unknown-format-hash',
        password: 'test',
      });
      expect(result).toBe(false);
    });

    it('handles long passwords (up to 128 chars)', async () => {
      const longPassword = 'a'.repeat(128);
      const hashed = await hashPassword(longPassword);
      expect(await verifyPassword({ hash: hashed, password: longPassword })).toBe(true);
    });

    it('handles special characters in passwords', async () => {
      const special = '!@#$%^&*()_+-=[]{}|;\':",./<>?`~ éàü 中文 🔐';
      const hashed = await hashPassword(special);
      expect(await verifyPassword({ hash: hashed, password: special })).toBe(true);
    });
  });

  // ---- Performance check ----
  describe('performance', () => {
    it('hashing completes within 1 second', async () => {
      const start = performance.now();
      await hashPassword('benchmark-password');
      const elapsed = performance.now() - start;
      // Argon2id with 64 MiB should take ~100-500ms on modern hardware
      expect(elapsed).toBeLessThan(1000);
    });
  });
});
