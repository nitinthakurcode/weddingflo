/**
 * @jest-environment node
 */

/**
 * @module token-encryption.test
 * @description Test suite for the AES-256-GCM OAuth token encryption module.
 *
 * Tests cover:
 *   - Encrypt/decrypt round-trip correctness
 *   - Tamper detection (auth tag verification)
 *   - Double-encryption prevention
 *   - Legacy plaintext passthrough
 *   - Key rotation via reEncryptToken
 *   - Edge cases (empty strings, special characters, long tokens)
 *
 * RUN: npx jest tests/security/token-encryption.test.ts
 *
 * WeddingFlo Security Remediation — Phase 2.2 (Tests)
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import {
  encryptToken,
  decryptToken,
  isEncrypted,
  reEncryptToken,
} from '../../src/lib/crypto/token-encryption';

// ---------------------------------------------------------------------------
// Setup: ensure TOKEN_ENCRYPTION_KEY is set for tests
// ---------------------------------------------------------------------------

beforeAll(() => {
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    // Generate a test key (32 bytes = 44 base64 chars)
    const { randomBytes } = require('crypto');
    process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64');
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Token Encryption (AES-256-GCM)', () => {
  const SAMPLE_TOKENS = [
    'ya29.a0ARrdaM9abc123_short',
    'ya29.a0ARrdaM9abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-._~+/=',
    '1//0gAbCdEfGhIjKlMnOpQrStUvWxYz-AbCdEfGhIjKlMnOpQrStUvWxYz_0123456789-long-refresh-token',
  ];

  // ---- Round-trip correctness ----
  describe('encrypt/decrypt round-trip', () => {
    it.each(SAMPLE_TOKENS)(
      'correctly round-trips token: %s',
      (token: string) => {
        const encrypted = encryptToken(token);
        const decrypted = decryptToken(encrypted);
        expect(decrypted).toBe(token);
      }
    );

    it('handles Unicode characters in tokens', () => {
      const token = 'token-with-émojis-🔐-and-中文';
      const encrypted = encryptToken(token);
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(token);
    });

    it('handles very long tokens (4KB)', () => {
      const token = 'x'.repeat(4096);
      const encrypted = encryptToken(token);
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(token);
    });
  });

  // ---- Encryption format ----
  describe('encrypted format', () => {
    it('encrypted string starts with enc:v1: prefix', () => {
      const encrypted = encryptToken('test-token');
      expect(encrypted.startsWith('enc:v1:')).toBe(true);
    });

    it('encrypted string has correct structure (prefix:iv:tag:ciphertext)', () => {
      const encrypted = encryptToken('test-token');
      const parts = encrypted.split(':');
      // enc:v1:iv:tag:ciphertext → 5 parts
      expect(parts.length).toBe(5);
      expect(parts[0]).toBe('enc');
      expect(parts[1]).toBe('v1');
    });

    it('same plaintext produces different ciphertexts (unique IV per call)', () => {
      const token = 'same-token-value';
      const enc1 = encryptToken(token);
      const enc2 = encryptToken(token);
      // Random IV means different ciphertext every time
      expect(enc1).not.toBe(enc2);
      // But both decrypt to the same value
      expect(decryptToken(enc1)).toBe(token);
      expect(decryptToken(enc2)).toBe(token);
    });
  });

  // ---- isEncrypted detection ----
  describe('isEncrypted()', () => {
    it('returns true for encrypted strings', () => {
      const encrypted = encryptToken('test');
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('returns false for plaintext strings', () => {
      expect(isEncrypted('ya29.a0ARrdaM9abc')).toBe(false);
      expect(isEncrypted('1//0gAbCdEfGhI')).toBe(false);
      expect(isEncrypted('')).toBe(false);
    });

    it('returns false for partial prefix', () => {
      expect(isEncrypted('enc:')).toBe(false);
      expect(isEncrypted('enc:v')).toBe(false);
    });
  });

  // ---- Double-encryption prevention ----
  describe('double-encryption prevention', () => {
    it('does not double-encrypt an already encrypted token', () => {
      const token = 'test-token';
      const encrypted = encryptToken(token);
      const doubleEncrypted = encryptToken(encrypted);
      // Should return the same encrypted string (idempotent)
      expect(doubleEncrypted).toBe(encrypted);
      // And it should still decrypt correctly
      expect(decryptToken(doubleEncrypted)).toBe(token);
    });
  });

  // ---- Legacy plaintext passthrough ----
  describe('legacy plaintext passthrough', () => {
    it('decryptToken returns plaintext strings as-is', () => {
      const plaintext = 'ya29.a0ARrdaM9abc123';
      // Decrypting a non-encrypted string should return it unchanged
      const result = decryptToken(plaintext);
      expect(result).toBe(plaintext);
    });
  });

  // ---- Tamper detection ----
  describe('tamper detection (GCM auth tag)', () => {
    it('throws when ciphertext is tampered with', () => {
      const encrypted = encryptToken('secret-token');
      // Flip a character in the ciphertext portion
      const parts = encrypted.split(':');
      const lastPart = parts[parts.length - 1]!;
      const tampered = parts.slice(0, -1).join(':') + ':' +
        (lastPart[0] === 'A' ? 'B' : 'A') + lastPart.slice(1);

      expect(() => decryptToken(tampered)).toThrow();
    });

    it('throws when auth tag is tampered with', () => {
      const encrypted = encryptToken('secret-token');
      const parts = encrypted.split(':');
      // Tamper with the auth tag (index 3)
      parts[3] = 'AAAAAAAAAAAAAAAAAAAAAA==';
      const tampered = parts.join(':');

      expect(() => decryptToken(tampered)).toThrow();
    });
  });

  // ---- Error handling ----
  describe('error handling', () => {
    it('throws on empty string encryption', () => {
      expect(() => encryptToken('')).toThrow();
    });

    it('throws on empty string decryption', () => {
      expect(() => decryptToken('')).toThrow();
    });

    it('throws on malformed encrypted string', () => {
      expect(() => decryptToken('enc:v1:invalid')).toThrow();
    });

    it('throws with wrong key', () => {
      const encrypted = encryptToken('test-token');

      // Temporarily swap key
      const originalKey = process.env.TOKEN_ENCRYPTION_KEY;
      const { randomBytes } = require('crypto');
      process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64');

      expect(() => decryptToken(encrypted)).toThrow();

      // Restore
      process.env.TOKEN_ENCRYPTION_KEY = originalKey;
    });
  });

  // ---- Key rotation ----
  describe('key rotation (reEncryptToken)', () => {
    it('re-encrypts a token from old key to new key', () => {
      const { randomBytes } = require('crypto');
      const token = 'refresh-token-to-rotate';

      // Save current key as "old"
      const oldKey = process.env.TOKEN_ENCRYPTION_KEY!;

      // Encrypt with old key
      const encryptedOld = encryptToken(token);

      // Generate and set new key
      const newKey = randomBytes(32).toString('base64');
      process.env.TOKEN_ENCRYPTION_KEY = newKey;

      // Re-encrypt: decrypt with old key, encrypt with new
      const encryptedNew = reEncryptToken(encryptedOld, oldKey);

      // Verify it decrypts with the NEW key
      expect(decryptToken(encryptedNew)).toBe(token);

      // Restore original key for other tests
      process.env.TOKEN_ENCRYPTION_KEY = oldKey;
    });

    it('encrypts plaintext tokens during rotation', () => {
      const plaintext = 'unencrypted-refresh-token';
      const oldKey = 'doesnt-matter-for-plaintext';

      const encrypted = reEncryptToken(plaintext, oldKey);
      expect(isEncrypted(encrypted)).toBe(true);
      expect(decryptToken(encrypted)).toBe(plaintext);
    });
  });
});
