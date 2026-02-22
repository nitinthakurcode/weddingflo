-- Migration: 0009_consolidate_user_tables.sql
-- February 2026 - Consolidate user tables
--
-- This migration adds missing fields to the BetterAuth user table
-- to serve as the single source of truth for user data.
-- The app `users` table is now deprecated.

-- Add avatar_url column to BetterAuth user table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add is_active column to BetterAuth user table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS user_company_id_idx ON "user"(company_id);
CREATE INDEX IF NOT EXISTS user_email_idx ON "user"(email);
CREATE INDEX IF NOT EXISTS user_role_idx ON "user"(role);

-- Migrate existing data from users table to user table
-- This syncs avatar_url and is_active from the app users table
UPDATE "user" u
SET
  avatar_url = COALESCE(u.avatar_url, usr.avatar_url),
  is_active = COALESCE(u.is_active, usr.is_active, true)
FROM users usr
WHERE u.id = usr.auth_id;

-- Note: The `users` table is deprecated but NOT dropped.
-- It will be removed in a future migration after verifying
-- all code has been updated to use the BetterAuth user table.
