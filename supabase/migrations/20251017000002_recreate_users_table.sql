-- ============================================================================
-- Migration: 002_recreate_users_table.sql
-- Description: Drop and recreate users table with clean schema
-- Author: WeddingFlow Pro Team
-- Date: 2025-10-17
-- ============================================================================
-- WARNING: This migration will DROP the existing users table and all data
-- Make sure to backup any important data before running this migration
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP EXISTING OBJECTS
-- ============================================================================

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS set_updated_at_users ON users;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop existing table (CASCADE removes all dependent objects)
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================================
-- STEP 2: CREATE USER ROLE ENUM TYPE
-- ============================================================================

-- Create enum type for user roles (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM (
      'super_admin',    -- Platform-wide administrator
      'company_admin',  -- Company owner/administrator
      'staff',          -- Company staff member
      'client_user'     -- Wedding couple/client
    );
    RAISE NOTICE 'Created user_role enum type';
  ELSE
    RAISE NOTICE 'user_role enum type already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: CREATE USERS TABLE
-- ============================================================================

CREATE TABLE users (
  -- Primary Key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Clerk Authentication Integration
  -- clerk_id is the unique identifier from Clerk auth system
  clerk_id text UNIQUE NOT NULL,

  -- User Profile Information
  email text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  avatar_url text,

  -- Role-Based Access Control
  -- Determines user permissions and access level
  role user_role NOT NULL DEFAULT 'company_admin',

  -- Company Association
  -- Links user to their company (NULL for super admins or unassigned users)
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,

  -- Account Status
  -- Allows soft-deletion and account suspension
  is_active boolean NOT NULL DEFAULT true,

  -- Audit Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Add table comment
COMMENT ON TABLE users IS 'Core users table storing authentication and profile data synced from Clerk';

-- Add column comments
COMMENT ON COLUMN users.clerk_id IS 'Unique identifier from Clerk authentication system';
COMMENT ON COLUMN users.role IS 'User role determining access level (super_admin, company_admin, staff, client_user)';
COMMENT ON COLUMN users.company_id IS 'Foreign key to companies table, NULL for super admins';
COMMENT ON COLUMN users.is_active IS 'Soft delete flag - false means account is suspended/deleted';

-- ============================================================================
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for fast lookup by Clerk ID (most common query from webhook and auth)
CREATE INDEX idx_users_clerk_id ON users(clerk_id);

-- Index for fast lookup by email (login, user search)
CREATE INDEX idx_users_email ON users(email);

-- Index for fast lookup by company (company-wide queries, team listings)
CREATE INDEX idx_users_company_id ON users(company_id);

-- Index for filtering by role (permission checks, admin dashboards)
CREATE INDEX idx_users_role ON users(role);

-- Index for active users (most queries filter by is_active)
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = true;

-- Composite index for company + role queries (common in multi-tenant apps)
CREATE INDEX idx_users_company_role ON users(company_id, role) WHERE is_active = true;

DO $$ BEGIN
  RAISE NOTICE '✅ Created 6 indexes on users table';
END $$;

-- ============================================================================
-- STEP 5: CREATE UPDATED_AT TRIGGER
-- ============================================================================

-- Create reusable function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function to automatically update updated_at timestamp on row updates';

-- Attach trigger to users table
CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DO $$ BEGIN
  RAISE NOTICE '✅ Created updated_at trigger on users table';
END $$;

-- ============================================================================
-- STEP 6: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  RAISE NOTICE '✅ Enabled RLS on users table';
END $$;

-- ============================================================================
-- STEP 7: CREATE RLS POLICIES
-- ============================================================================

-- Policy 1: Service Role Bypass
-- The service role (used by webhooks and backend services) can do everything
CREATE POLICY "service_role_all_access"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "service_role_all_access" ON users IS
  'Service role has full access for webhooks and backend operations';

-- Policy 2: Users Can Read Their Own Data
-- Authenticated users can view their own user record
CREATE POLICY "users_read_own_data"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    clerk_id = (auth.jwt() ->> 'sub')
  );

COMMENT ON POLICY "users_read_own_data" ON users IS
  'Users can read their own user record by matching clerk_id from JWT';

-- Policy 3: Users Can Update Their Own Profile
-- Users can update their profile fields but NOT their role or company_id
CREATE POLICY "users_update_own_profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    clerk_id = (auth.jwt() ->> 'sub')
  )
  WITH CHECK (
    clerk_id = (auth.jwt() ->> 'sub')
    AND role = (SELECT role FROM users WHERE clerk_id = (auth.jwt() ->> 'sub'))
    AND company_id = (SELECT company_id FROM users WHERE clerk_id = (auth.jwt() ->> 'sub'))
  );

