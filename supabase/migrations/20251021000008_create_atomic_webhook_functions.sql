-- ============================================================================
-- ATOMIC WEBHOOK PROCESSING FUNCTIONS
-- ============================================================================
-- These functions prevent race conditions and ensure atomic operations
-- for webhook processing. All operations are wrapped in transactions.
-- ============================================================================

-- ============================================================================
-- EMAIL LOG FUNCTIONS
-- ============================================================================

-- Atomically increment email opened count (prevents race condition)
CREATE OR REPLACE FUNCTION increment_email_opened(
  p_resend_id TEXT
)
RETURNS TABLE (
  opened_count INTEGER,
  opened_at TIMESTAMPTZ
) AS $$
DECLARE
  v_opened_count INTEGER;
  v_opened_at TIMESTAMPTZ;
BEGIN
  -- Atomic update with row-level lock
  UPDATE email_logs
  SET
    opened_count = COALESCE(email_logs.opened_count, 0) + 1,
    opened_at = COALESCE(email_logs.opened_at, NOW()),
    updated_at = NOW()
  WHERE resend_id = p_resend_id
  RETURNING email_logs.opened_count, email_logs.opened_at
  INTO v_opened_count, v_opened_at;

  RETURN QUERY SELECT v_opened_count, v_opened_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomically increment email clicked count (prevents race condition)
CREATE OR REPLACE FUNCTION increment_email_clicked(
  p_resend_id TEXT
)
RETURNS TABLE (
  clicked_count INTEGER,
  clicked_at TIMESTAMPTZ
) AS $$
DECLARE
  v_clicked_count INTEGER;
  v_clicked_at TIMESTAMPTZ;
BEGIN
  -- Atomic update with row-level lock
  UPDATE email_logs
  SET
    clicked_count = COALESCE(email_logs.clicked_count, 0) + 1,
    clicked_at = COALESCE(email_logs.clicked_at, NOW()),
    updated_at = NOW()
  WHERE resend_id = p_resend_id
  RETURNING email_logs.clicked_count, email_logs.clicked_at
  INTO v_clicked_count, v_clicked_at;

  RETURN QUERY SELECT v_clicked_count, v_clicked_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update email status (idempotent)
