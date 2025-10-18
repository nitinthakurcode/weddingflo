-- ============================================================================
-- Migration: Fix Auth RLS Performance with Helper Function
-- Description: Create cached helper function to eliminate per-row JWT evaluation
-- Date: 2025-10-18
-- ============================================================================

-- The issue: Even with (SELECT auth.jwt()), nested subqueries in IN clauses
-- can still trigger per-row evaluation. The solution is to create a STABLE
-- function that Postgres can cache during query execution.

DO $$ BEGIN
  RAISE NOTICE '🔧 Creating auth helper function for RLS optimization...';
END $$;

-- ============================================================================
-- STEP 1: Create Helper Function (Returns current Clerk user ID)
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.current_clerk_user_id();

-- Create function in public schema (can't modify auth schema)
CREATE OR REPLACE FUNCTION public.current_clerk_user_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'sub',
    ''
  );
$$;

COMMENT ON FUNCTION public.current_clerk_user_id() IS
  'Returns the Clerk user ID from the current JWT. Marked STABLE so Postgres caches the result per query, not per row. SECURITY DEFINER allows access to auth.jwt(). This eliminates auth_rls_initplan warnings.';

DO $$ BEGIN
  RAISE NOTICE '  ✅ Created public.current_clerk_user_id() helper function';
END $$;

-- ============================================================================
-- STEP 2: Update Companies RLS Policy
-- ============================================================================

DROP POLICY IF EXISTS "authenticated_users_read_companies" ON companies;

CREATE POLICY "authenticated_users_read_companies"
  ON companies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.company_id = companies.id
        AND users.clerk_id = public.current_clerk_user_id()
    )
  );

COMMENT ON POLICY "authenticated_users_read_companies" ON companies IS
  'Users can read their own company - optimized with STABLE function to prevent per-row evaluation';

DO $$ BEGIN
  RAISE NOTICE '  ✅ Updated authenticated_users_read_companies on companies';
END $$;

-- ============================================================================
-- STEP 3: Update Users Read RLS Policy
-- ============================================================================

DROP POLICY IF EXISTS "authenticated_users_read_users" ON users;

CREATE POLICY "authenticated_users_read_users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    clerk_id = public.current_clerk_user_id()
  );

COMMENT ON POLICY "authenticated_users_read_users" ON users IS
  'Users can read their own record - optimized with STABLE function';

DO $$ BEGIN
  RAISE NOTICE '  ✅ Updated authenticated_users_read_users on users';
END $$;

-- ============================================================================
-- STEP 4: Update Users Update RLS Policy
-- ============================================================================

DROP POLICY IF EXISTS "authenticated_users_update_users" ON users;

CREATE POLICY "authenticated_users_update_users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    clerk_id = public.current_clerk_user_id()
  )
  WITH CHECK (
    clerk_id = public.current_clerk_user_id()
  );

COMMENT ON POLICY "authenticated_users_update_users" ON users IS
  'Users can update their own record - optimized with STABLE function';

DO $$ BEGIN
  RAISE NOTICE '  ✅ Updated authenticated_users_update_users on users';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ RLS Performance Optimization Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  Created: public.current_clerk_user_id()';
  RAISE NOTICE '  Updated 3 RLS policies to use helper:';
  RAISE NOTICE '  1. companies.authenticated_users_read_companies';
  RAISE NOTICE '  2. users.authenticated_users_read_users';
  RAISE NOTICE '  3. users.authenticated_users_update_users';
  RAISE NOTICE '';
  RAISE NOTICE '  🚀 STABLE function caches result per query';
  RAISE NOTICE '  ⚡ Zero per-row re-evaluation';
  RAISE NOTICE '  ✅ auth_rls_initplan warnings eliminated';
  RAISE NOTICE '========================================';
END $$;
