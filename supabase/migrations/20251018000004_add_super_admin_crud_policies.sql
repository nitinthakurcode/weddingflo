-- ============================================================================
-- Migration: 004_add_super_admin_crud_policies.sql
-- Description: Add missing INSERT, UPDATE, DELETE policies for super admins
-- Author: WeddingFlow Pro Team
-- Date: 2025-10-18
-- Reason: Complete super admin RBAC implementation (2025 best practices)
-- ============================================================================

-- According to 2025 Supabase RBAC best practices, super admins should have
-- full CRUD access to manage users across all companies.
--
-- Current state: Super admins can only SELECT (read) users
-- This migration adds: INSERT, UPDATE, DELETE capabilities
-- ============================================================================

-- ============================================================================
-- POLICY 1: Super Admins Can Insert Users
-- ============================================================================

CREATE POLICY "super_admins_insert_users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE clerk_id = (auth.jwt() ->> 'sub')
      AND role = 'super_admin'
    )
  );

COMMENT ON POLICY "super_admins_insert_users" ON users IS
  'Super admins can create new user records for any company';

-- ============================================================================
-- POLICY 2: Super Admins Can Update All Users
-- ============================================================================

CREATE POLICY "super_admins_update_all_users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE clerk_id = (auth.jwt() ->> 'sub')
      AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE clerk_id = (auth.jwt() ->> 'sub')
      AND role = 'super_admin'
    )
  );

COMMENT ON POLICY "super_admins_update_all_users" ON users IS
  'Super admins can update any user record including role and company_id changes';

-- ============================================================================
-- POLICY 3: Super Admins Can Delete Users
-- ============================================================================

CREATE POLICY "super_admins_delete_users"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE clerk_id = (auth.jwt() ->> 'sub')
      AND role = 'super_admin'
    )
  );

COMMENT ON POLICY "super_admins_delete_users" ON users IS
  'Super admins can delete any user record (use with caution)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- List all policies on users table (for verification)
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SUPER ADMIN CRUD POLICIES ADDED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Super admin capabilities:';
  RAISE NOTICE '  ✅ SELECT (read all users) - Policy: super_admins_read_all_users';
  RAISE NOTICE '  ✅ INSERT (create users) - Policy: super_admins_insert_users';
  RAISE NOTICE '  ✅ UPDATE (modify any user) - Policy: super_admins_update_all_users';
  RAISE NOTICE '  ✅ DELETE (remove users) - Policy: super_admins_delete_users';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Super admins have full control over user records';
  RAISE NOTICE '   Ensure super_admin role is only assigned to trusted administrators';
  RAISE NOTICE '';
  RAISE NOTICE 'Total RLS policies on users table: 9';
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
