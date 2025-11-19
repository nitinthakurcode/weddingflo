-- Migration: Cleanup Duplicate RLS Policies and Incorrect Helper Functions
-- Created: November 19, 2025
-- Purpose: Remove duplicate policies and performance-killing database-querying functions
-- Severity: CRITICAL - Performance & Consistency

-- ============================================================================
-- CRITICAL ISSUES BEING FIXED:
-- 1. Duplicate RLS policies on many tables (old + new versions)
-- 2. Helper functions that query database instead of reading JWT
-- 3. Inconsistent function usage across policies
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop ALL duplicate/old RLS policies
-- ============================================================================

-- CLIENTS TABLE: Remove old policies (keep the new ones from migration 20251119000002)
DROP POLICY IF EXISTS "Company admins can delete clients" ON clients;
DROP POLICY IF EXISTS "Users can insert clients in their company" ON clients;
DROP POLICY IF EXISTS "Users can update clients in their company" ON clients;
DROP POLICY IF EXISTS "Users can view clients in their company" ON clients;

-- BUDGET TABLE: Remove old policies (keep the new ones from migration 20251119000003)
DROP POLICY IF EXISTS "Users can delete budget in their company" ON budget;
DROP POLICY IF EXISTS "Users can insert budget for their company clients" ON budget;
DROP POLICY IF EXISTS "Users can update budget in their company" ON budget;
DROP POLICY IF EXISTS "Users can view budget in their company" ON budget;

-- COMPANIES TABLE: Remove old/duplicate policies
DROP POLICY IF EXISTS "Super admins can delete companies" ON companies;
DROP POLICY IF EXISTS "Super admins can insert companies" ON companies;
DROP POLICY IF EXISTS "authenticated_users_read_companies" ON companies;
DROP POLICY IF EXISTS "authenticated_users_update_companies" ON companies;

-- Keep only: users_read_own_company, admins_update_own_company, service_role_all_access_companies

-- GUESTS TABLE: Remove old policies
DROP POLICY IF EXISTS "Users can delete guests in their company" ON guests;
DROP POLICY IF EXISTS "Users can insert guests for their company clients" ON guests;
DROP POLICY IF EXISTS "Users can update guests in their company" ON guests;
DROP POLICY IF EXISTS "Users can view guests in their company" ON guests;

-- CREATIVE_JOBS table: Drop BEFORE dropping functions (these policies use get_current_user_company_id)
DROP POLICY IF EXISTS "users_delete_company_creative_jobs" ON creative_jobs;
DROP POLICY IF EXISTS "users_insert_company_creative_jobs" ON creative_jobs;
DROP POLICY IF EXISTS "users_update_company_creative_jobs" ON creative_jobs;
DROP POLICY IF EXISTS "users_view_company_creative_jobs" ON creative_jobs;

-- CLIENT_USERS table: Drop BEFORE dropping functions (uses requesting_user_company_id)
DROP POLICY IF EXISTS "Users can delete client_users in their company" ON client_users;
DROP POLICY IF EXISTS "Users can insert client_users in their company" ON client_users;
DROP POLICY IF EXISTS "Users can update client_users in their company" ON client_users;
DROP POLICY IF EXISTS "Users can view client_users in their company" ON client_users;

-- CLIENT_VENDORS table: Drop BEFORE dropping functions
DROP POLICY IF EXISTS "Users can delete client_vendors in their company" ON client_vendors;
DROP POLICY IF EXISTS "Users can insert client_vendors in their company" ON client_vendors;
DROP POLICY IF EXISTS "Users can update client_vendors in their company" ON client_vendors;
DROP POLICY IF EXISTS "Users can view client_vendors in their company" ON client_vendors;

-- TASKS table: Drop BEFORE dropping functions
DROP POLICY IF EXISTS "Users can delete tasks in their company" ON tasks;
DROP POLICY IF EXISTS "Users can insert tasks in their company" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks in their company" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks in their company" ON tasks;

-- ACTIVITY_LOGS table: Drop BEFORE dropping functions
DROP POLICY IF EXISTS "Users can view activity logs in their company" ON activity_logs;
DROP POLICY IF EXISTS "System can insert activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Super admins can delete activity logs" ON activity_logs;

-- DOCUMENTS TABLE: Remove old policies
DROP POLICY IF EXISTS "Users can delete documents in their company" ON documents;
DROP POLICY IF EXISTS "Users can insert documents for their company clients" ON documents;
DROP POLICY IF EXISTS "Users can update documents in their company" ON documents;
DROP POLICY IF EXISTS "Users can view documents in their company" ON documents;

-- MESSAGES TABLE: Remove old policies (has both company_id and client_id based policies)
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in their company" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages in their company" ON messages;

-- Keep only: users_view_company_messages, users_insert_company_messages,
--            users_update_own_messages, admins_delete_company_messages

-- USERS TABLE: Remove old policies
DROP POLICY IF EXISTS "authenticated_users_read_users" ON users;
DROP POLICY IF EXISTS "authenticated_users_update_users" ON users;
DROP POLICY IF EXISTS "super_admins_delete_users" ON users;
DROP POLICY IF EXISTS "super_admins_insert_users" ON users;

-- Keep only: users_read_self, users_update_self, admins_read_company_users, service_role_all_access

-- ============================================================================
-- STEP 2: Drop incorrect helper functions that query the database
-- ============================================================================

