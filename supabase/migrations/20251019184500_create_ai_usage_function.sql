-- ============================================================================
-- Migration: create_ai_usage_function.sql
-- Description: Add AI usage tracking to companies table
-- Author: WeddingFlow Pro Team
-- Date: 2025-10-19
-- Reason: Track AI query usage for billing and analytics
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD AI USAGE TRACKING COLUMN
-- ============================================================================

-- Add column to track AI queries per month
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS ai_queries_this_month INTEGER DEFAULT 0;

-- Add column comment
COMMENT ON COLUMN companies.ai_queries_this_month IS 'Number of AI queries used this month (resets monthly by application)';

DO $$ BEGIN
  RAISE NOTICE '✅ Added ai_queries_this_month column to companies table';
END $$;

-- ============================================================================
-- STEP 2: CREATE AI USAGE INCREMENT FUNCTION
-- ============================================================================

-- Create thread-safe function to increment AI usage count
CREATE OR REPLACE FUNCTION increment_ai_usage(company_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE companies
  SET
    ai_queries_this_month = ai_queries_this_month + 1,
    updated_at = NOW()
  WHERE id = company_id;
END;
$$;

-- Add function comment
COMMENT ON FUNCTION increment_ai_usage IS 'Atomically increments AI query counter for a company (thread-safe)';

DO $$ BEGIN
  RAISE NOTICE '✅ Created increment_ai_usage function';
END $$;

-- ============================================================================
-- STEP 3: GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_ai_usage TO authenticated;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION increment_ai_usage TO service_role;

DO $$ BEGIN
  RAISE NOTICE '✅ Granted execute permissions on increment_ai_usage function';
END $$;

-- ============================================================================
-- STEP 4: CREATE INDEX FOR PERFORMANCE
-- ============================================================================

-- Create index on ai_queries_this_month for analytics queries
CREATE INDEX IF NOT EXISTS idx_companies_ai_queries
ON companies(ai_queries_this_month);

DO $$ BEGIN
  RAISE NOTICE '✅ Created index on ai_queries_this_month column';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATION COMPLETE: AI usage tracking';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 Column added: ai_queries_this_month';
  RAISE NOTICE '⚡ Function created: increment_ai_usage()';
  RAISE NOTICE '🔑 Index created for performance';
  RAISE NOTICE '👥 Permissions granted to authenticated and service_role';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Usage: SELECT increment_ai_usage(''company-uuid-here'')';
  RAISE NOTICE '========================================';
END $$;
