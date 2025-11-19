-- Migration: Create RLS Policies for Clients Table
-- Created: November 19, 2025
-- Purpose: Fix client creation failures by adding missing RLS policies
-- Severity: CRITICAL

-- ============================================================================
-- CRITICAL FIX: Clients table has NO RLS policies
-- This migration creates all necessary policies for multi-tenant access
-- ============================================================================

-- Enable RLS on clients table (may already be enabled)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "service_role_all_access_clients" ON clients;
DROP POLICY IF EXISTS "users_view_company_clients" ON clients;
DROP POLICY IF EXISTS "admins_create_clients" ON clients;
DROP POLICY IF EXISTS "admins_update_company_clients" ON clients;
DROP POLICY IF EXISTS "admins_delete_company_clients" ON clients;

-- ============================================================================
-- SERVICE ROLE BYPASS (For webhooks and backend operations)
-- ============================================================================
CREATE POLICY "service_role_all_access_clients"
  ON clients FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- SELECT POLICY: Users can view clients in their company
-- ============================================================================
CREATE POLICY "users_view_company_clients"
  ON clients FOR SELECT
  TO authenticated
  USING (
    -- User's company_id matches client's company_id
    company_id = public.get_user_company_id()
    -- OR user is super admin (can see all)
    OR public.is_super_admin()
  );

-- ============================================================================
-- INSERT POLICY: Only admins can create clients
-- ============================================================================
CREATE POLICY "admins_create_clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Client must belong to user's company
    company_id = public.get_user_company_id()
    -- AND user must be admin (company_admin or super_admin)
    AND public.is_admin()
  );

-- ============================================================================
-- UPDATE POLICY: Admins can update clients in their company
-- ============================================================================
CREATE POLICY "admins_update_company_clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    -- User can only update clients in their company
    company_id = public.get_user_company_id()
    AND public.is_admin()
  )
  WITH CHECK (
    -- Updated client must still belong to user's company
    company_id = public.get_user_company_id()
    AND public.is_admin()
  );

-- ============================================================================
-- DELETE POLICY: Admins can delete clients in their company
-- ============================================================================
CREATE POLICY "admins_delete_company_clients"
  ON clients FOR DELETE
  TO authenticated
  USING (
    company_id = public.get_user_company_id()
    AND public.is_admin()
  );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON clients TO authenticated;
GRANT ALL ON clients TO service_role;

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================
COMMENT ON POLICY "service_role_all_access_clients" ON clients IS
  'Service role has full access for backend operations and webhooks';

COMMENT ON POLICY "users_view_company_clients" ON clients IS
  'Users can view all clients within their company. Super admins can view all clients.';

COMMENT ON POLICY "admins_create_clients" ON clients IS
  'Only company admins and super admins can create new clients';

COMMENT ON POLICY "admins_update_company_clients" ON clients IS
  'Admins can update clients within their company. Cannot transfer clients to other companies.';

COMMENT ON POLICY "admins_delete_company_clients" ON clients IS
  'Admins can delete clients within their company';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this query to verify policies were created:
-- SELECT schemaname, tablename, policyname, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'clients'
-- ORDER BY policyname;
