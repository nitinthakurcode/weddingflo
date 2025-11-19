-- Fix RLS helper functions to read Clerk JWT correctly
-- Clerk stores metadata in publicMetadata at root level of JWT
-- NOT in user_metadata

-- NOTE: Using CREATE OR REPLACE instead of DROP to avoid breaking dependent RLS policies
-- These functions are used by 100+ RLS policies across all tables

-- Helper function to get current Clerk user ID
-- Clerk user ID is in the 'sub' claim of the JWT
CREATE OR REPLACE FUNCTION public.get_clerk_user_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    auth.jwt()->>'sub'
  );
$$;

-- Helper function to get current user's company ID from Clerk JWT
-- Clerk stores this in publicMetadata.company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    COALESCE(
      current_setting('request.jwt.claims', true)::json->'publicMetadata'->>'company_id',
      auth.jwt()->'publicMetadata'->>'company_id'
    )
  )::uuid;
$$;

-- Helper function to get current user's database UUID
-- This looks up the user's database ID based on their Clerk ID
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE clerk_id = public.get_clerk_user_id() LIMIT 1;
$$;

-- Helper function to check if user is super admin
-- Clerk stores role in publicMetadata.role
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->'publicMetadata'->>'role',
    auth.jwt()->'publicMetadata'->>'role'
  ) = 'super_admin';
$$;

-- Helper function to get user role
-- Clerk stores role in publicMetadata.role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->'publicMetadata'->>'role',
    auth.jwt()->'publicMetadata'->>'role'
  );
$$;

-- Helper function to check if user is admin (company_admin or super_admin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_role() IN ('company_admin', 'super_admin');
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_clerk_user_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- Add helpful comments
COMMENT ON FUNCTION public.get_clerk_user_id() IS 'Returns the Clerk user ID from JWT sub claim. November 2025 standard.';
COMMENT ON FUNCTION public.get_user_company_id() IS 'Returns the company ID from Clerk JWT publicMetadata. November 2025 standard.';
COMMENT ON FUNCTION public.get_current_user_id() IS 'Returns the database UUID for the current Clerk user. November 2025 standard.';
COMMENT ON FUNCTION public.is_super_admin() IS 'Checks if current user is super_admin via Clerk JWT. November 2025 standard.';
COMMENT ON FUNCTION public.get_user_role() IS 'Returns current user role from Clerk JWT. November 2025 standard.';
COMMENT ON FUNCTION public.is_admin() IS 'Checks if current user is company_admin or super_admin. November 2025 standard.';
