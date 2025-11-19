-- =====================================================
-- FIX FLOOR PLANS RLS POLICIES
-- Convert from deprecated current_setting() to Clerk JWT pattern
-- =====================================================
-- This migration fixes the RLS policies to use the correct
-- auth.jwt()->'metadata'->>'company_id' pattern that matches
-- all other tables in WeddingFlow Pro.
-- =====================================================

-- =====================================================
-- 1. FLOOR_PLANS TABLE - Fix RLS Policy
-- =====================================================
DROP POLICY IF EXISTS "companies_manage_floor_plans" ON floor_plans;

-- Floor plans are linked to clients, so verify via clients table
CREATE POLICY "Users can view floor plans in their company"
  ON floor_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = floor_plans.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can insert floor plans for their company clients"
  ON floor_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = floor_plans.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can update floor plans in their company"
  ON floor_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = floor_plans.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can delete floor plans in their company"
  ON floor_plans FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = floor_plans.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

-- =====================================================
-- 2. FLOOR_PLAN_TABLES TABLE - Fix RLS Policy
-- =====================================================
DROP POLICY IF EXISTS "companies_manage_floor_plan_tables" ON floor_plan_tables;

CREATE POLICY "Users can view floor plan tables in their company"
  ON floor_plan_tables FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM floor_plans fp
      INNER JOIN clients c ON c.id = fp.client_id
      WHERE fp.id = floor_plan_tables.floor_plan_id
      AND c.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can insert floor plan tables for their company"
  ON floor_plan_tables FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM floor_plans fp
      INNER JOIN clients c ON c.id = fp.client_id
      WHERE fp.id = floor_plan_tables.floor_plan_id
      AND c.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can update floor plan tables in their company"
  ON floor_plan_tables FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM floor_plans fp
      INNER JOIN clients c ON c.id = fp.client_id
      WHERE fp.id = floor_plan_tables.floor_plan_id
      AND c.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can delete floor plan tables in their company"
  ON floor_plan_tables FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM floor_plans fp
      INNER JOIN clients c ON c.id = fp.client_id
      WHERE fp.id = floor_plan_tables.floor_plan_id
      AND c.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

-- =====================================================
-- 3. FLOOR_PLAN_GUESTS TABLE - Fix RLS Policy
-- =====================================================
DROP POLICY IF EXISTS "companies_manage_floor_plan_guests" ON floor_plan_guests;

CREATE POLICY "Users can view floor plan guests in their company"
  ON floor_plan_guests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM floor_plans fp
      INNER JOIN clients c ON c.id = fp.client_id
      WHERE fp.id = floor_plan_guests.floor_plan_id
      AND c.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can insert floor plan guests for their company"
  ON floor_plan_guests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM floor_plans fp
      INNER JOIN clients c ON c.id = fp.client_id
      WHERE fp.id = floor_plan_guests.floor_plan_id
      AND c.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can update floor plan guests in their company"
  ON floor_plan_guests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM floor_plans fp
      INNER JOIN clients c ON c.id = fp.client_id
      WHERE fp.id = floor_plan_guests.floor_plan_id
      AND c.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can delete floor plan guests in their company"
  ON floor_plan_guests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM floor_plans fp
      INNER JOIN clients c ON c.id = fp.client_id
      WHERE fp.id = floor_plan_guests.floor_plan_id
      AND c.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

-- =====================================================
-- VERIFICATION COMMENTS
-- =====================================================
COMMENT ON POLICY "Users can view floor plans in their company" ON floor_plans IS
  'Updated to use Clerk JWT (auth.jwt()->metadata->company_id) instead of deprecated current_setting()';

COMMENT ON POLICY "Users can view floor plan tables in their company" ON floor_plan_tables IS
  'Updated to use Clerk JWT (auth.jwt()->metadata->company_id) instead of deprecated current_setting()';

COMMENT ON POLICY "Users can view floor plan guests in their company" ON floor_plan_guests IS
  'Updated to use Clerk JWT (auth.jwt()->metadata->company_id) instead of deprecated current_setting()';
