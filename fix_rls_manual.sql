-- ============================================================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- URL: https://app.supabase.com/project/gkrcaeymhgjepncbceag/sql/new
-- ============================================================================

-- Fix companies table RLS to allow service role to bypass
DROP POLICY IF EXISTS "service_role_all_access_companies" ON companies;

CREATE POLICY "service_role_all_access_companies"
  ON companies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure service role has all permissions
GRANT ALL ON companies TO service_role;

-- Verify policies
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'companies';
