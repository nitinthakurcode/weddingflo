-- Add AI usage tracking columns to companies table if not exists
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS ai_queries_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_last_reset_at TIMESTAMPTZ DEFAULT NOW();

-- Create AI usage logs table for detailed tracking
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_type VARCHAR(50) NOT NULL, -- 'budget_prediction', 'email_generation', etc.
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd DECIMAL(10, 4) DEFAULT 0,
  model VARCHAR(50) NOT NULL,
  request_data JSONB,
  response_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_company_id ON ai_usage_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_feature_type ON ai_usage_logs(feature_type);

-- Enable RLS
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_usage_logs
CREATE POLICY "Users can view their company's AI usage logs"
  ON ai_usage_logs FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE clerk_id = (auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "System can insert AI usage logs"
  ON ai_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users
      WHERE clerk_id = (auth.jwt() ->> 'sub')
    )
  );

-- Drop existing function if it exists with different signature
DROP FUNCTION IF EXISTS increment_ai_usage(UUID);

-- Function to increment AI usage counter
CREATE OR REPLACE FUNCTION increment_ai_usage(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if we need to reset the counter (monthly reset)
  UPDATE companies
  SET
    ai_queries_this_month = CASE
      WHEN ai_last_reset_at < date_trunc('month', NOW()) THEN 1
      ELSE ai_queries_this_month + 1
    END,
    ai_last_reset_at = CASE
      WHEN ai_last_reset_at < date_trunc('month', NOW()) THEN NOW()
      ELSE ai_last_reset_at
    END
  WHERE id = p_company_id;
END;
$$;

-- Function to check if company has AI quota remaining
CREATE OR REPLACE FUNCTION check_ai_quota(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_queries_used INTEGER;
  v_subscription_tier VARCHAR(50);
  v_quota_limit INTEGER;
BEGIN
  -- Get current usage and tier
  SELECT ai_queries_this_month, subscription_tier
  INTO v_queries_used, v_subscription_tier
  FROM companies
  WHERE id = p_company_id;

  -- Set quota limits based on tier
  v_quota_limit := CASE v_subscription_tier
    WHEN 'free' THEN 5
    WHEN 'starter' THEN 50
    WHEN 'professional' THEN 200
    WHEN 'enterprise' THEN 1000
    ELSE 5
  END;

  -- Return true if under quota
  RETURN v_queries_used < v_quota_limit;
END;
$$;

-- Add comments for documentation
COMMENT ON TABLE ai_usage_logs IS 'Detailed logs of all AI feature usage including token counts and costs';
COMMENT ON COLUMN companies.ai_queries_this_month IS 'Number of AI queries used this month (resets monthly)';
COMMENT ON COLUMN companies.ai_last_reset_at IS 'Timestamp of last monthly usage reset';
COMMENT ON FUNCTION increment_ai_usage IS 'Increments company AI usage counter with automatic monthly reset';
COMMENT ON FUNCTION check_ai_quota IS 'Checks if company has remaining AI quota based on subscription tier';
