/**
 * @module encrypt-existing-tokens
 * @description One-time migration script to encrypt existing OAuth tokens
 * in the `account` table using AES-256-GCM.
 *
 * This script:
 *   1. Reads all account rows with non-null, unencrypted access/refresh tokens
 *   2. Encrypts each token using token-encryption.ts
 *   3. Writes the encrypted values back in batches
 *   4. Marks each row with tokens_encrypted_at timestamp
 *
 * SAFETY:
 *   - Idempotent: skips rows already encrypted (tokens_encrypted_at is set)
 *   - Batched: processes 100 rows at a time to avoid memory issues
 *   - Transactional: each batch is atomic (all-or-nothing)
 *   - Reversible: keep the old TOKEN_ENCRYPTION_KEY to decrypt if needed
 *
 * USAGE:
 *   npx tsx scripts/encrypt-existing-tokens.ts
 *
 * PREREQUISITES:
 *   - TOKEN_ENCRYPTION_KEY must be set in environment
 *   - DATABASE_URL must point to the production database
 *   - Migration 0025 must be applied (adds tokens_encrypted_at column)
 *
 * WeddingFlo Security Remediation — Phase 2.2
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { encryptToken, isEncrypted } from '../src/lib/crypto/token-encryption';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BATCH_SIZE = 100;
const DRY_RUN = process.argv.includes('--dry-run');

// ---------------------------------------------------------------------------
// Database connection
// ---------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

if (!process.env.TOKEN_ENCRYPTION_KEY) {
  console.error('❌ TOKEN_ENCRYPTION_KEY environment variable is required');
  console.error('   Generate one with: openssl rand -base64 32');
  process.exit(1);
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

// ---------------------------------------------------------------------------
// Migration logic
// ---------------------------------------------------------------------------

interface AccountRow {
  id: string;
  accessToken: string | null;
  refreshToken: string | null;
}

async function migrateTokens(): Promise<void> {
  console.log('🔐 OAuth Token Encryption Migration');
  console.log(`   Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log('');

  // Count total rows to migrate
  const countResult = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*) as count FROM account
    WHERE (
      ("accessToken" IS NOT NULL AND "accessToken" != '')
      OR ("refreshToken" IS NOT NULL AND "refreshToken" != '')
    )
    AND (tokens_encrypted_at IS NULL)
  `);

  const totalRows = parseInt(countResult[0]?.count ?? '0', 10);
  console.log(`📊 Found ${totalRows} rows with unencrypted tokens`);

  if (totalRows === 0) {
    console.log('✅ All tokens are already encrypted. Nothing to do.');
    return;
  }

  let processed = 0;
  let encrypted = 0;
  let skipped = 0;
  let errors = 0;

  // Process in batches
  while (processed < totalRows) {
    const batch = await db.execute<AccountRow>(sql`
      SELECT id, "accessToken", "refreshToken"
      FROM account
      WHERE tokens_encrypted_at IS NULL
        AND (
          ("accessToken" IS NOT NULL AND "accessToken" != '')
          OR ("refreshToken" IS NOT NULL AND "refreshToken" != '')
        )
      LIMIT ${BATCH_SIZE}
    `);

    if (batch.length === 0) break;

    for (const row of batch) {
      try {
        let accessTokenEnc = row.accessToken;
        let refreshTokenEnc = row.refreshToken;
        let changed = false;

        // Encrypt access token if present and not already encrypted
        if (accessTokenEnc && !isEncrypted(accessTokenEnc)) {
          accessTokenEnc = encryptToken(accessTokenEnc);
          changed = true;
        }

        // Encrypt refresh token if present and not already encrypted
        if (refreshTokenEnc && !isEncrypted(refreshTokenEnc)) {
          refreshTokenEnc = encryptToken(refreshTokenEnc);
          changed = true;
        }

        if (changed && !DRY_RUN) {
          await db.execute(sql`
            UPDATE account
            SET
              "accessToken" = ${accessTokenEnc},
              "refreshToken" = ${refreshTokenEnc},
              tokens_encrypted_at = NOW()
            WHERE id = ${row.id}
          `);
          encrypted++;
        } else if (changed) {
          encrypted++;
        } else {
          skipped++;
        }

        // Mark as processed even if no change (tokens might be empty strings)
        if (!changed && !DRY_RUN) {
          await db.execute(sql`
            UPDATE account
            SET tokens_encrypted_at = NOW()
            WHERE id = ${row.id}
          `);
        }
      } catch (err) {
        errors++;
        console.error(`   ❌ Error encrypting account ${row.id}:`, err);
      }

      processed++;
    }

    const pct = Math.round((processed / totalRows) * 100);
    console.log(`   [${pct}%] Processed ${processed}/${totalRows} rows`);
  }

  console.log('');
  console.log('📋 Migration Summary:');
  console.log(`   Total processed: ${processed}`);
  console.log(`   Encrypted:       ${encrypted}`);
  console.log(`   Skipped:         ${skipped}`);
  console.log(`   Errors:          ${errors}`);
  console.log(`   Dry run:         ${DRY_RUN}`);
  console.log('');

  if (errors > 0) {
    console.error('⚠️  Some rows failed. Re-run the script to retry them.');
    process.exitCode = 1;
  } else {
    console.log('✅ Token encryption migration complete.');
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

migrateTokens()
  .catch((err) => {
    console.error('💥 Fatal migration error:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
