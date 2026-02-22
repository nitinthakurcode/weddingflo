/**
 * @module token-encryption
 * @description AES-256-GCM encryption for OAuth tokens stored in the `account` table.
 *
 * Google OAuth refresh tokens are long-lived credentials that grant access to user
 * Google accounts. If the database is compromised, unencrypted tokens let attackers
 * impersonate users on Google services. This module encrypts tokens at rest using
 * AES-256-GCM (authenticated encryption), so a DB breach alone is insufficient.
 *
 * Encrypted format: `iv:authTag:ciphertext` (all base64-encoded, colon-separated)
 *
 * @example
 * ```typescript
 * import { encryptToken, decryptToken, isEncrypted } from '@/lib/crypto/token-encryption';
 *
 * // Encrypt before storing
 * const encrypted = encryptToken(oauthRefreshToken);
 * await db.update(account).set({ refreshToken: encrypted });
 *
 * // Decrypt when reading
 * const row = await db.select().from(account).where(...);
 * const plainToken = decryptToken(row.refreshToken);
 * ```
 *
 * @requires TOKEN_ENCRYPTION_KEY - 32-byte base64-encoded key in environment variables.
 *   Generate with: `openssl rand -base64 32`
 *
 * WeddingFlo Security Remediation — Phase 2.2
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** AES-256-GCM — authenticated encryption with associated data */
const ALGORITHM = 'aes-256-gcm' as const;

/** GCM recommended IV length: 12 bytes (96 bits) per NIST SP 800-38D */
const IV_LENGTH = 12;

/** GCM authentication tag length: 16 bytes (128 bits) — maximum security */
const AUTH_TAG_LENGTH = 16;

/** Separator between IV, auth tag, and ciphertext in the stored string */
const SEPARATOR = ':';

/** Prefix to identify encrypted values (allows safe re-encryption avoidance) */
const ENCRYPTED_PREFIX = 'enc:v1:';

// ---------------------------------------------------------------------------
// Key management
// ---------------------------------------------------------------------------

/**
 * Load and validate the encryption key from environment variables.
 * The key MUST be exactly 32 bytes (256 bits) when decoded from base64.
 *
 * @throws {Error} If TOKEN_ENCRYPTION_KEY is missing or wrong length
 */
function getEncryptionKey(): Buffer {
  const keyBase64 = process.env.TOKEN_ENCRYPTION_KEY;

  if (!keyBase64) {
    throw new Error(
      '[token-encryption] TOKEN_ENCRYPTION_KEY environment variable is not set. ' +
      'Generate one with: openssl rand -base64 32'
    );
  }

  const key = Buffer.from(keyBase64, 'base64');

  if (key.length !== 32) {
    throw new Error(
      `[token-encryption] TOKEN_ENCRYPTION_KEY must be exactly 32 bytes (256 bits). ` +
      `Got ${key.length} bytes. Generate a new key with: openssl rand -base64 32`
    );
  }

  return key;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Encrypt a plaintext token using AES-256-GCM.
 *
 * Each call generates a unique random IV, ensuring identical plaintexts
 * produce different ciphertexts. The GCM auth tag provides integrity
 * verification — any tampering with the ciphertext will be detected.
 *
 * @param plaintext - The OAuth token to encrypt
 * @returns Encrypted string in format: `enc:v1:iv:authTag:ciphertext` (base64)
 *
 * @throws {Error} If the encryption key is not configured
 * @throws {Error} If plaintext is empty
 */
export function encryptToken(plaintext: string): string {
  if (!plaintext || plaintext.length === 0) {
    throw new Error('[token-encryption] Cannot encrypt empty string');
  }

  // Don't double-encrypt
  if (isEncrypted(plaintext)) {
    return plaintext;
  }

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Format: enc:v1:iv:authTag:ciphertext
  return [
    ENCRYPTED_PREFIX.slice(0, -1), // Remove trailing colon (added by join)
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(SEPARATOR);
}

/**
 * Decrypt an AES-256-GCM encrypted token.
 *
 * Validates the authentication tag to ensure the ciphertext hasn't been
 * tampered with. If decryption fails (wrong key, corrupted data, tampering),
 * an error is thrown rather than returning garbage.
 *
 * @param encryptedStr - Encrypted string from `encryptToken()`
 * @returns The original plaintext token
 *
 * @throws {Error} If the encryption key is not configured
 * @throws {Error} If the encrypted string format is invalid
 * @throws {Error} If authentication tag verification fails (data tampered)
 */
export function decryptToken(encryptedStr: string): string {
  if (!encryptedStr || encryptedStr.length === 0) {
    throw new Error('[token-encryption] Cannot decrypt empty string');
  }

  // If the value isn't encrypted (legacy plaintext), return as-is.
  // This enables gradual migration — unencrypted tokens still work.
  if (!isEncrypted(encryptedStr)) {
    return encryptedStr;
  }

  const key = getEncryptionKey();

  // Strip prefix and split: "enc:v1:iv:authTag:ciphertext"
  const withoutPrefix = encryptedStr.slice(ENCRYPTED_PREFIX.length);
  const parts = withoutPrefix.split(SEPARATOR);

  if (parts.length !== 3) {
    throw new Error(
      '[token-encryption] Invalid encrypted token format. ' +
      `Expected 3 parts (iv:authTag:ciphertext) after prefix, got ${parts.length}.`
    );
  }

  const [ivB64, authTagB64, ciphertextB64] = parts;

  const iv = Buffer.from(ivB64!, 'base64');
  const authTag = Buffer.from(authTagB64!, 'base64');
  const ciphertext = Buffer.from(ciphertextB64!, 'base64');

  if (iv.length !== IV_LENGTH) {
    throw new Error(`[token-encryption] Invalid IV length: ${iv.length} (expected ${IV_LENGTH})`);
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(`[token-encryption] Invalid auth tag length: ${authTag.length} (expected ${AUTH_TAG_LENGTH})`);
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(), // Throws if auth tag verification fails
  ]);

  return decrypted.toString('utf8');
}

/**
 * Check whether a string is already encrypted by this module.
 * Uses the `enc:v1:` prefix to identify encrypted values.
 *
 * @param value - The string to check
 * @returns true if the value appears to be encrypted
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX);
}

/**
 * Re-encrypt a token with a new key. Used during key rotation.
 *
 * @param encryptedStr - Token encrypted with the OLD key
 * @param oldKeyBase64 - The old encryption key (base64-encoded)
 * @returns Token encrypted with the CURRENT key from env
 */
export function reEncryptToken(encryptedStr: string, oldKeyBase64: string): string {
  if (!isEncrypted(encryptedStr)) {
    // Not encrypted — just encrypt with current key
    return encryptToken(encryptedStr);
  }

  // Decrypt with old key
  const oldKey = Buffer.from(oldKeyBase64, 'base64');
  const withoutPrefix = encryptedStr.slice(ENCRYPTED_PREFIX.length);
  const [ivB64, authTagB64, ciphertextB64] = withoutPrefix.split(SEPARATOR);

  const iv = Buffer.from(ivB64!, 'base64');
  const authTag = Buffer.from(authTagB64!, 'base64');
  const ciphertext = Buffer.from(ciphertextB64!, 'base64');

  const decipher = createDecipheriv(ALGORITHM, oldKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  const plaintext = decrypted.toString('utf8');

  // Re-encrypt with current key
  return encryptToken(plaintext);
}
