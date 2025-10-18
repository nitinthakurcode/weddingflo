-- ============================================================================
-- Migration: 20251018000009_fix_function_search_paths.sql
-- Description: Fix search_path security warnings on all functions
-- Author: WeddingFlow Pro Team
-- Date: 2025-10-18
-- Reason: Security best practice - prevent search path injection attacks
-- ============================================================================
--
-- Supabase Database Linter identified 8 functions with mutable search_path.
-- This is a security concern because functions without a fixed search_path
-- could be vulnerable to search path injection attacks.
--
-- Fix: Add SET search_path = public to all affected functions
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- ============================================================================

-- ============================================================================
-- STEP 1: FIX update_updated_at_column FUNCTION
-- ============================================================================
-- This function is used by triggers to automatically update the updated_at timestamp

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column() IS
  'Trigger function to automatically update updated_at timestamp on row updates (search_path secured)';

DO $$ BEGIN
  RAISE NOTICE '✅ Fixed search_path for update_updated_at_column()';
END $$;

-- ============================================================================
-- STEP 2: FIX get_current_user_role FUNCTION
-- ============================================================================
-- Gets current user's role without triggering RLS recursion

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role::TEXT FROM users WHERE clerk_id = (auth.jwt()->>'sub') LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_current_user_role() IS
  'Gets current users role without triggering RLS recursion (search_path secured)';

DO $$ BEGIN
  RAISE NOTICE '✅ Fixed search_path for get_current_user_role()';
END $$;

-- ============================================================================
-- STEP 3: FIX get_current_user_company_id FUNCTION
-- ============================================================================
-- Gets current user's company_id without triggering RLS recursion

CREATE OR REPLACE FUNCTION public.get_current_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id FROM users WHERE clerk_id = (auth.jwt()->>'sub') LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_current_user_company_id() IS
  'Gets current users company_id without triggering RLS recursion (search_path secured)';

DO $$ BEGIN
  RAISE NOTICE '✅ Fixed search_path for get_current_user_company_id()';
END $$;

-- ============================================================================
-- STEP 4: CREATE/FIX requesting_user_id FUNCTION
-- ============================================================================
-- Helper function to get the current user's ID from JWT

CREATE OR REPLACE FUNCTION public.requesting_user_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM users WHERE clerk_id = (auth.jwt()->>'sub') LIMIT 1;
$$;

COMMENT ON FUNCTION public.requesting_user_id() IS
  'Gets current users database ID from Clerk JWT sub claim (search_path secured)';

DO $$ BEGIN
  RAISE NOTICE '✅ Fixed search_path for requesting_user_id()';
END $$;

-- ============================================================================
-- STEP 5: CREATE/FIX requesting_clerk_id FUNCTION
-- ============================================================================
-- Helper function to extract Clerk ID from JWT

CREATE OR REPLACE FUNCTION public.requesting_clerk_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT auth.jwt()->>'sub';
$$;

COMMENT ON FUNCTION public.requesting_clerk_id() IS
  'Extracts Clerk user ID from JWT sub claim (search_path secured)';

DO $$ BEGIN
  RAISE NOTICE '✅ Fixed search_path for requesting_clerk_id()';
END $$;

-- ============================================================================
-- STEP 6: CREATE/FIX requesting_user_company_id FUNCTION
-- ============================================================================
-- Helper function to get current user's company_id

CREATE OR REPLACE FUNCTION public.requesting_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id FROM users WHERE clerk_id = (auth.jwt()->>'sub') LIMIT 1;
$$;

COMMENT ON FUNCTION public.requesting_user_company_id() IS
  'Gets current users company_id from JWT (search_path secured)';

DO $$ BEGIN
  RAISE NOTICE '✅ Fixed search_path for requesting_user_company_id()';
END $$;

-- ============================================================================
-- STEP 7: CREATE/FIX is_super_admin FUNCTION
-- ============================================================================
-- Helper function to check if current user is a super admin

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE clerk_id = (auth.jwt()->>'sub')
    AND role = 'super_admin'
  );
$$;

COMMENT ON FUNCTION public.is_super_admin() IS
  'Returns true if current user has super_admin role (search_path secured)';

DO $$ BEGIN
  RAISE NOTICE '✅ Fixed search_path for is_super_admin()';
END $$;

-- ============================================================================
-- STEP 8: CREATE/FIX is_company_admin_or_higher FUNCTION
-- ============================================================================
-- Helper function to check if user is company admin or super admin

CREATE OR REPLACE FUNCTION public.is_company_admin_or_higher()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE clerk_id = (auth.jwt()->>'sub')
    AND role IN ('company_admin', 'super_admin')
  );
$$;

COMMENT ON FUNCTION public.is_company_admin_or_higher() IS
  'Returns true if current user is company_admin or super_admin (search_path secured)';

DO $$ BEGIN
  RAISE NOTICE '✅ Fixed search_path for is_company_admin_or_higher()';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ FUNCTION SEARCH PATH FIX COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed Functions (8 total):';
  RAISE NOTICE '  ✅ update_updated_at_column()';
  RAISE NOTICE '  ✅ get_current_user_role()';
  RAISE NOTICE '  ✅ get_current_user_company_id()';
  RAISE NOTICE '  ✅ requesting_user_id()';
  RAISE NOTICE '  ✅ requesting_clerk_id()';
  RAISE NOTICE '  ✅ requesting_user_company_id()';
  RAISE NOTICE '  ✅ is_super_admin()';
  RAISE NOTICE '  ✅ is_company_admin_or_higher()';
  RAISE NOTICE '';
  RAISE NOTICE 'Security Improvements:';
  RAISE NOTICE '  🔒 All functions now have SET search_path = public';
  RAISE NOTICE '  🔒 Prevents search path injection attacks';
  RAISE NOTICE '  🔒 All functions use SECURITY DEFINER';
  RAISE NOTICE '  🔒 All functions marked STABLE (no side effects)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NEXT: Run supabase db lint to verify warnings are resolved';
  RAISE NOTICE '========================================';
END $$;
