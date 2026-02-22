-- ============================================================================
-- Migration 0025: Prepare OAuth Token Encryption
-- ============================================================================
-- WeddingFlo Security Remediation — Phase 2.2
--
-- This migration:
--   1. Adds an encrypted_at column to track which tokens have been migrated
--   2. Adds a comment to remind developers these columns are AES-256-GCM encrypted
--
-- The ACTUAL encryption of existing tokens is done by the TypeScript migration
-- script (encrypt-existing-tokens.ts) which reads, encrypts, and writes back.
-- SQL cannot do AES-256-GCM encryption natively without pgcrypto + custom code.
--
-- RUN AS: Superuser or weddingflo_app
-- ============================================================================

-- Transaction managed by Drizzle migrator

-- Track which rows have been encrypted
ALTER TABLE account
  ADD COLUMN IF NOT EXISTS tokens_encrypted_at TIMESTAMPTZ DEFAULT NULL;

-- Add comments for developer awareness
COMMENT ON COLUMN account.access_token IS
  'AES-256-GCM encrypted. Decrypt with token-encryption.ts before use. Format: iv:tag:ciphertext (base64).';

COMMENT ON COLUMN account.refresh_token IS
  'AES-256-GCM encrypted. Decrypt with token-encryption.ts before use. Format: iv:tag:ciphertext (base64).';

-- Also encrypt Google Calendar tokens if stored separately
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'google_calendar_tokens'
  ) THEN
    EXECUTE 'ALTER TABLE google_calendar_tokens ADD COLUMN IF NOT EXISTS tokens_encrypted_at TIMESTAMPTZ DEFAULT NULL';
  END IF;
END
$$;

-- End of migration (transaction managed by Drizzle)