COMMENT ON POLICY "users_update_own_profile" ON users IS
  'Users can update their profile but cannot change role or company_id';

-- Policy 4: Super Admins Can Read All Users
-- Super admins have read access to all user records
CREATE POLICY "super_admins_read_all_users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE clerk_id = (auth.jwt() ->> 'sub')
      AND role = 'super_admin'
    )
  );

COMMENT ON POLICY "super_admins_read_all_users" ON users IS
  'Super admins can read all user records across all companies';

-- Policy 5: Company Admins Can Read Company Users
-- Company admins and staff can view users in their company
CREATE POLICY "company_admins_read_company_users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE clerk_id = (auth.jwt() ->> 'sub')
      AND role IN ('company_admin', 'staff')
    )
  );

COMMENT ON POLICY "company_admins_read_company_users" ON users IS
  'Company admins and staff can read users within their company';

-- Policy 6: Company Admins Can Update Company Users
-- Company admins can update staff and client users in their company
CREATE POLICY "company_admins_update_company_users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE clerk_id = (auth.jwt() ->> 'sub')
      AND role = 'company_admin'
    )
    AND role IN ('staff', 'client_user')
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users
      WHERE clerk_id = (auth.jwt() ->> 'sub')
      AND role = 'company_admin'
    )
    AND role IN ('staff', 'client_user')
  );

COMMENT ON POLICY "company_admins_update_company_users" ON users IS
  'Company admins can update staff and client users in their company';

DO $$ BEGIN
  RAISE NOTICE '✅ Created 6 RLS policies on users table';
END $$;

-- ============================================================================
-- STEP 8: GRANT PERMISSIONS
-- ============================================================================

-- Grant authenticated users SELECT access (RLS will restrict to appropriate rows)
GRANT SELECT ON users TO authenticated;

-- Grant authenticated users UPDATE access to allowed columns (RLS will restrict)
GRANT UPDATE (first_name, last_name, avatar_url, email, is_active) ON users TO authenticated;

-- Grant service role full access (used by webhooks and backend services)
GRANT ALL ON users TO service_role;

DO $$ BEGIN
  RAISE NOTICE '✅ Granted permissions on users table';
END $$;

-- ============================================================================
-- STEP 9: VERIFICATION QUERIES (Commented out - uncomment to verify)
-- ============================================================================

-- Verify table structure
-- SELECT
--   column_name,
--   data_type,
--   is_nullable,
--   column_default
-- FROM information_schema.columns
-- WHERE table_name = 'users'
-- ORDER BY ordinal_position;

-- Verify indexes
-- SELECT
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE tablename = 'users'
-- ORDER BY indexname;

-- Verify RLS policies
-- SELECT
--   policyname,
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies
-- WHERE tablename = 'users'
-- ORDER BY policyname;

-- Verify triggers
-- SELECT
--   trigger_name,
--   event_manipulation,
--   action_statement
-- FROM information_schema.triggers
-- WHERE event_object_table = 'users';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATION COMPLETE: users table';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 Table created with 11 columns';
  RAISE NOTICE '🔑 6 indexes created for performance';
  RAISE NOTICE '🔒 RLS enabled with 6 policies';
  RAISE NOTICE '⏰ updated_at trigger configured';
  RAISE NOTICE '👥 Permissions granted to authenticated and service_role';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Run Clerk webhook to sync existing users';
  RAISE NOTICE '========================================';
END $$;
