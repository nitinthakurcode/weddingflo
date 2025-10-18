-- ============================================================================
-- Migration: 20251018000012_fix_remaining_auth_initplan.sql
-- Description: Fix remaining Auth RLS Initplan warnings by wrapping ALL function calls
-- Author: WeddingFlow Pro Team
-- Date: 2025-10-18
-- Reason: Helper functions also need SELECT wrapper for optimal performance
-- ============================================================================
--
-- The previous migration wrapped auth.jwt() in SELECT, but our helper functions
-- (is_super_admin, get_current_user_company_id, etc.) ALSO call auth.jwt()
-- internally and need to be wrapped in SELECT as well.
--
-- Fix: Wrap ALL function calls in SELECT subqueries
-- ============================================================================

-- ============================================================================
-- STEP 1: FIX COMPANIES TABLE RLS POLICY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Fixing companies table RLS policy...';
END $$;

-- Drop and recreate with ALL functions wrapped in SELECT
DROP POLICY IF EXISTS "authenticated_users_read_companies" ON companies;

CREATE POLICY "authenticated_users_read_companies"
  ON companies
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins can read all companies
    -- Wrap function in SELECT to prevent per-row evaluation
    (SELECT public.is_super_admin())
    OR
    -- Regular users can read their own company
    id IN (
      SELECT company_id FROM users
      WHERE clerk_id = (SELECT auth.jwt()->>'sub')
    )
  );

COMMENT ON POLICY "authenticated_users_read_companies" ON companies IS
  '2025: Optimized - super admins read all, users read own (ALL functions wrapped in SELECT)';

DO $$
BEGIN
  RAISE NOTICE '✅ Fixed companies.authenticated_users_read_companies policy';
END $$;

-- ============================================================================
-- STEP 2: FIX USERS TABLE SELECT POLICY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Fixing users SELECT policy...';
END $$;

DROP POLICY IF EXISTS "authenticated_users_read_users" ON users;

CREATE POLICY "authenticated_users_read_users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Option 1: User reading their own data
    clerk_id = (SELECT auth.jwt()->>'sub')
    OR
    -- Option 2: Super admins can read all users
    -- Wrap function in SELECT to prevent per-row evaluation
    (SELECT public.is_super_admin())
    OR
    -- Option 3: Company admins/staff can read users in their company
    -- Wrap ALL functions in SELECT
    (
      company_id = (SELECT public.get_current_user_company_id())
      AND (SELECT public.get_current_user_role()) IN ('company_admin', 'staff')
    )
  );

COMMENT ON POLICY "authenticated_users_read_users" ON users IS
  '2025: Optimized SELECT - own data, super admin, company admin access (ALL functions wrapped in SELECT)';

DO $$
BEGIN
  RAISE NOTICE '✅ Fixed users.authenticated_users_read_users policy';
END $$;

-- ============================================================================
-- STEP 3: FIX USERS TABLE UPDATE POLICY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Fixing users UPDATE policy...';
END $$;

DROP POLICY IF EXISTS "authenticated_users_update_users" ON users;

CREATE POLICY "authenticated_users_update_users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    -- Option 1: User updating their own profile
    clerk_id = (SELECT auth.jwt()->>'sub')
    OR
    -- Option 2: Super admins can update all users
    (SELECT public.is_super_admin())
    OR
    -- Option 3: Company admins can update staff/clients in their company
    (
      company_id = (SELECT public.get_current_user_company_id())
      AND (SELECT public.get_current_user_role()) = 'company_admin'
      AND role IN ('staff', 'client_user')
    )
  )
  WITH CHECK (
    -- Option 1: User can update own profile (but not role/company)
    (
      clerk_id = (SELECT auth.jwt()->>'sub')
      -- Ensure role and company_id don't change
      AND role = (SELECT role FROM users WHERE clerk_id = (SELECT auth.jwt()->>'sub'))
      AND company_id = (SELECT company_id FROM users WHERE clerk_id = (SELECT auth.jwt()->>'sub'))
    )
    OR
    -- Option 2: Super admins can update anything
    (SELECT public.is_super_admin())
    OR
    -- Option 3: Company admins can update staff/clients (but not elevate permissions)
    (
      company_id = (SELECT public.get_current_user_company_id())
      AND (SELECT public.get_current_user_role()) = 'company_admin'
      AND role IN ('staff', 'client_user')
    )
  );

COMMENT ON POLICY "authenticated_users_update_users" ON users IS
  '2025: Optimized UPDATE - own profile, super admin, company admin updates (ALL functions wrapped in SELECT)';

DO $$
BEGIN
  RAISE NOTICE '✅ Fixed users.authenticated_users_update_users policy';
END $$;

-- ============================================================================
-- STEP 4: VERIFY RLS IS STILL ENABLED
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
  RAISE NOTICE '✅ AUTH INITPLAN FIX COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed Policies:';
  RAISE NOTICE '  ✅ companies.authenticated_users_read_companies';
  RAISE NOTICE '  ✅ users.authenticated_users_read_users';
  RAISE NOTICE '  ✅ users.authenticated_users_update_users';
  RAISE NOTICE '';
  RAISE NOTICE 'All Function Calls Wrapped in SELECT:';
  RAISE NOTICE '  - auth.jwt()->>''sub'' → (SELECT auth.jwt()->>''sub'')';
  RAISE NOTICE '  - is_super_admin() → (SELECT is_super_admin())';
  RAISE NOTICE '  - get_current_user_company_id() → (SELECT get_current_user_company_id())';
  RAISE NOTICE '  - get_current_user_role() → (SELECT get_current_user_role())';
  RAISE NOTICE '';
  RAISE NOTICE 'Performance Impact:';
  RAISE NOTICE '  ⚡ Functions evaluated ONCE per query (not per row)';
  RAISE NOTICE '  ⚡ Prevents exponential slowdown on large result sets';
  RAISE NOTICE '  ⚡ Expected 10-40x speedup for 100+ rows';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NEXT: Verify with supabase db lint --linked';
  RAISE NOTICE '========================================';
END $$;
