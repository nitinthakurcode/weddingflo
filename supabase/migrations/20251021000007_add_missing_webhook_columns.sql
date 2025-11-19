-- ============================================================================
-- ADD MISSING COLUMNS FOR WEBHOOK HANDLERS
-- ============================================================================
-- These columns are referenced in webhook handlers but don't exist in the database
-- This migration adds them to prevent runtime errors
-- ============================================================================

-- ============================================================================
-- PAYMENTS TABLE: Add failure_reason column
-- ============================================================================
-- Used in: src/app/api/webhooks/stripe/route.ts:305
-- When: payment_intent.payment_failed event
-- Purpose: Store detailed error message from Stripe

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

COMMENT ON COLUMN payments.failure_reason IS 'Detailed error message when payment fails (from Stripe payment_intent.last_payment_error)';

-- Index for querying failed payments by reason
CREATE INDEX IF NOT EXISTS idx_payments_failure_reason
  ON payments(failure_reason)
  WHERE failure_reason IS NOT NULL;

-- ============================================================================
-- REFUNDS TABLE: Add stripe_charge_id column
-- ============================================================================
-- Used in: src/app/api/webhooks/stripe/route.ts:335
-- When: charge.refunded event
-- Purpose: Link refund to the original charge for lookups

ALTER TABLE refunds
ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT;

COMMENT ON COLUMN refunds.stripe_charge_id IS 'Stripe charge ID that was refunded (from charge.refunded webhook)';

-- Index for looking up refunds by charge ID
CREATE INDEX IF NOT EXISTS idx_refunds_stripe_charge_id
  ON refunds(stripe_charge_id)
  WHERE stripe_charge_id IS NOT NULL;

-- ============================================================================
-- PAYMENTS TABLE: Add additional tracking fields
-- ============================================================================
-- These fields improve payment tracking and debugging

-- Track when payment was initiated (vs created_at which is when record created)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS initiated_at TIMESTAMPTZ;

-- Track the last error code (for categorizing failures)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS last_error_code TEXT;

-- Track payment method type (card, bank_transfer, etc)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS payment_method_type TEXT;

COMMENT ON COLUMN payments.initiated_at IS 'When payment was initiated by user (may differ from created_at)';
COMMENT ON COLUMN payments.last_error_code IS 'Stripe error code for failed payments (e.g., card_declined, insufficient_funds)';
COMMENT ON COLUMN payments.payment_method_type IS 'Type of payment method used (card, bank_transfer, etc)';

-- ============================================================================
-- STRIPE_ACCOUNTS TABLE: Add additional status tracking
-- ============================================================================

-- Track when account verification requirements were last updated
ALTER TABLE stripe_accounts
ADD COLUMN IF NOT EXISTS requirements_last_updated_at TIMESTAMPTZ;

-- Track eventually_due requirements
ALTER TABLE stripe_accounts
ADD COLUMN IF NOT EXISTS requirements_eventually_due JSONB DEFAULT '[]';

-- Track currently_due requirements
ALTER TABLE stripe_accounts
ADD COLUMN IF NOT EXISTS requirements_currently_due JSONB DEFAULT '[]';

-- Track disabled_reason if account is disabled
ALTER TABLE stripe_accounts
ADD COLUMN IF NOT EXISTS disabled_reason TEXT;

COMMENT ON COLUMN stripe_accounts.requirements_last_updated_at IS 'Last time Stripe updated account requirements';
COMMENT ON COLUMN stripe_accounts.requirements_eventually_due IS 'Array of verification requirements that will eventually be due';
COMMENT ON COLUMN stripe_accounts.requirements_currently_due IS 'Array of verification requirements that are currently due';
COMMENT ON COLUMN stripe_accounts.disabled_reason IS 'Reason why Stripe account is disabled (if applicable)';

-- ============================================================================
-- INVOICES TABLE: Add Stripe integration fields
-- ============================================================================

-- Link invoice to Stripe invoice (if using Stripe Invoicing)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT UNIQUE;

-- Track invoice hosting URL
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS hosted_invoice_url TEXT;

COMMENT ON COLUMN invoices.stripe_invoice_id IS 'Stripe invoice ID if invoice was created in Stripe';
COMMENT ON COLUMN invoices.hosted_invoice_url IS 'Public URL for hosted invoice (Stripe or custom)';

-- Index for Stripe invoice lookups
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id
  ON invoices(stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;

-- ============================================================================
-- VERIFY ALL COLUMNS EXIST
-- ============================================================================
-- This section is just for documentation/verification
-- Columns should exist after this migration:
--
-- payments:
-- - failure_reason ✅
-- - initiated_at ✅
-- - last_error_code ✅
-- - payment_method_type ✅
--
-- refunds:
-- - stripe_charge_id ✅
--
-- stripe_accounts:
-- - requirements_last_updated_at ✅
-- - requirements_eventually_due ✅
-- - requirements_currently_due ✅
-- - disabled_reason ✅
--
-- invoices:
-- - stripe_invoice_id ✅
-- - hosted_invoice_url ✅
-- ============================================================================
