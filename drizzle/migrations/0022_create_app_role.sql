-- ============================================================================
-- Migration 0022: Create Non-Superuser Application Role
-- ============================================================================
-- WeddingFlo Security Remediation — Phase 2.1 (RLS Prerequisite)
--
-- WHY: PostgreSQL superusers bypass ALL Row-Level Security policies.
--      The application MUST connect as a non-superuser for RLS to work.
--
-- RUN AS: Your current superuser/admin role (e.g., postgres)
-- RUN ONCE: This migration creates the role and grants permissions.
--
-- AFTER THIS MIGRATION:
--   Update DATABASE_URL to use weddingflo_app instead of the superuser.
--   Keep the superuser credentials for migrations and emergency access only.
-- ============================================================================

-- Transaction managed by Drizzle migrator

-- 1. Create the application role (NOT a superuser, NOT a replication role)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'weddingflo_app') THEN
    CREATE ROLE weddingflo_app LOGIN PASSWORD 'CHANGE_ME_BEFORE_RUNNING';
  END IF;
END
$$;

-- 2. Grant connect access to the current database
DO $$ BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO weddingflo_app', current_database());
END $$;

-- 3. Grant schema usage
GRANT USAGE ON SCHEMA public TO weddingflo_app;

-- 4. Grant DML on all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO weddingflo_app;

-- 5. Grant sequence usage (for serial/identity columns)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO weddingflo_app;

-- 6. Ensure future tables/sequences also get permissions automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO weddingflo_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO weddingflo_app;

-- 7. Allow the app role to SET session-level variables (required for RLS context)
-- This is safe — SET LOCAL only affects the current transaction.
-- No additional GRANT is needed for SET LOCAL in PostgreSQL 15+.

-- End of migration (transaction managed by Drizzle)

-- ============================================================================
-- POST-MIGRATION STEPS:
-- ============================================================================
-- 1. Change the password above to a strong random value:
--      ALTER ROLE weddingflo_app WITH PASSWORD '<openssl rand -base64 32>';
--
-- 2. Update your .env / environment variables:
--      DATABASE_URL=postgresql://weddingflo_app:<password>@<host>/<db>?sslmode=require
--
-- 3. Keep the superuser credentials in a secure vault for:
--      - Running future migrations
--      - Emergency access / debugging
--      - Adding new tables (default privileges handle DML grants)
--
-- 4. Restart the application with the new DATABASE_URL.
--
-- 5. Verify the app works correctly before proceeding to migration 0023.
-- ============================================================================
