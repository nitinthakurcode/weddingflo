-- ============================================================================
-- Migration 0023: RLS Helper Functions + Denormalize companyId
-- ============================================================================
-- WeddingFlo Security Remediation — Phase 2.1 (RLS Foundation)
--
-- This migration does two things:
--   A) Creates the helper function that RLS policies use to read tenant context
--   B) Adds a companyId column to child tables that only have clientId,
--      then backfills from the clients table.
--
-- WHY DENORMALIZE? Tables like guests, events, budget, timeline, hotels,
-- guest_transport, gifts, floor_plans reference clients.id (clientId) but
-- do NOT have a direct companyId column. RLS policies with JOINs are
-- extremely slow and fragile. Denormalizing companyId onto these tables
-- is the standard approach for multi-tenant RLS.
--
-- RUN AS: Superuser (before switching to weddingflo_app)
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART A: RLS HELPER FUNCTIONS
-- ============================================================================

/**
 * Returns the current tenant (company) ID from the session-level variable.
 * Called by every RLS policy's USING/WITH CHECK clause.
 *
 * Marked STABLE so PostgreSQL can cache within a single statement.
 * The second argument (true) to current_setting means: return NULL
 * instead of throwing an error if the variable is not set.
 */
CREATE OR REPLACE FUNCTION current_company_id()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('app.current_company_id', true), '')::TEXT;
$$ LANGUAGE SQL STABLE;

/**
 * Returns the current user's role from the session-level variable.
 * Used by super_admin bypass policies.
 */
CREATE OR REPLACE FUNCTION current_app_role()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('app.current_role', true), '')::TEXT;
$$ LANGUAGE SQL STABLE;

/**
 * Returns true if the current session has super_admin privileges.
 * Super admins can see all tenant data for platform-wide operations.
 */
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT current_app_role() = 'super_admin';
$$ LANGUAGE SQL STABLE;


-- ============================================================================
-- PART B: ADD companyId TO CHILD TABLES
-- ============================================================================
-- These tables currently reference a client via clientId, but clients belong
-- to a company. We add companyId directly so RLS policies can filter without
-- an expensive JOIN.

-- Helper: safely add column if it doesn't exist
CREATE OR REPLACE FUNCTION add_column_if_not_exists(
  _table TEXT,
  _column TEXT,
  _type TEXT
) RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = _table
      AND column_name = _column
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s', _table, _column, _type);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add companyId to child tables that only have clientId
SELECT add_column_if_not_exists('guests',          'company_id', 'TEXT');
SELECT add_column_if_not_exists('events',          'company_id', 'TEXT');
SELECT add_column_if_not_exists('timeline',        'company_id', 'TEXT');
SELECT add_column_if_not_exists('budget',          'company_id', 'TEXT');
SELECT add_column_if_not_exists('hotels',          'company_id', 'TEXT');
SELECT add_column_if_not_exists('guest_transport', 'company_id', 'TEXT');
SELECT add_column_if_not_exists('gifts',           'company_id', 'TEXT');
SELECT add_column_if_not_exists('floor_plans',     'company_id', 'TEXT');

-- Backfill companyId from the clients table
-- Uses Drizzle's camelCase → snake_case mapping: clients.companyId → "companyId"
-- Adjust the column name below to match your actual schema (companyId or company_id)
UPDATE guests g
  SET company_id = c."companyId"
  FROM clients c
  WHERE g."clientId" = c.id
    AND g.company_id IS NULL;

UPDATE events e
  SET company_id = c."companyId"
  FROM clients c
  WHERE e."clientId" = c.id
    AND e.company_id IS NULL;

UPDATE timeline t
  SET company_id = c."companyId"
  FROM clients c
  WHERE t."clientId" = c.id
    AND t.company_id IS NULL;

UPDATE budget b
  SET company_id = c."companyId"
  FROM clients c
  WHERE b."clientId" = c.id
    AND b.company_id IS NULL;

UPDATE hotels h
  SET company_id = c."companyId"
  FROM clients c
  WHERE h."clientId" = c.id
    AND h.company_id IS NULL;

UPDATE guest_transport gt
  SET company_id = c."companyId"
  FROM clients c
  WHERE gt."clientId" = c.id
    AND gt.company_id IS NULL;

UPDATE gifts g
  SET company_id = c."companyId"
  FROM clients c
  WHERE g."clientId" = c.id
    AND g.company_id IS NULL;

UPDATE floor_plans fp
  SET company_id = c."companyId"
  FROM clients c
  WHERE fp."clientId" = c.id
    AND fp.company_id IS NULL;

-- Add indexes on the new companyId columns for RLS performance
CREATE INDEX IF NOT EXISTS idx_guests_company_id          ON guests(company_id);
CREATE INDEX IF NOT EXISTS idx_events_company_id          ON events(company_id);
CREATE INDEX IF NOT EXISTS idx_timeline_company_id        ON timeline(company_id);
CREATE INDEX IF NOT EXISTS idx_budget_company_id          ON budget(company_id);
CREATE INDEX IF NOT EXISTS idx_hotels_company_id          ON hotels(company_id);
CREATE INDEX IF NOT EXISTS idx_guest_transport_company_id ON guest_transport(company_id);
CREATE INDEX IF NOT EXISTS idx_gifts_company_id           ON gifts(company_id);
CREATE INDEX IF NOT EXISTS idx_floor_plans_company_id     ON floor_plans(company_id);

-- Drop the helper function (no longer needed)
DROP FUNCTION IF EXISTS add_column_if_not_exists(TEXT, TEXT, TEXT);

COMMIT;

-- ============================================================================
-- IMPORTANT: COLUMN NAME MAPPING
-- ============================================================================
-- Drizzle ORM may map column names differently depending on your config:
--   - Default:   JavaScript camelCase → PostgreSQL camelCase (companyId)
--   - Snake case: JavaScript camelCase → PostgreSQL snake_case (company_id)
--
-- This migration uses "companyId" (quoted camelCase) when referencing
-- EXISTING columns from the architecture, and company_id (snake_case)
-- for NEW columns added by this migration.
--
-- If your Drizzle schema uses a different mapping, adjust the UPDATE
-- statements above. You can check your actual column names with:
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'clients' AND column_name ILIKE '%company%';
--
-- Then update the JOIN conditions accordingly.
-- ============================================================================