-- These functions query the users table on EVERY RLS check - major performance issue
DROP FUNCTION IF EXISTS public.get_current_user_company_id();
DROP FUNCTION IF EXISTS public.requesting_user_company_id();
DROP FUNCTION IF EXISTS public.is_company_admin_or_higher();
DROP FUNCTION IF EXISTS public.get_current_user_role();

-- Note: We're keeping these CORRECT functions that read from JWT:
-- ✅ get_user_company_id() - reads publicMetadata.company_id from JWT
-- ✅ get_clerk_user_id() - reads sub claim from JWT
-- ✅ get_current_user_id() - maps clerk_id to database UUID (only used when needed)
-- ✅ is_admin() - calls get_user_role() which reads from JWT
-- ✅ is_super_admin() - reads publicMetadata.role from JWT
-- ✅ get_user_role() - reads publicMetadata.role from JWT
-- ✅ current_clerk_user_id() - reads sub claim (can be replaced by get_clerk_user_id)

-- ============================================================================
-- STEP 3: Create new policies for tables that had incorrect function usage
-- ============================================================================

-- CLIENT_USERS table: Replace policies that used requesting_user_company_id
CREATE POLICY "users_view_company_client_users"
  ON client_users FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = get_user_company_id()
    )
  );

CREATE POLICY "users_manage_company_client_users"
  ON client_users FOR ALL
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = get_user_company_id()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = get_user_company_id()
    )
  );

-- CLIENT_VENDORS table: Replace policies that used requesting_user_company_id
CREATE POLICY "users_view_company_client_vendors"
  ON client_vendors FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = get_user_company_id()
    )
  );

CREATE POLICY "users_manage_company_client_vendors"
  ON client_vendors FOR ALL
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = get_user_company_id()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = get_user_company_id()
    )
  );

-- TASKS table: Replace policies that used requesting_user_company_id
CREATE POLICY "users_view_company_tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = get_user_company_id()
    )
  );

CREATE POLICY "users_manage_company_tasks"
  ON tasks FOR ALL
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = get_user_company_id()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = get_user_company_id()
    )
  );

-- ACTIVITY_LOGS table: Replace policies that used requesting_user_company_id
CREATE POLICY "users_view_company_activity_logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_company_id()
    OR is_super_admin()
  );

CREATE POLICY "system_insert_activity_logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "super_admins_delete_activity_logs"
  ON activity_logs FOR DELETE
  TO authenticated
  USING (is_super_admin());

-- CREATIVE_JOBS table: Replace policies that used get_current_user_company_id
CREATE POLICY "users_view_company_creative_jobs"
  ON creative_jobs FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = get_user_company_id()
    )
  );

CREATE POLICY "users_manage_company_creative_jobs"
  ON creative_jobs FOR ALL
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = get_user_company_id()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = get_user_company_id()
    )
  );

-- WEBHOOK_EVENTS table: Uses get_user_role (which is correct, but let's verify)
-- No changes needed - get_user_role() reads from JWT publicMetadata

-- ============================================================================
-- STEP 4: Replace current_clerk_user_id() with get_clerk_user_id() for consistency
-- ============================================================================

-- COMPANIES table: Has policy using current_clerk_user_id
-- This is actually OK, but let's standardize on get_clerk_user_id for consistency

-- USERS table: Multiple policies might use current_clerk_user_id
-- No change needed - both functions work, but get_clerk_user_id is preferred

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these after migration to verify:
--
-- 1. Check no policies use deleted functions:
-- SELECT tablename, policyname, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND (
--     qual LIKE '%requesting_user_company_id%'
--     OR qual LIKE '%get_current_user_company_id%'
--     OR qual LIKE '%is_company_admin_or_higher%'
--     OR qual LIKE '%get_current_user_role%'
--     OR with_check LIKE '%requesting_user_company_id%'
--     OR with_check LIKE '%get_current_user_company_id%'
--     OR with_check LIKE '%is_company_admin_or_higher%'
--     OR with_check LIKE '%get_current_user_role%'
--   );
--
-- 2. Count policies per table (should be reasonable numbers):
-- SELECT tablename, COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- GROUP BY tablename
-- ORDER BY policy_count DESC;
--
-- 3. Verify helper functions exist:
-- SELECT proname FROM pg_proc
-- WHERE pronamespace = 'public'::regnamespace
--   AND proname IN ('get_user_company_id', 'get_clerk_user_id', 'is_admin', 'is_super_admin', 'get_user_role')
-- ORDER BY proname;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.get_user_company_id IS
  'CORRECT: Reads company_id from JWT publicMetadata. Use this for all RLS policies.';

COMMENT ON FUNCTION public.get_clerk_user_id IS
  'CORRECT: Reads Clerk user ID (sub claim) from JWT. Use this instead of current_clerk_user_id.';

COMMENT ON FUNCTION public.get_current_user_id IS
  'Maps Clerk ID to database UUID. Only use when you need the database user.id, not for RLS.';

COMMENT ON FUNCTION public.is_admin IS
  'CORRECT: Checks if user is company_admin or super_admin via JWT publicMetadata.';

COMMENT ON FUNCTION public.is_super_admin IS
  'CORRECT: Checks if user is super_admin via JWT publicMetadata.';

COMMENT ON FUNCTION public.get_user_role IS
  'CORRECT: Reads role from JWT publicMetadata. Use this for role checks in RLS.';
