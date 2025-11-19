-- Add onboarding columns to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN companies.onboarding_completed IS 'Whether user has completed initial onboarding';
COMMENT ON COLUMN companies.onboarding_step IS 'Current step: 0=not started, 1=welcome, 2=company-info, 3=preferences, 4=first-client, 5=complete';
COMMENT ON COLUMN companies.onboarding_data IS 'Wizard form data (company info, preferences, etc.)';
COMMENT ON COLUMN companies.onboarding_started_at IS 'When user first started onboarding';
COMMENT ON COLUMN companies.onboarding_completed_at IS 'When user completed onboarding';

-- Add index for querying incomplete onboarding
CREATE INDEX IF NOT EXISTS idx_companies_onboarding_incomplete
ON companies (onboarding_completed)
WHERE onboarding_completed = false;

-- Add index for onboarding step queries
CREATE INDEX IF NOT EXISTS idx_companies_onboarding_step
ON companies (onboarding_step)
WHERE onboarding_step > 0 AND onboarding_step < 5;

-- Update RLS policy to allow users to update their own company's onboarding
DROP POLICY IF EXISTS "users_update_own_company_onboarding" ON companies;
CREATE POLICY "users_update_own_company_onboarding" ON companies
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM users
      WHERE clerk_id = (auth.jwt() ->> 'sub')
    )
  )
  WITH CHECK (
    id IN (
      SELECT company_id FROM users
      WHERE clerk_id = (auth.jwt() ->> 'sub')
    )
  );
