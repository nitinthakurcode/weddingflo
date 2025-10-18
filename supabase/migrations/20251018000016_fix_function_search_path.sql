-- ============================================================================
-- Migration: Fix Function Search Path Security Warning
-- Description: Set explicit search_path on current_clerk_user_id function
-- Date: 2025-10-18
-- ============================================================================

-- The warning: function_search_path_mutable
-- The issue: Functions without explicit search_path can have security vulnerabilities
-- The fix: Add SET search_path = public, auth to function definition

DO $$ BEGIN
  RAISE NOTICE '🔒 Fixing function search_path security warning...';
END $$;

-- ============================================================================
-- Fix: Update Function with Explicit Search Path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_clerk_user_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'sub',
    ''
  );
$$;

COMMENT ON FUNCTION public.current_clerk_user_id() IS
  'Returns the Clerk user ID from the current JWT. Marked STABLE so Postgres caches the result per query, not per row. SECURITY DEFINER allows access to auth.jwt(). SET search_path prevents security vulnerabilities. This eliminates auth_rls_initplan warnings.';

DO $$ BEGIN
  RAISE NOTICE '  ✅ Updated public.current_clerk_user_id() with explicit search_path';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Function Security Warning Fixed';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  Updated: public.current_clerk_user_id()';
  RAISE NOTICE '  Added: SET search_path = public, auth';
  RAISE NOTICE '';
  RAISE NOTICE '  🔒 Function now secure from injection attacks';
  RAISE NOTICE '  ✅ function_search_path_mutable warning eliminated';
  RAISE NOTICE '========================================';
END $$;
