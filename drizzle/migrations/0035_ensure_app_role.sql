-- Custom SQL migration file, put your code below! --

-- ============================================================================
-- Migration 0035: Ensure non-superuser application role (idempotent, inert)
-- ============================================================================
-- Bulletproof re-audit — Prompt 6B.1 (RLS fail-closed backstop, additive + inert).
--
-- WHY: RLS only takes effect when the app connects as a NON-superuser, NON-bypassrls
-- role (superusers and BYPASSRLS roles skip every policy). Migration 0022 created
-- `weddingflo_app`, but (a) it hard-coded a placeholder password, (b) it did not
-- make NOSUPERUSER/NOBYPASSRLS explicit, and (c) tables added AFTER 0022 (api_keys,
-- integration_connections, the e-signature tables, …) only received DML grants via
-- ALTER DEFAULT PRIVILEGES *if* they were created by the same owner. This migration
-- re-asserts the role's security posture and re-grants DML on ALL current tables so a
-- fresh environment is correct and an existing one is a safe no-op.
--
-- INERT THIS PR: nothing here switches DATABASE_URL. The application + CI continue to
-- connect as the superuser (`postgres`), so RLS stays bypassed and behavior is
-- unchanged. The actual role cutover is Prompt 6B.3.
--
-- PASSWORD: set OUT-OF-BAND, never in a migration —
--   ALTER ROLE weddingflo_app WITH PASSWORD '<openssl rand -base64 32>';
-- This migration deliberately does NOT set or reset the password.
--
-- RUN AS: superuser/owner (Drizzle migrator). All statements idempotent.
-- ============================================================================

-- 1. Ensure the role exists. Created with LOGIN but WITHOUT a usable password here;
--    the real password is applied out-of-band before the 6B.3 cutover. NOSUPERUSER +
--    NOBYPASSRLS are the CREATE ROLE defaults, but we set them explicitly below too.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'weddingflo_app') THEN
    CREATE ROLE weddingflo_app LOGIN;
  END IF;
END
$$;

-- 2. Re-assert security posture explicitly (defense-in-depth; cheap + idempotent).
--    NOBYPASSRLS is what guarantees the role can never silently skip RLS.
ALTER ROLE weddingflo_app NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;

-- 3. Connect + schema usage.
DO $$ BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO weddingflo_app', current_database());
END $$;
GRANT USAGE ON SCHEMA public TO weddingflo_app;

-- 4. DML on all CURRENT tables + sequences (covers tables added since 0022).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO weddingflo_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO weddingflo_app;

-- 5. Future tables/sequences inherit DML automatically.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO weddingflo_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO weddingflo_app;

-- NOTE: no GRANT is required for SET LOCAL of app.current_company_id (PG 15+ allows
-- a role to set custom GUCs in its own transaction). The 6B.2 context-injection
-- middleware relies on that.

-- End of migration (transaction managed by Drizzle migrator)