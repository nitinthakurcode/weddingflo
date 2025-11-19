-- Migration: Fix JWT Metadata Path in All RLS Policies
-- Created: November 19, 2025
-- Purpose: Fix company_id being NULL by using correct Clerk JWT path
-- Severity: CRITICAL

-- ============================================================================
-- CRITICAL FIX: All RLS policies check auth.jwt()->'user_metadata'
-- But Clerk stores data in auth.jwt()->'publicMetadata'
-- Result: company_id is ALWAYS NULL, all queries fail
-- ============================================================================

-- This migration recreates ALL policies to use helper functions
-- which correctly read from publicMetadata

-- ============================================================================
-- COMPANIES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "users_read_own_company" ON companies;
DROP POLICY IF EXISTS "admins_update_own_company" ON companies;
DROP POLICY IF EXISTS "super_admins_read_all_companies" ON companies;

CREATE POLICY "users_read_own_company"
  ON companies FOR SELECT
  TO authenticated
  USING (
    id = public.get_user_company_id()
    OR public.is_super_admin()
  );

CREATE POLICY "admins_update_own_company"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    id = public.get_user_company_id()
    AND public.is_admin()
  )
  WITH CHECK (
    id = public.get_user_company_id()
    AND public.is_admin()
  );

-- ============================================================================
-- GUESTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "users_view_company_guests" ON guests;
DROP POLICY IF EXISTS "admins_insert_company_guests" ON guests;
DROP POLICY IF EXISTS "admins_update_company_guests" ON guests;
DROP POLICY IF EXISTS "admins_delete_company_guests" ON guests;

CREATE POLICY "users_view_company_guests"
  ON guests FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    OR public.is_super_admin()
  );

CREATE POLICY "admins_insert_company_guests"
  ON guests FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    AND public.is_admin()
  );

CREATE POLICY "admins_update_company_guests"
  ON guests FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    AND public.is_admin()
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    AND public.is_admin()
  );

CREATE POLICY "admins_delete_company_guests"
  ON guests FOR DELETE
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    AND public.is_admin()
  );

-- ============================================================================
-- VENDORS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "users_view_company_vendors" ON vendors;
DROP POLICY IF EXISTS "admins_insert_company_vendors" ON vendors;
DROP POLICY IF EXISTS "admins_update_company_vendors" ON vendors;
DROP POLICY IF EXISTS "admins_delete_company_vendors" ON vendors;

CREATE POLICY "users_view_company_vendors"
  ON vendors FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    OR public.is_super_admin()
  );

CREATE POLICY "admins_insert_company_vendors"
  ON vendors FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    AND public.is_admin()
  );

CREATE POLICY "admins_update_company_vendors"
  ON vendors FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    AND public.is_admin()
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    AND public.is_admin()
  );

CREATE POLICY "admins_delete_company_vendors"
  ON vendors FOR DELETE
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    AND public.is_admin()
  );

-- ============================================================================
-- TIMELINE TABLE
-- ============================================================================

DROP POLICY IF EXISTS "users_view_company_timeline" ON timeline;
DROP POLICY IF EXISTS "admins_insert_company_timeline" ON timeline;
DROP POLICY IF EXISTS "admins_update_company_timeline" ON timeline;
DROP POLICY IF EXISTS "admins_delete_company_timeline" ON timeline;

CREATE POLICY "users_view_company_timeline"
  ON timeline FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    OR public.is_super_admin()
  );

CREATE POLICY "admins_insert_company_timeline"
  ON timeline FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    AND public.is_admin()
  );

CREATE POLICY "admins_update_company_timeline"
  ON timeline FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    AND public.is_admin()
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    AND public.is_admin()
  );

CREATE POLICY "admins_delete_company_timeline"
  ON timeline FOR DELETE
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    AND public.is_admin()
  );

-- ============================================================================
-- BUDGET TABLE
-- ============================================================================

DROP POLICY IF EXISTS "users_view_company_budget" ON budget;
DROP POLICY IF EXISTS "admins_insert_company_budget" ON budget;
DROP POLICY IF EXISTS "admins_update_company_budget" ON budget;
DROP POLICY IF EXISTS "admins_delete_company_budget" ON budget;

CREATE POLICY "users_view_company_budget"
  ON budget FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    OR public.is_super_admin()
  );

CREATE POLICY "admins_insert_company_budget"
  ON budget FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    AND public.is_admin()
  );

CREATE POLICY "admins_update_company_budget"
  ON budget FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    AND public.is_admin()
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    AND public.is_admin()
  );

CREATE POLICY "admins_delete_company_budget"
  ON budget FOR DELETE
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    AND public.is_admin()
  );

-- ============================================================================
-- DOCUMENTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "users_view_company_documents" ON documents;
DROP POLICY IF EXISTS "admins_insert_company_documents" ON documents;
DROP POLICY IF EXISTS "admins_update_company_documents" ON documents;
DROP POLICY IF EXISTS "admins_delete_company_documents" ON documents;

CREATE POLICY "users_view_company_documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    OR public.is_super_admin()
  );

CREATE POLICY "admins_insert_company_documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    AND public.is_admin()
  );

CREATE POLICY "admins_update_company_documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    AND public.is_admin()
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    AND public.is_admin()
  );

CREATE POLICY "admins_delete_company_documents"
  ON documents FOR DELETE
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    AND public.is_admin()
  );

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "users_view_company_messages" ON messages;
DROP POLICY IF EXISTS "users_insert_company_messages" ON messages;
DROP POLICY IF EXISTS "users_update_own_messages" ON messages;
DROP POLICY IF EXISTS "admins_delete_company_messages" ON messages;

CREATE POLICY "users_view_company_messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    OR sender_id = public.get_current_user_id()
    OR public.is_super_admin()
  );

CREATE POLICY "users_insert_company_messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    AND sender_id = public.get_current_user_id()
  );

CREATE POLICY "users_update_own_messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    sender_id = public.get_current_user_id()
  )
  WITH CHECK (
    sender_id = public.get_current_user_id()
  );

CREATE POLICY "admins_delete_company_messages"
  ON messages FOR DELETE
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE company_id = public.get_user_company_id()
    )
    AND public.is_admin()
  );

-- ============================================================================
-- USERS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "users_read_self" ON users;
DROP POLICY IF EXISTS "users_update_self" ON users;
DROP POLICY IF EXISTS "admins_read_company_users" ON users;

CREATE POLICY "users_read_self"
  ON users FOR SELECT
  TO authenticated
  USING (
    clerk_id = public.get_clerk_user_id()
    OR company_id = public.get_user_company_id()
    OR public.is_super_admin()
  );

CREATE POLICY "users_update_self"
  ON users FOR UPDATE
  TO authenticated
  USING (
    clerk_id = public.get_clerk_user_id()
  )
  WITH CHECK (
    clerk_id = public.get_clerk_user_id()
  );

CREATE POLICY "admins_read_company_users"
  ON users FOR SELECT
  TO authenticated
  USING (
    company_id = public.get_user_company_id()
    AND public.is_admin()
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "users_read_own_company" ON companies IS
  'Users can read their own company. Super admins can read all companies.';

COMMENT ON POLICY "users_view_company_guests" ON guests IS
  'Users can view guests for clients in their company. Uses helper function get_user_company_id() which reads from publicMetadata.';

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify all policies now use helper functions:
-- SELECT schemaname, tablename, policyname
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
