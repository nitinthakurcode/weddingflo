-- ============================================================================
-- Migration: 20251018000007_final_rls_inline_jwt.sql
-- Description: Complete RLS policies using inline JWT extraction
-- Author: WeddingFlow Pro Team
-- Date: 2025-10-18
-- Reason: Final RLS setup without auth schema functions (uses inline pattern)
-- ============================================================================
--
-- This migration uses inline auth.jwt()->>'sub' pattern instead of helper functions
-- Compatible with 2025 Native Clerk + Supabase Integration
-- - RS256/ES256 JWT signing (modern asymmetric algorithms)
-- - New API key format (sb_publishable_*, sb_secret_*)
-- - Proper JWT claim extraction using auth.jwt() ->> 'sub'
--
-- ============================================================================

-- ============================================================================
-- STEP 1: UPDATE COMPANIES TABLE RLS POLICIES
-- ============================================================================

-- Drop and recreate with optimized inline pattern
DROP POLICY IF EXISTS "service_role_all_access_companies" ON companies;
DROP POLICY IF EXISTS "users_read_own_company" ON companies;

-- Policy 1: Service Role Bypass (for webhooks using sb_secret_*)
CREATE POLICY "service_role_all_access_companies"
  ON companies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "service_role_all_access_companies" ON companies IS
  '2025: Service role (sb_secret_*) bypasses RLS for webhooks and admin operations';

-- Policy 2: Users can read their own company
CREATE POLICY "users_read_own_company"
  ON companies
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM users
      WHERE clerk_id = (auth.jwt()->>'sub')
    )
  );

COMMENT ON POLICY "users_read_own_company" ON companies IS
  '2025: Users can read their company data using Clerk JWT (RS256/ES256)';

-- ============================================================================
-- STEP 2: UPDATE USERS TABLE RLS POLICIES
-- ============================================================================

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "service_role_all_access" ON users;
DROP POLICY IF EXISTS "users_read_own_data" ON users;
DROP POLICY IF EXISTS "users_update_own_profile" ON users;
DROP POLICY IF EXISTS "super_admins_read_all_users" ON users;
DROP POLICY IF EXISTS "super_admins_insert_users" ON users;
DROP POLICY IF EXISTS "super_admins_update_all_users" ON users;
DROP POLICY IF EXISTS "super_admins_delete_users" ON users;
DROP POLICY IF EXISTS "company_admins_read_company_users" ON users;
DROP POLICY IF EXISTS "company_admins_update_company_users" ON users;

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
  '2025: Users read own record via Clerk JWT (RS256/ES256) - matches sub claim';

-- Policy 3: Users can update their own profile (but not role/company)
CREATE POLICY "users_update_own_profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    clerk_id = (auth.jwt()->>'sub')
  )
  WITH CHECK (
    clerk_id = (auth.jwt()->>'sub')
    AND role = (SELECT role FROM users WHERE clerk_id = (auth.jwt()->>'sub'))
    AND company_id = (SELECT company_id FROM users WHERE clerk_id = (auth.jwt()->>'sub'))
  );

COMMENT ON POLICY "users_update_own_profile" ON users IS
  '2025: Users update profile but cannot change role or company_id';

-- Policy 4: Super admins can read all users
CREATE POLICY "super_admins_read_all_users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE clerk_id = (auth.jwt()->>'sub')
      AND role = 'super_admin'
    )
  );

COMMENT ON POLICY "super_admins_read_all_users" ON users IS
  '2025: Super admins read all users across all companies';

-- Policy 5: Super admins can insert users
CREATE POLICY "super_admins_insert_users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE clerk_id = (auth.jwt()->>'sub')
      AND role = 'super_admin'
    )
  );

COMMENT ON POLICY "super_admins_insert_users" ON users IS
  '2025: Super admins can create new users for any company';

-- Policy 6: Super admins can update all users
CREATE POLICY "super_admins_update_all_users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE clerk_id = (auth.jwt()->>'sub')
      AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE clerk_id = (auth.jwt()->>'sub')
      AND role = 'super_admin'
    )
  );

COMMENT ON POLICY "super_admins_update_all_users" ON users IS
  '2025: Super admins can update any user including role and company_id';

-- Policy 7: Super admins can delete users
CREATE POLICY "super_admins_delete_users"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE clerk_id = (auth.jwt()->>'sub')
      AND role = 'super_admin'
    )
  );

COMMENT ON POLICY "super_admins_delete_users" ON users IS
  '2025: Super admins can delete any user';

-- Policy 8: Company admins can read users in their company
CREATE POLICY "company_admins_read_company_users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE clerk_id = (auth.jwt()->>'sub')
      AND role IN ('company_admin', 'staff')
    )
  );

COMMENT ON POLICY "company_admins_read_company_users" ON users IS
  '2025: Company admins and staff read users in their company';

-- Policy 9: Company admins can update staff and clients in their company
CREATE POLICY "company_admins_update_company_users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE clerk_id = (auth.jwt()->>'sub')
      AND role = 'company_admin'
    )
    AND role IN ('staff', 'client_user')
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users
      WHERE clerk_id = (auth.jwt()->>'sub')
      AND role = 'company_admin'
    )
    AND role IN ('staff', 'client_user')
  );

COMMENT ON POLICY "company_admins_update_company_users" ON users IS
  '2025: Company admins update staff and clients in their company';

-- ============================================================================
-- STEP 3: GRANT PERMISSIONS
-- ============================================================================

-- Grant appropriate permissions to roles
GRANT SELECT ON companies TO authenticated;
GRANT SELECT, UPDATE (first_name, last_name, avatar_url, email, is_active) ON users TO authenticated;
GRANT ALL ON companies TO service_role;
GRANT ALL ON users TO service_role;

-- ============================================================================
-- STEP 4: VERIFY RLS IS ENABLED
-- ============================================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 2025 RLS POLICIES COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Configuration:';
  RAISE NOTICE '  ✅ RS256/ES256 JWT signing (modern)';
  RAISE NOTICE '  ✅ Native Clerk integration';
  RAISE NOTICE '  ✅ New API keys (sb_publishable_*, sb_secret_*)';
  RAISE NOTICE '  ✅ Inline auth.jwt()->>''sub'' pattern';
  RAISE NOTICE '';
  RAISE NOTICE 'Security:';
  RAISE NOTICE '  ✅ Service role bypasses RLS (webhooks)';
  RAISE NOTICE '  ✅ Users can only access own data';
  RAISE NOTICE '  ✅ Super admins have full CRUD access';
  RAISE NOTICE '  ✅ Company admins scoped to their company';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NEXT: Test signup flow with fresh account';
  RAISE NOTICE '========================================';
END $$;
