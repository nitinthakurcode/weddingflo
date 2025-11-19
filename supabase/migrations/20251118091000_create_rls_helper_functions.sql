-- Create optimized helper functions for RLS policies
-- These functions cache the result per query, preventing re-evaluation for each row

-- Helper function to get current user's company ID
-- This wraps auth.jwt() in a STABLE function which postgres can optimize
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'company_id')::uuid;
$$;

-- Helper function to get current user's ID
-- This wraps auth.uid() in a STABLE function which postgres can optimize
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT auth.uid();
$$;

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'super_admin';
$$;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::text;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, anon;

COMMENT ON FUNCTION public.get_user_company_id() IS 'Returns the current user company ID from JWT metadata. Optimized for RLS policies.';
COMMENT ON FUNCTION public.get_current_user_id() IS 'Returns the current user ID. Optimized for RLS policies.';
COMMENT ON FUNCTION public.is_super_admin() IS 'Checks if current user is a super admin. Optimized for RLS policies.';
COMMENT ON FUNCTION public.get_user_role() IS 'Returns the current user role. Optimized for RLS policies.';
