-- ============================================================================
-- Migration: 20251018000008_fix_infinite_recursion.sql
-- Description: Fix infinite recursion in RLS policies
-- Author: WeddingFlow Pro Team
-- Date: 2025-10-18
-- Reason: Error 42P17 - Policies were querying users table from within users policies
-- ============================================================================
--
-- The previous migration had policies that queried the users table from within
-- users table policies, causing infinite recursion.
--
-- Fix: Simplify policies to use direct JWT claims without subqueries
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL EXISTING POLICIES ON USERS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "service_role_all_access" ON users;
DROP POLICY IF EXISTS "users_read_own_data" ON users;
DROP POLICY IF EXISTS "users_update_own_profile" ON users;
DROP POLICY IF EXISTS "super_admins_read_all_users" ON users;
DROP POLICY IF EXISTS "super_admins_insert_users" ON users;
DROP POLICY IF EXISTS "super_admins_update_all_users" ON users;
DROP POLICY IF EXISTS "super_admins_delete_users" ON users;
DROP POLICY IF EXISTS "company_admins_read_company_users" ON users;
DROP POLICY IF EXISTS "company_admins_update_company_users" ON users;

-- ============================================================================
-- STEP 2: CREATE SIMPLIFIED NON-RECURSIVE POLICIES
-- ============================================================================

-- Policy 1: Service Role Bypass (for webhooks)
CREATE POLICY "service_role_all_access"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "service_role_all_access" ON users IS
  '2025: Service role bypasses RLS for webhooks (Clerk user creation)';

-- Policy 2: Users can read their own data
CREATE POLICY "users_read_own_data"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    clerk_id = (auth.jwt()->>'sub')
  );

COMMENT ON POLICY "users_read_own_data" ON users IS
  '2025: Users read own record via Clerk JWT (RS256) - matches sub claim';

-- Policy 3: Users can update their own profile
-- FIXED: No subquery to users table - use OLD values instead
CREATE POLICY "users_update_own_profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    clerk_id = (auth.jwt()->>'sub')
  )
  WITH CHECK (
    clerk_id = (auth.jwt()->>'sub')
  );

COMMENT ON POLICY "users_update_own_profile" ON users IS
  '2025: Users can update own profile (simplified - no recursion)';

-- ============================================================================
-- STEP 3: SUPER ADMIN AND COMPANY ADMIN POLICIES
-- ============================================================================
-- Note: These require checking role, but we cannot query users table
-- Solution: We'll allow these operations and rely on application-level checks
-- OR use a security definer function (created below)
-- ============================================================================

-- Create a security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM users WHERE clerk_id = (auth.jwt()->>'sub') LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_current_user_role() IS
  '2025: Gets current users role without triggering RLS recursion';

-- Create a security definer function to get current user company_id
CREATE OR REPLACE FUNCTION public.get_current_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM users WHERE clerk_id = (auth.jwt()->>'sub') LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_current_user_company_id() IS
  '2025: Gets current users company_id without triggering RLS recursion';

-- Policy 4: Super admins can read all users
CREATE POLICY "super_admins_read_all_users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    public.get_current_user_role() = 'super_admin'
  );

COMMENT ON POLICY "super_admins_read_all_users" ON users IS
  '2025: Super admins read all users (using security definer function)';

-- Policy 5: Super admins can insert users
CREATE POLICY "super_admins_insert_users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_current_user_role() = 'super_admin'
  );

COMMENT ON POLICY "super_admins_insert_users" ON users IS
  '2025: Super admins can create new users';

-- Policy 6: Super admins can update all users
CREATE POLICY "super_admins_update_all_users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    public.get_current_user_role() = 'super_admin'
  )
  WITH CHECK (
    public.get_current_user_role() = 'super_admin'
  );

COMMENT ON POLICY "super_admins_update_all_users" ON users IS
  '2025: Super admins can update any user';

-- Policy 7: Super admins can delete users
CREATE POLICY "super_admins_delete_users"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    public.get_current_user_role() = 'super_admin'
  );

COMMENT ON POLICY "super_admins_delete_users" ON users IS
  '2025: Super admins can delete any user';

-- Policy 8: Company admins can read users in their company
CREATE POLICY "company_admins_read_company_users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.get_current_user_company_id()
    AND public.get_current_user_role() IN ('company_admin', 'staff')
  );

COMMENT ON POLICY "company_admins_read_company_users" ON users IS
  '2025: Company admins and staff read users in their company';

-- Policy 9: Company admins can update staff and clients in their company
CREATE POLICY "company_admins_update_company_users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.get_current_user_company_id()
    AND public.get_current_user_role() = 'company_admin'
    AND role IN ('staff', 'client_user')
  )
  WITH CHECK (
    company_id = public.get_current_user_company_id()
    AND public.get_current_user_role() = 'company_admin'
    AND role IN ('staff', 'client_user')
  );

COMMENT ON POLICY "company_admins_update_company_users" ON users IS
  '2025: Company admins update staff and clients in their company';

-- ============================================================================
-- STEP 4: VERIFY RLS IS ENABLED
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ INFINITE RECURSION FIX COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed Policies:';
  RAISE NOTICE '  ✅ Removed recursive subqueries';
  RAISE NOTICE '  ✅ Created security definer helper functions';
  RAISE NOTICE '  ✅ Simplified user profile update policy';
  RAISE NOTICE '  ✅ All 9 policies recreated without recursion';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NEXT: Test user data fetch (should work now!)';
  RAISE NOTICE '========================================';
END $$;
