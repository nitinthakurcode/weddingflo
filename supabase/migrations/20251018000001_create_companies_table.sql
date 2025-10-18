-- ============================================================================
-- Migration: 001_create_companies_table.sql
-- Description: Create companies table and essential helper functions
-- Author: WeddingFlow Pro Team
-- Date: 2025-10-18
-- Reason: Companies table is required before users table (foreign key dependency)
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE EXTENSIONS
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  RAISE NOTICE '✅ Extensions enabled';
END $$;

-- ============================================================================
-- STEP 2: CREATE ENUM TYPES
-- ============================================================================

-- Subscription tier enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier') THEN
    CREATE TYPE subscription_tier AS ENUM (
      'free',
      'starter',
      'professional',
      'enterprise'
    );
    RAISE NOTICE 'Created subscription_tier enum type';
  ELSE
    RAISE NOTICE 'subscription_tier enum type already exists';
  END IF;
END $$;

-- Subscription status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM (
      'active',
      'trialing',
      'past_due',
      'canceled',
      'unpaid',
      'incomplete',
      'incomplete_expired'
    );
    RAISE NOTICE 'Created subscription_status enum type';
  ELSE
    RAISE NOTICE 'subscription_status enum type already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: CREATE COMPANIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS companies (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Company Information
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  logo_url TEXT,

  -- Configuration (stored as JSONB for flexibility)
  branding JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',

  -- Subscription Management
  subscription_tier subscription_tier NOT NULL DEFAULT 'free',
  subscription_status subscription_status NOT NULL DEFAULT 'trialing',

  -- Stripe Integration
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,

  -- Trial and Subscription Dates
  trial_ends_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,

  -- Audit Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT companies_name_check CHECK (char_length(name) >= 1),
  CONSTRAINT companies_subdomain_check CHECK (subdomain IS NULL OR subdomain ~* '^[a-z0-9][a-z0-9-]*[a-z0-9]$')
);

-- Add table comment
COMMENT ON TABLE companies IS 'Multi-tenant companies/organizations table for WeddingFlow Pro';

-- Add column comments
COMMENT ON COLUMN companies.subdomain IS 'Unique subdomain for company (e.g., acmeweddings.weddingflow.com)';
COMMENT ON COLUMN companies.branding IS 'Company branding settings (colors, fonts, logos)';
COMMENT ON COLUMN companies.settings IS 'Company-specific feature flags and preferences';
COMMENT ON COLUMN companies.stripe_customer_id IS 'Stripe customer ID for billing';

DO $$ BEGIN
  RAISE NOTICE '✅ Companies table created';
END $$;

-- ============================================================================
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for fast lookup by subdomain (custom domains)
CREATE INDEX IF NOT EXISTS idx_companies_subdomain ON companies(subdomain);

-- Index for fast lookup by Stripe customer ID (webhook processing)
CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer_id ON companies(stripe_customer_id);

-- Index for filtering by subscription status (billing queries)
CREATE INDEX IF NOT EXISTS idx_companies_subscription_status ON companies(subscription_status);

DO $$ BEGIN
  RAISE NOTICE '✅ Created 3 indexes on companies table';
END $$;

-- ============================================================================
-- STEP 5: CREATE UPDATED_AT TRIGGER
-- ============================================================================

-- Create reusable function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function to automatically update updated_at timestamp on row updates';

-- Attach trigger to companies table
DROP TRIGGER IF EXISTS set_updated_at_companies ON companies;
CREATE TRIGGER set_updated_at_companies
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DO $$ BEGIN
  RAISE NOTICE '✅ Created updated_at trigger on companies table';
END $$;

-- ============================================================================
-- STEP 6: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  RAISE NOTICE '✅ Enabled RLS on companies table';
END $$;

-- ============================================================================
-- STEP 7: CREATE RLS POLICIES FOR COMPANIES
-- ============================================================================

-- Policy 1: Service Role Bypass
-- The service role (used by webhooks and backend services) can do everything
DROP POLICY IF EXISTS "service_role_all_access_companies" ON companies;
CREATE POLICY "service_role_all_access_companies"
  ON companies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "service_role_all_access_companies" ON companies IS
  'Service role has full access for webhooks and backend operations';

-- Policy 2: Users Can Read Their Own Company
-- Authenticated users can view their own company
DROP POLICY IF EXISTS "users_read_own_company" ON companies;
CREATE POLICY "users_read_own_company"
  ON companies
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM users
      WHERE clerk_id = (auth.jwt() ->> 'sub')
    )
  );

COMMENT ON POLICY "users_read_own_company" ON companies IS
  'Users can read their own company data';

DO $$ BEGIN
  RAISE NOTICE '✅ Created 2 RLS policies on companies table';
END $$;

-- ============================================================================
-- STEP 8: GRANT PERMISSIONS
-- ============================================================================

-- Grant authenticated users SELECT access (RLS will restrict to their company)
GRANT SELECT ON companies TO authenticated;

-- Grant service role full access (used by webhooks and backend services)
GRANT ALL ON companies TO service_role;

DO $$ BEGIN
  RAISE NOTICE '✅ Granted permissions on companies table';
END $$;

-- ============================================================================
-- STEP 9: CREATE HELPER FUNCTIONS FOR CLERK JWT
-- ============================================================================

-- Note: Helper function auth.clerk_user_id() should be created by Supabase admin
-- or use inline auth.jwt()->>'sub' in RLS policies instead

DO $$ BEGIN
  RAISE NOTICE '✅ Skipped auth schema helper function (use auth.jwt()->>''sub'' in policies)';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATION COMPLETE: companies table';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 Table created with 14 columns';
  RAISE NOTICE '🔑 3 indexes created for performance';
  RAISE NOTICE '🔒 RLS enabled with 2 policies';
  RAISE NOTICE '⏰ updated_at trigger configured';
  RAISE NOTICE '🛠️  Helper functions created';
  RAISE NOTICE '👥 Permissions granted to authenticated and service_role';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Run user creation next (migration 002)';
  RAISE NOTICE '========================================';
END $$;
