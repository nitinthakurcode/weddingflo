-- ============================================================================
-- Migration: 20251018000013_fix_helper_functions_auth_calls.sql
-- Description: Wrap auth.jwt() calls INSIDE helper functions with SELECT
-- Author: WeddingFlow Pro Team
-- Date: 2025-10-18
-- Reason: Helper functions internally call auth.jwt() without SELECT wrapper
-- ============================================================================
--
-- The issue: Even though we wrapped function CALLS in SELECT, the functions
-- themselves internally call auth.jwt() without SELECT wrappers.
--
-- The linter detects this and still shows warnings.
--
-- Solution: Update helper functions to wrap their internal auth.jwt() calls
-- ============================================================================

-- ============================================================================
-- STEP 1: FIX get_current_user_role FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role::TEXT
  FROM users
  WHERE clerk_id = (SELECT auth.jwt()->>'sub')  -- Wrapped in SELECT
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_current_user_role() IS
  'Gets current users role - auth.jwt() wrapped in SELECT for performance';

DO $$ BEGIN
  RAISE NOTICE '✅ Fixed get_current_user_role() - wrapped auth.jwt() in SELECT';
END $$;

-- ============================================================================
-- STEP 2: FIX get_current_user_company_id FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_current_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id
  FROM users
  WHERE clerk_id = (SELECT auth.jwt()->>'sub')  -- Wrapped in SELECT
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_current_user_company_id() IS
  'Gets current users company_id - auth.jwt() wrapped in SELECT for performance';

DO $$ BEGIN
  RAISE NOTICE '✅ Fixed get_current_user_company_id() - wrapped auth.jwt() in SELECT';
END $$;

-- ============================================================================
-- STEP 3: FIX requesting_user_id FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.requesting_user_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id
  FROM users
  WHERE clerk_id = (SELECT auth.jwt()->>'sub')  -- Wrapped in SELECT
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.requesting_user_id() IS
  'Gets current users database ID - auth.jwt() wrapped in SELECT for performance';

DO $$ BEGIN
  RAISE NOTICE '✅ Fixed requesting_user_id() - wrapped auth.jwt() in SELECT';
END $$;

-- ============================================================================
-- STEP 4: FIX requesting_clerk_id FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.requesting_clerk_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT auth.jwt()->>'sub';  -- Already simple, just SELECT
$$;

COMMENT ON FUNCTION public.requesting_clerk_id() IS
  'Extracts Clerk user ID from JWT - direct SELECT for performance';

DO $$ BEGIN
  RAISE NOTICE '✅ Fixed requesting_clerk_id() - using direct SELECT';
END $$;

-- ============================================================================
-- STEP 5: FIX requesting_user_company_id FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.requesting_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id
  FROM users
  WHERE clerk_id = (SELECT auth.jwt()->>'sub')  -- Wrapped in SELECT
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.requesting_user_company_id() IS
  'Gets current users company_id - auth.jwt() wrapped in SELECT for performance';

DO $$ BEGIN
  RAISE NOTICE '✅ Fixed requesting_user_company_id() - wrapped auth.jwt() in SELECT';
END $$;

-- ============================================================================
-- STEP 6: FIX is_super_admin FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE clerk_id = (SELECT auth.jwt()->>'sub')  -- Wrapped in SELECT
    AND role = 'super_admin'
  );
$$;

COMMENT ON FUNCTION public.is_super_admin() IS
  'Returns true if current user is super_admin - auth.jwt() wrapped in SELECT for performance';

DO $$ BEGIN
  RAISE NOTICE '✅ Fixed is_super_admin() - wrapped auth.jwt() in SELECT';
END $$;

-- ============================================================================
-- STEP 7: FIX is_company_admin_or_higher FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_company_admin_or_higher()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE clerk_id = (SELECT auth.jwt()->>'sub')  -- Wrapped in SELECT
    AND role IN ('company_admin', 'super_admin')
  );
$$;

COMMENT ON FUNCTION public.is_company_admin_or_higher() IS
  'Returns true if current user is company_admin or super_admin - auth.jwt() wrapped in SELECT for performance';

DO $$ BEGIN
  RAISE NOTICE '✅ Fixed is_company_admin_or_higher() - wrapped auth.jwt() in SELECT';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ HELPER FUNCTIONS AUTH OPTIMIZATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed 7 Helper Functions:';
  RAISE NOTICE '  ✅ get_current_user_role()';
  RAISE NOTICE '  ✅ get_current_user_company_id()';
  RAISE NOTICE '  ✅ requesting_user_id()';
  RAISE NOTICE '  ✅ requesting_clerk_id()';
  RAISE NOTICE '  ✅ requesting_user_company_id()';
  RAISE NOTICE '  ✅ is_super_admin()';
  RAISE NOTICE '  ✅ is_company_admin_or_higher()';
  RAISE NOTICE '';
  RAISE NOTICE 'All functions now have:';
  RAISE NOTICE '  🔒 SET search_path = public';
  RAISE NOTICE '  ⚡ auth.jwt() wrapped in SELECT';
  RAISE NOTICE '  🔐 SECURITY DEFINER';
  RAISE NOTICE '  📊 STABLE (query optimizer friendly)';
  RAISE NOTICE '';
  RAISE NOTICE 'This ensures:';
  RAISE NOTICE '  - Functions evaluated ONCE per query';
  RAISE NOTICE '  - No per-row auth.jwt() calls';
  RAISE NOTICE '  - Maximum query performance';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NEXT: Clear dashboard cache and run lint again';
  RAISE NOTICE '========================================';
END $$;
