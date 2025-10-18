-- ============================================================================
-- Migration: Fix Auth RLS Initplan Warnings
-- Description: Fix the 3 specific RLS warnings from Supabase dashboard
-- Date: 2025-10-18
-- ============================================================================

-- The warnings are:
-- 1. public.companies - policy: authenticated_users_read_companies
-- 2. public.users - policy: authenticated_users_read_users
-- 3. public.users - policy: authenticated_users_update_users

DO $$ BEGIN
  RAISE NOTICE '🔧 Fixing Auth RLS Initplan warnings...';
END $$;

-- ============================================================================
-- FIX 1: companies - authenticated_users_read_companies
-- ============================================================================

DROP POLICY IF EXISTS "authenticated_users_read_companies" ON companies;

CREATE POLICY "authenticated_users_read_companies"
  ON companies
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM users
      WHERE clerk_id = (SELECT auth.jwt() ->> 'sub')
    )
  );

COMMENT ON POLICY "authenticated_users_read_companies" ON companies IS
  'Users can read their own company - optimized with SELECT wrapper';

DO $$ BEGIN
  RAISE NOTICE '  ✅ Fixed authenticated_users_read_companies on companies';
END $$;

-- ============================================================================
-- FIX 2: users - authenticated_users_read_users
-- ============================================================================

DROP POLICY IF EXISTS "authenticated_users_read_users" ON users;

CREATE POLICY "authenticated_users_read_users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    clerk_id = (SELECT auth.jwt() ->> 'sub')
  );

COMMENT ON POLICY "authenticated_users_read_users" ON users IS
  'Users can read their own record - optimized with SELECT wrapper';

DO $$ BEGIN
  RAISE NOTICE '  ✅ Fixed authenticated_users_read_users on users';
END $$;

-- ============================================================================
-- FIX 3: users - authenticated_users_update_users
-- ============================================================================

DROP POLICY IF EXISTS "authenticated_users_update_users" ON users;

CREATE POLICY "authenticated_users_update_users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    clerk_id = (SELECT auth.jwt() ->> 'sub')
  )
  WITH CHECK (
    clerk_id = (SELECT auth.jwt() ->> 'sub')
  );

COMMENT ON POLICY "authenticated_users_update_users" ON users IS
  'Users can update their own record - optimized with SELECT wrapper';

DO $$ BEGIN
  RAISE NOTICE '  ✅ Fixed authenticated_users_update_users on users';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Auth RLS Initplan Warnings Fixed';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  Fixed 3 RLS policies:';
  RAISE NOTICE '  1. companies.authenticated_users_read_companies';
  RAISE NOTICE '  2. users.authenticated_users_read_users';
  RAISE NOTICE '  3. users.authenticated_users_update_users';
  RAISE NOTICE '';
  RAISE NOTICE '  🚀 All auth.jwt() calls now wrapped in SELECT';
  RAISE NOTICE '  ⚡ Performance optimized for scale';
  RAISE NOTICE '========================================';
END $$;