CREATE OR REPLACE FUNCTION update_email_status(
  p_resend_id TEXT,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL,
  p_delivered_at TIMESTAMPTZ DEFAULT NULL,
  p_sent_at TIMESTAMPTZ DEFAULT NULL,
  p_bounced_at TIMESTAMPTZ DEFAULT NULL,
  p_complained_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE email_logs
  SET
    status = p_status,
    error_message = COALESCE(p_error_message, error_message),
    delivered_at = COALESCE(p_delivered_at, delivered_at),
    sent_at = COALESCE(p_sent_at, sent_at),
    bounced_at = COALESCE(p_bounced_at, bounced_at),
    complained_at = COALESCE(p_complained_at, complained_at),
    updated_at = NOW()
  WHERE resend_id = p_resend_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SMS LOG FUNCTIONS
-- ============================================================================

-- Update SMS status (idempotent)
CREATE OR REPLACE FUNCTION update_sms_status(
  p_twilio_sid TEXT,
  p_status TEXT,
  p_error_code TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_sent_at TIMESTAMPTZ DEFAULT NULL,
  p_delivered_at TIMESTAMPTZ DEFAULT NULL,
  p_failed_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE sms_logs
  SET
    status = p_status,
    error_code = COALESCE(p_error_code, error_code),
    error_message = COALESCE(p_error_message, error_message),
    sent_at = COALESCE(p_sent_at, sent_at),
    delivered_at = COALESCE(p_delivered_at, delivered_at),
    failed_at = COALESCE(p_failed_at, failed_at),
    updated_at = NOW()
  WHERE twilio_sid = p_twilio_sid;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PAYMENT FUNCTIONS
-- ============================================================================

-- Update payment status with full transaction support
CREATE OR REPLACE FUNCTION update_payment_from_webhook(
  p_stripe_payment_intent_id TEXT,
  p_status payment_status,
  p_failure_reason TEXT DEFAULT NULL,
  p_last_error_code TEXT DEFAULT NULL,
  p_captured_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_payment_id UUID;
  v_invoice_id UUID;
  v_amount BIGINT;
BEGIN
  -- Update payment record
  UPDATE payments
  SET
    status = p_status,
    failure_reason = COALESCE(p_failure_reason, failure_reason),
    last_error_code = COALESCE(p_last_error_code, last_error_code),
    captured_at = COALESCE(p_captured_at, captured_at),
    updated_at = NOW()
  WHERE stripe_payment_intent_id = p_stripe_payment_intent_id
  RETURNING id, invoice_id, amount INTO v_payment_id, v_invoice_id, v_amount;

  -- If payment succeeded and linked to invoice, update invoice
  IF p_status = 'succeeded' AND v_invoice_id IS NOT NULL THEN
    UPDATE invoices
    SET
      amount_paid = amount_paid + v_amount,
      updated_at = NOW()
    WHERE id = v_invoice_id;

    -- Trigger will automatically update invoice status based on amount_paid
  END IF;

  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Process refund with full transaction support
CREATE OR REPLACE FUNCTION process_refund_webhook(
  p_stripe_charge_id TEXT,
  p_stripe_refund_id TEXT,
  p_refund_amount BIGINT
)
RETURNS UUID AS $$
DECLARE
  v_refund_id UUID;
  v_payment_id UUID;
  v_invoice_id UUID;
BEGIN
  -- Find and update refund record
  UPDATE refunds
  SET
    status = 'succeeded',
    stripe_refund_id = p_stripe_refund_id,
    processed_at = NOW(),
    updated_at = NOW()
  WHERE stripe_charge_id = p_stripe_charge_id
  RETURNING id, payment_id INTO v_refund_id, v_payment_id;

  -- If refund found, update payment status
  IF v_refund_id IS NOT NULL THEN
    -- Check if fully refunded
    DECLARE
      v_payment_amount BIGINT;
      v_total_refunded BIGINT;
    BEGIN
      SELECT amount, invoice_id INTO v_payment_amount, v_invoice_id
      FROM payments
      WHERE id = v_payment_id;

      SELECT COALESCE(SUM(amount), 0) INTO v_total_refunded
      FROM refunds
      WHERE payment_id = v_payment_id
        AND status = 'succeeded';

      -- Update payment status
      IF v_total_refunded >= v_payment_amount THEN
        UPDATE payments SET status = 'refunded' WHERE id = v_payment_id;
      ELSE
        UPDATE payments SET status = 'partially_refunded' WHERE id = v_payment_id;
      END IF;

      -- Update invoice if applicable
      IF v_invoice_id IS NOT NULL THEN
        UPDATE invoices
        SET
          amount_paid = amount_paid - p_refund_amount,
          updated_at = NOW()
        WHERE id = v_invoice_id;
      END IF;
    END;
  END IF;

  RETURN v_refund_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STRIPE CONNECT ACCOUNT FUNCTIONS
-- ============================================================================

-- Update Stripe Connect account status
CREATE OR REPLACE FUNCTION update_stripe_account_from_webhook(
  p_stripe_account_id TEXT,
  p_charges_enabled BOOLEAN,
  p_payouts_enabled BOOLEAN,
  p_details_submitted BOOLEAN,
  p_requirements_currently_due JSONB DEFAULT '[]',
  p_requirements_eventually_due JSONB DEFAULT '[]',
  p_disabled_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_account_id UUID;
  v_status stripe_account_status;
BEGIN
  -- Determine account status based on Stripe's account state
  IF p_charges_enabled AND p_payouts_enabled THEN
    v_status := 'enabled';
  ELSIF p_disabled_reason IS NOT NULL THEN
    v_status := 'disabled';
  ELSIF NOT p_details_submitted THEN
    v_status := 'pending';
  ELSE
    v_status := 'restricted';
  END IF;

  -- Update account record
  UPDATE stripe_accounts
  SET
    status = v_status,
    charges_enabled = p_charges_enabled,
    payouts_enabled = p_payouts_enabled,
    details_submitted = p_details_submitted,
    requirements_currently_due = p_requirements_currently_due,
    requirements_eventually_due = p_requirements_eventually_due,
    disabled_reason = p_disabled_reason,
    requirements_last_updated_at = NOW(),
    updated_at = NOW()
  WHERE stripe_account_id = p_stripe_account_id
  RETURNING id INTO v_account_id;

  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SUBSCRIPTION FUNCTIONS
-- ============================================================================

-- Update company subscription from Stripe webhook
CREATE OR REPLACE FUNCTION update_company_subscription(
  p_company_id UUID,
  p_subscription_tier TEXT,
  p_subscription_status TEXT,
  p_stripe_subscription_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE companies
  SET
    subscription_tier = p_subscription_tier,
    subscription_status = p_subscription_status,
    stripe_subscription_id = COALESCE(p_stripe_subscription_id, stripe_subscription_id),
    updated_at = NOW()
  WHERE id = p_company_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- These functions are called by webhook handlers using service role key
-- which bypasses RLS, so no need to grant explicit permissions

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION increment_email_opened IS 'Atomically increment email opened count (prevents race conditions)';
COMMENT ON FUNCTION increment_email_clicked IS 'Atomically increment email clicked count (prevents race conditions)';
COMMENT ON FUNCTION update_email_status IS 'Update email delivery status from Resend webhook';
COMMENT ON FUNCTION update_sms_status IS 'Update SMS delivery status from Twilio webhook';
COMMENT ON FUNCTION update_payment_from_webhook IS 'Update payment status with invoice linkage (transactional)';
COMMENT ON FUNCTION process_refund_webhook IS 'Process refund and update payment/invoice (transactional)';
COMMENT ON FUNCTION update_stripe_account_from_webhook IS 'Update Stripe Connect account status';
COMMENT ON FUNCTION update_company_subscription IS 'Update company subscription from Stripe webhook';
