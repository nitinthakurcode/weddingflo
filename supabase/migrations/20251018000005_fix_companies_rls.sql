-- ============================================================================
-- Migration: 005_fix_companies_rls.sql
-- Description: Ensure companies table has proper RLS policies for webhooks
-- Author: WeddingFlow Pro Team
-- Date: 2025-10-18
-- Reason: Fix 500 errors - webhooks need service_role access to create companies
-- ============================================================================

-- ============================================================================
-- STEP 1: ENSURE SERVICE ROLE CAN BYPASS RLS ON COMPANIES
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "service_role_all_access_companies" ON companies;

-- Create service role bypass policy
-- This allows webhooks using SUPABASE_SECRET_KEY (sb_secret_*) to bypass RLS
CREATE POLICY "service_role_all_access_companies"
  ON companies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "service_role_all_access_companies" ON companies IS
  '2025 Native Integration: Service role (sb_secret_*) bypasses RLS for webhooks';

DO $$ BEGIN
  RAISE NOTICE '✅ Created service_role bypass policy on companies table';
END $$;

-- ============================================================================
-- STEP 2: GRANT FULL ACCESS TO SERVICE ROLE
-- ============================================================================

-- Ensure service role has all permissions
GRANT ALL ON companies TO service_role;

DO $$ BEGIN
  RAISE NOTICE '✅ Granted ALL permissions to service_role on companies table';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ COMPANIES RLS FIX COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔓 Service role can now create companies';
  RAISE NOTICE '🔑 Webhooks using sb_secret_* key bypass RLS';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NEXT: Test user signup to verify company creation';
  RAISE NOTICE '========================================';
END $$;
