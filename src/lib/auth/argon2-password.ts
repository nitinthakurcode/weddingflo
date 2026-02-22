/**
 * @module argon2-password
 * @description Argon2id password hashing with transparent bcrypt migration.
 *
 * OWASP 2025 recommends Argon2id as the default password hashing algorithm.
 * BetterAuth's default bcrypt with 10 rounds is below current standards.
 *
 * This module:
 *   - Hashes new passwords with Argon2id (OWASP-recommended parameters)
 *   - Verifies passwords against BOTH Argon2id and legacy bcrypt hashes
 *   - Transparently re-hashes bcrypt passwords to Argon2id on successful login
 *
 * The verify function detects the hash format automatically:
 *   - `$argon2id$...` → Argon2id verification
 *   - `$2a$` / `$2b$` → bcrypt verification (legacy)
 *
 * @example
 * ```typescript
 * // In src/lib/auth.ts (BetterAuth config):
 * import { hashPassword, verifyPassword } from './auth/argon2-password';
 *
 * export const auth = betterAuth({
 *   emailAndPassword: {
 *     enabled: true,
 *     password: { hash: hashPassword, verify: verifyPassword },
 *   },
 * });
 * ```
 *
 * @requires @node-rs/argon2 — npm install @node-rs/argon2
 *
 * WeddingFlo Security Remediation — Phase 2.3
 */

import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';
import { compare as bcryptCompare } from 'bcryptjs';

// ---------------------------------------------------------------------------
// Argon2id configuration — OWASP recommended parameters
// ---------------------------------------------------------------------------
// OWASP Password Storage Cheat Sheet (2025) recommends either:
//   Option A: m=47104 (46 MiB), t=1, p=1
//   Option B: m=19456 (19 MiB), t=2, p=1
//
// We use slightly stronger parameters since wedding planners handle
// sensitive client data. Adjust if login latency exceeds 500ms.

/** Argon2id hashing parameters */
const ARGON2_CONFIG = {
  /** Memory cost in KiB. 65536 KiB = 64 MiB */
  memoryCost: 65536,
  /** Time cost (iterations). Higher = slower but more resistant. */
  timeCost: 3,
  /** Degree of parallelism. Match your server's CPU core count. */
  parallelism: 1,
  /** Output hash length in bytes. 32 bytes = 256 bits. */
  outputLen: 32,
  /** Argon2 variant: 2 = Argon2id (hybrid, OWASP recommended) */
  algorithm: 2 as const,
} as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Hash a password using Argon2id.
 *
 * This function is passed to BetterAuth's `password.hash` configuration.
 * It replaces BetterAuth's default bcrypt(10) with Argon2id.
 *
 * @param password - The plaintext password to hash
 * @returns The Argon2id hash string (includes algorithm, params, salt, and hash)
 *
 * @example
 * Output format: $argon2id$v=19$m=65536,t=3,p=1$<salt>$<hash>
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2Hash(password, {
    memoryCost: ARGON2_CONFIG.memoryCost,
    timeCost: ARGON2_CONFIG.timeCost,
    parallelism: ARGON2_CONFIG.parallelism,
    outputLen: ARGON2_CONFIG.outputLen,
    algorithm: ARGON2_CONFIG.algorithm,
  });
}

/**
 * Verify a password against a stored hash.
 *
 * Supports BOTH Argon2id and legacy bcrypt hashes for seamless migration.
 * BetterAuth calls this on every sign-in attempt.
 *
 * Detection logic:
 *   - Hash starts with `$argon2` → Argon2id verification
 *   - Hash starts with `$2a$` or `$2b$` → bcrypt verification
 *   - Otherwise → reject as unknown format
 *
 * @param data.hash - The stored hash string
 * @param data.password - The plaintext password to verify
 * @returns true if the password matches the hash
 */
export async function verifyPassword(data: {
  hash: string;
  password: string;
}): Promise<boolean> {
  const { hash, password } = data;

  if (!hash || !password) {
    return false;
  }

  // Argon2id hash
  if (hash.startsWith('$argon2')) {
    return argon2Verify(hash, password, {
      memoryCost: ARGON2_CONFIG.memoryCost,
      timeCost: ARGON2_CONFIG.timeCost,
      parallelism: ARGON2_CONFIG.parallelism,
      outputLen: ARGON2_CONFIG.outputLen,
      algorithm: ARGON2_CONFIG.algorithm,
    });
  }

  // Legacy bcrypt hash
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
    return bcryptCompare(password, hash);
  }

  // Unknown hash format
  console.error(
    '[argon2-password] Unknown hash format. ' +
    `Starts with: ${hash.substring(0, 6)}...`
  );
  return false;
}

/**
 * Check whether a hash is using the legacy bcrypt format.
 *
 * Use this to determine if a user's password should be re-hashed on login.
 *
 * @param hash - The stored password hash
 * @returns true if the hash is bcrypt (should be upgraded to Argon2id)
 */
export function isLegacyBcryptHash(hash: string): boolean {
  return hash.startsWith('$2a$') || hash.startsWith('$2b$');
}

/**
 * Transparent re-hash hook for BetterAuth sign-in.
 *
 * Call this after a successful password verification. If the stored hash
 * is bcrypt, it re-hashes with Argon2id so the user is transparently
 * migrated. No user action required.
 *
 * @example
 * ```typescript
 * // In your sign-in success handler or BetterAuth afterSignIn hook:
 * import { rehashIfNeeded } from '@/lib/auth/argon2-password';
 *
 * const needsRehash = await rehashIfNeeded(db, userId, storedHash, plainPassword);
 * if (needsRehash) {
 *   console.log(`Migrated user ${userId} from bcrypt to Argon2id`);
 * }
 * ```
 *
 * @param db - Drizzle database instance
 * @param userId - The user's ID
 * @param currentHash - The currently stored password hash
 * @param plainPassword - The plaintext password (available during sign-in)
 * @returns true if the hash was upgraded
 */
export async function rehashIfNeeded(
  db: any, // Accept any Drizzle DB type to avoid schema coupling
  userId: string,
  currentHash: string,
  plainPassword: string,
): Promise<boolean> {
  if (!isLegacyBcryptHash(currentHash)) {
    return false;
  }

  const newHash = await hashPassword(plainPassword);

  // Update the password hash in the account table
  // BetterAuth stores passwords in the `account` table with providerId='credential'
  const { sql: sqlTag } = await import('drizzle-orm');
  await db.execute(
    sqlTag`UPDATE account SET password = ${newHash} WHERE "userId" = ${userId} AND "providerId" = 'credential'`
  );

  return true;
}
