-- ============================================================================
-- Migration 0028: Add company_id + RLS to client_vendors
-- ============================================================================
-- client_vendors was listed as a "child table" in migration 0024, relying on
-- transitive FK isolation. However, direct queries bypass parent RLS, so it
-- needs its own company_id column and tenant_isolation policy.
-- ============================================================================

-- 1. Add column (nullable — existing rows need backfill)
ALTER TABLE client_vendors ADD COLUMN IF NOT EXISTS company_id TEXT;

-- 2. Backfill from clients table
UPDATE client_vendors cv SET company_id = c.company_id
FROM clients c
WHERE cv.client_id = c.id AND cv.company_id IS NULL AND c.company_id IS NOT NULL;

-- 3. Add index for RLS performance
CREATE INDEX IF NOT EXISTS client_vendors_company_id_idx ON client_vendors(company_id);

-- 4. Enable RLS + FORCE
ALTER TABLE client_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_vendors FORCE ROW LEVEL SECURITY;

-- 5. Create tenant isolation policy (matching pattern from migration 0024)
DROP POLICY IF EXISTS tenant_isolation ON client_vendors;
CREATE POLICY tenant_isolation ON client_vendors
  FOR ALL
  USING (company_id = current_company_id() OR is_super_admin())
  WITH CHECK (company_id = current_company_id() OR is_super_admin());
