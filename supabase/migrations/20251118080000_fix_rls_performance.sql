-- Fix RLS Performance: Wrap auth.jwt() calls in SELECT subqueries
-- This prevents re-evaluation for each row and improves query performance

-- =============================================================================
-- COMPANIES TABLE
-- =============================================================================

-- Drop and recreate users_update_own_company_onboarding policy
DROP POLICY IF EXISTS "users_update_own_company_onboarding" ON companies;
CREATE POLICY "users_update_own_company_onboarding" ON companies
  FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT company_id
      FROM users
      WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub')::text)
    )
  );

-- Drop and recreate authenticated_users_read_companies policy
DROP POLICY IF EXISTS "authenticated_users_read_companies" ON companies;
CREATE POLICY "authenticated_users_read_companies" ON companies
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT company_id
      FROM users
      WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub')::text)
    )
  );

-- =============================================================================
-- GUESTS TABLE
-- =============================================================================

-- Drop and recreate view policy
DROP POLICY IF EXISTS "Users can view guests in their company" ON guests;
CREATE POLICY "Users can view guests in their company" ON guests
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT company_id
      FROM users
      WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub')::text)
    )
  );

-- Drop and recreate insert policy
DROP POLICY IF EXISTS "Users can insert guests in their company" ON guests;
CREATE POLICY "Users can insert guests in their company" ON guests
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id
      FROM users
      WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub')::text)
    )
  );

-- Drop and recreate update policy
DROP POLICY IF EXISTS "Users can update guests in their company" ON guests;
CREATE POLICY "Users can update guests in their company" ON guests
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT company_id
      FROM users
      WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub')::text)
    )
  );

-- Drop and recreate delete policy
DROP POLICY IF EXISTS "Users can delete guests in their company" ON guests;
CREATE POLICY "Users can delete guests in their company" ON guests
  FOR DELETE TO authenticated
  USING (
    company_id IN (
      SELECT company_id
      FROM users
      WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub')::text)
    )
  );

-- =============================================================================
-- VENDORS TABLE
-- =============================================================================

-- Drop and recreate view policy
DROP POLICY IF EXISTS "Users can view vendors in their company" ON vendors;
CREATE POLICY "Users can view vendors in their company" ON vendors
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT company_id
      FROM users
      WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub')::text)
    )
  );

-- Drop and recreate insert policy
DROP POLICY IF EXISTS "Users can insert vendors in their company" ON vendors;
CREATE POLICY "Users can insert vendors in their company" ON vendors
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id
      FROM users
      WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub')::text)
    )
  );

-- Drop and recreate update policy
DROP POLICY IF EXISTS "Users can update vendors in their company" ON vendors;
CREATE POLICY "Users can update vendors in their company" ON vendors
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT company_id
      FROM users
      WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub')::text)
    )
  );

-- Drop and recreate delete policy
DROP POLICY IF EXISTS "Users can delete vendors in their company" ON vendors;
CREATE POLICY "Users can delete vendors in their company" ON vendors
  FOR DELETE TO authenticated
  USING (
    company_id IN (
      SELECT company_id
      FROM users
      WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub')::text)
    )
  );

-- =============================================================================
-- TIMELINE TABLE
-- =============================================================================

-- Drop and recreate view policy
DROP POLICY IF EXISTS "Users can view timeline in their company" ON timeline;
CREATE POLICY "Users can view timeline in their company" ON timeline
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT company_id
      FROM users
      WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub')::text)
    )
  );

-- Drop and recreate insert policy
DROP POLICY IF EXISTS "Users can insert timeline in their company" ON timeline;
CREATE POLICY "Users can insert timeline in their company" ON timeline
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id
      FROM users
      WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub')::text)
    )
  );

-- Drop and recreate update policy
DROP POLICY IF EXISTS "Users can update timeline in their company" ON timeline;
CREATE POLICY "Users can update timeline in their company" ON timeline
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT company_id
      FROM users
      WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub')::text)
    )
  );

-- Drop and recreate delete policy
DROP POLICY IF EXISTS "Users can delete timeline in their company" ON timeline;
CREATE POLICY "Users can delete timeline in their company" ON timeline
  FOR DELETE TO authenticated
  USING (
    company_id IN (
      SELECT company_id
      FROM users
      WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub')::text)
    )
  );

-- =============================================================================
-- BUDGET TABLE
-- =============================================================================

-- Drop and recreate view policy
DROP POLICY IF EXISTS "Users can view budget in their company" ON budget;
CREATE POLICY "Users can view budget in their company" ON budget
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT company_id
      FROM users
      WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub')::text)
    )
  );

-- Drop and recreate insert policy
DROP POLICY IF EXISTS "Users can insert budget in their company" ON budget;
CREATE POLICY "Users can insert budget in their company" ON budget
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id
      FROM users
      WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub')::text)
    )
  );

-- Drop and recreate update policy
DROP POLICY IF EXISTS "Users can update budget in their company" ON budget;
CREATE POLICY "Users can update budget in their company" ON budget
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT company_id
      FROM users
      WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub')::text)
    )
  );

-- Drop and recreate delete policy
DROP POLICY IF EXISTS "Users can delete budget in their company" ON budget;
CREATE POLICY "Users can delete budget in their company" ON budget
  FOR DELETE TO authenticated
  USING (
    company_id IN (
      SELECT company_id
      FROM users
      WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub')::text)
    )
  );
