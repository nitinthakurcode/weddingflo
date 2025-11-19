-- Fix function search_path security warnings
-- All functions updated to include SECURITY DEFINER and SET search_path = public
-- This prevents SQL injection attacks via search_path manipulation

-- ============================================================================
-- WEBHOOK FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_webhook_events_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION record_webhook_event(
  p_event_type TEXT,
  p_source TEXT,
  p_payload JSONB,
  p_company_id UUID DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO webhook_events (event_type, source, payload, company_id, status)
  VALUES (p_event_type, p_source, p_payload, p_company_id, 'pending')
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION mark_webhook_processed(p_event_id UUID, p_error TEXT DEFAULT NULL)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE webhook_events
  SET
    status = CASE WHEN p_error IS NULL THEN 'processed' ELSE 'failed' END,
    error_message = p_error,
    processed_at = NOW()
  WHERE id = p_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_webhook_retry(p_event_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE webhook_events
  SET retry_count = retry_count + 1
  WHERE id = p_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_webhook_stats(p_company_id UUID DEFAULT NULL)
RETURNS TABLE (
  total_events BIGINT,
  pending_events BIGINT,
  processed_events BIGINT,
  failed_events BIGINT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'processed')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT
  FROM webhook_events
  WHERE p_company_id IS NULL OR company_id = p_company_id;
END;
$$;

-- ============================================================================
-- GIFT TRACKING FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_gifts_enhanced_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION set_thank_you_due_date()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.received_date IS NOT NULL AND NEW.thank_you_due_date IS NULL THEN
    NEW.thank_you_due_date := NEW.received_date + INTERVAL '30 days';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION create_default_gift_categories(p_company_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_categories TEXT[] := ARRAY['Cash', 'Household', 'Kitchen', 'Decor', 'Gift Cards', 'Other'];
  v_category TEXT;
BEGIN
  FOREACH v_category IN ARRAY v_categories
  LOOP
    INSERT INTO gift_categories (company_id, name)
    VALUES (p_company_id, v_category)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION get_thank_you_notes_due(p_company_id UUID)
RETURNS TABLE (
  gift_id UUID,
  guest_name TEXT,
  gift_description TEXT,
  received_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  days_overdue INTEGER
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.guest_name,
    g.description,
    g.received_date,
    g.thank_you_due_date,
    EXTRACT(DAY FROM NOW() - g.thank_you_due_date)::INTEGER
  FROM gifts_enhanced g
  WHERE g.company_id = p_company_id
    AND g.thank_you_sent = FALSE
    AND g.thank_you_due_date < NOW()
  ORDER BY g.thank_you_due_date ASC;
END;
$$;

CREATE OR REPLACE FUNCTION get_gift_stats(p_company_id UUID)
RETURNS TABLE (
  total_gifts BIGINT,
  total_value NUMERIC,
  thank_you_sent BIGINT,
  thank_you_pending BIGINT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COALESCE(SUM(estimated_value), 0),
    COUNT(*) FILTER (WHERE thank_you_sent = TRUE)::BIGINT,
    COUNT(*) FILTER (WHERE thank_you_sent = FALSE)::BIGINT
  FROM gifts_enhanced
  WHERE company_id = p_company_id;
END;
$$;

-- ============================================================================
-- TEMPLATE FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_templates_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- CURRENCY FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION convert_currency(
  p_amount NUMERIC,
  p_from_currency TEXT,
  p_to_currency TEXT
)
RETURNS NUMERIC
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  -- If same currency, return original amount
  IF p_from_currency = p_to_currency THEN
    RETURN p_amount;
  END IF;

  -- Get exchange rate from currency_exchange_rates table
  SELECT rate INTO v_rate
  FROM currency_exchange_rates
  WHERE from_currency = p_from_currency
    AND to_currency = p_to_currency
    AND created_at >= NOW() - INTERVAL '24 hours'
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no rate found, return original amount
  IF v_rate IS NULL THEN
    RETURN p_amount;
  END IF;

  RETURN p_amount * v_rate;
END;
$$;

-- ============================================================================
-- EMAIL FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_email_logs_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_email_preferences_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION increment_email_opened(p_email_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE email_logs
  SET
    opened_count = COALESCE(opened_count, 0) + 1,
    last_opened_at = NOW()
  WHERE id = p_email_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_email_clicked(p_email_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE email_logs
  SET clicked_count = COALESCE(clicked_count, 0) + 1
  WHERE id = p_email_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_email_status(
  p_email_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE email_logs
  SET
    status = p_status,
    error_message = p_error_message
  WHERE id = p_email_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_email_stats(p_company_id UUID)
RETURNS TABLE (
  total_sent BIGINT,
  total_delivered BIGINT,
  total_opened BIGINT,
  total_clicked BIGINT,
  total_failed BIGINT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'delivered')::BIGINT,
    COUNT(*) FILTER (WHERE opened_count > 0)::BIGINT,
    COUNT(*) FILTER (WHERE clicked_count > 0)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT
  FROM email_logs
  WHERE company_id = p_company_id;
END;
$$;

CREATE OR REPLACE FUNCTION should_send_email(p_user_id UUID, p_email_type TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  SELECT
    CASE p_email_type
      WHEN 'marketing' THEN marketing_emails
      WHEN 'transactional' THEN transactional_emails
      WHEN 'reminder' THEN reminder_emails
      ELSE TRUE
    END INTO v_enabled
  FROM email_preferences
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_enabled, TRUE);
END;
$$;

-- ============================================================================
-- SMS FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_sms_logs_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_sms_preferences_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_sms_status(
  p_sms_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE sms_logs
  SET
    status = p_status,
    error_message = p_error_message
  WHERE id = p_sms_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_sms_stats(p_company_id UUID)
RETURNS TABLE (
  total_sent BIGINT,
  total_delivered BIGINT,
  total_failed BIGINT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'delivered')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT
  FROM sms_logs
  WHERE company_id = p_company_id;
END;
$$;

CREATE OR REPLACE FUNCTION should_send_sms(p_user_id UUID, p_sms_type TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  SELECT enabled INTO v_enabled
  FROM sms_preferences
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_enabled, TRUE);
END;
$$;

-- ============================================================================
-- PAYMENT/ANALYTICS FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_revenue_analytics(p_company_id UUID, p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ)
RETURNS TABLE (
  total_revenue NUMERIC,
  total_payments BIGINT,
  average_payment NUMERIC
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(amount), 0),
    COUNT(*)::BIGINT,
    COALESCE(AVG(amount), 0)
  FROM payments
  WHERE company_id = p_company_id
    AND status = 'succeeded'
    AND created_at BETWEEN p_start_date AND p_end_date;
END;
$$;

CREATE OR REPLACE FUNCTION get_payment_status_breakdown(p_company_id UUID)
RETURNS TABLE (
  status TEXT,
  count BIGINT,
  total_amount NUMERIC
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.status::TEXT,
    COUNT(*)::BIGINT,
    COALESCE(SUM(p.amount), 0)
  FROM payments p
  WHERE p.company_id = p_company_id
  GROUP BY p.status;
END;
$$;

CREATE OR REPLACE FUNCTION get_top_revenue_clients(p_company_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  total_revenue NUMERIC,
  payment_count BIGINT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.bride_name || ' & ' || c.groom_name AS client_name,
    COALESCE(SUM(p.amount), 0),
    COUNT(p.id)::BIGINT
  FROM clients c
  LEFT JOIN payments p ON p.client_id = c.id AND p.status = 'succeeded'
  WHERE c.company_id = p_company_id
  GROUP BY c.id, c.bride_name, c.groom_name
  ORDER BY COALESCE(SUM(p.amount), 0) DESC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION get_notification_stats(p_company_id UUID)
RETURNS TABLE (
  channel TEXT,
  total_sent BIGINT,
  total_delivered BIGINT,
  total_failed BIGINT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 'email'::TEXT, * FROM get_email_stats(p_company_id)
  UNION ALL
  SELECT 'sms'::TEXT, * FROM get_sms_stats(p_company_id);
END;
$$;

CREATE OR REPLACE FUNCTION get_monthly_revenue_trend(p_company_id UUID, p_months INTEGER DEFAULT 12)
RETURNS TABLE (
  month DATE,
  revenue NUMERIC,
  payment_count BIGINT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('month', created_at)::DATE,
    COALESCE(SUM(amount), 0),
    COUNT(*)::BIGINT
  FROM payments
  WHERE company_id = p_company_id
    AND status = 'succeeded'
    AND created_at >= NOW() - (p_months || ' months')::INTERVAL
  GROUP BY DATE_TRUNC('month', created_at)
  ORDER BY DATE_TRUNC('month', created_at) DESC;
END;
$$;

-- ============================================================================
-- WEDDING WEBSITE FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_wedding_websites_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION generate_unique_subdomain(p_bride_name TEXT, p_groom_name TEXT)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_subdomain TEXT;
  v_counter INTEGER := 0;
  v_exists BOOLEAN;
BEGIN
  -- Create base subdomain from names
  v_subdomain := LOWER(REGEXP_REPLACE(p_bride_name || '-' || p_groom_name, '[^a-zA-Z0-9]', '', 'g'));

  -- Check if subdomain exists
  LOOP
    SELECT EXISTS(SELECT 1 FROM wedding_websites WHERE subdomain = v_subdomain) INTO v_exists;

    IF NOT v_exists THEN
      EXIT;
    END IF;

    v_counter := v_counter + 1;
    v_subdomain := LOWER(REGEXP_REPLACE(p_bride_name || '-' || p_groom_name, '[^a-zA-Z0-9]', '', 'g')) || '-' || v_counter;
  END LOOP;

  RETURN v_subdomain;
END;
$$;

CREATE OR REPLACE FUNCTION increment_website_views(p_website_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE wedding_websites
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_website_id;
END;
$$;

CREATE OR REPLACE FUNCTION set_wedding_website_published_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_published = TRUE AND OLD.is_published = FALSE THEN
    NEW.published_at := NOW();
  ELSIF NEW.is_published = FALSE THEN
    NEW.published_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- DOMAIN DNS FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_domain_dns_records_timestamp()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION generate_dns_token()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'wf-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 32);
END;
$$;

-- ============================================================================
-- AI USAGE FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_ai_usage(
  p_company_id UUID,
  p_feature TEXT,
  p_tokens_used INTEGER
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO ai_usage (company_id, feature, tokens_used, usage_count)
  VALUES (p_company_id, p_feature, p_tokens_used, 1)
  ON CONFLICT (company_id, feature, DATE_TRUNC('day', created_at))
  DO UPDATE SET
    tokens_used = ai_usage.tokens_used + p_tokens_used,
    usage_count = ai_usage.usage_count + 1;
END;
$$;

CREATE OR REPLACE FUNCTION check_ai_quota(p_company_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_subscription_tier TEXT;
  v_monthly_tokens INTEGER;
  v_tokens_limit INTEGER;
BEGIN
  -- Get company subscription tier
  SELECT subscription_tier INTO v_subscription_tier
  FROM companies
  WHERE id = p_company_id;

  -- Get current month token usage
  SELECT COALESCE(SUM(tokens_used), 0) INTO v_monthly_tokens
  FROM ai_usage
  WHERE company_id = p_company_id
    AND created_at >= DATE_TRUNC('month', NOW());

  -- Set limits based on tier
  v_tokens_limit := CASE v_subscription_tier
    WHEN 'free' THEN 10000
    WHEN 'starter' THEN 50000
    WHEN 'professional' THEN 200000
    WHEN 'enterprise' THEN 1000000
    ELSE 10000
  END;

  RETURN v_monthly_tokens < v_tokens_limit;
END;
$$;

-- ============================================================================
-- PAYMENT WEBHOOK FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_payment_from_webhook(
  p_stripe_payment_id TEXT,
  p_status TEXT,
  p_metadata JSONB
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE payments
  SET
    status = p_status::payment_status,
    metadata = p_metadata
  WHERE stripe_payment_intent_id = p_stripe_payment_id;
END;
$$;

CREATE OR REPLACE FUNCTION process_refund_webhook(
  p_stripe_refund_id TEXT,
  p_payment_intent_id TEXT,
  p_amount NUMERIC,
  p_reason TEXT
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment_id UUID;
BEGIN
  -- Get payment ID
  SELECT id INTO v_payment_id
  FROM payments
  WHERE stripe_payment_intent_id = p_payment_intent_id;

  -- Insert refund record
  INSERT INTO refunds (
    payment_id,
    stripe_refund_id,
    amount,
    reason,
    status
  ) VALUES (
    v_payment_id,
    p_stripe_refund_id,
    p_amount,
    p_reason,
    'succeeded'
  );

  -- Update payment status
  UPDATE payments
  SET status = 'refunded'
  WHERE id = v_payment_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_stripe_account_from_webhook(
  p_company_id UUID,
  p_stripe_account_id TEXT,
  p_status TEXT,
  p_metadata JSONB
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE stripe_accounts
  SET
    status = p_status::stripe_account_status,
    metadata = p_metadata
  WHERE company_id = p_company_id
    AND stripe_account_id = p_stripe_account_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_company_subscription(
  p_company_id UUID,
  p_stripe_subscription_id TEXT,
  p_status TEXT,
  p_current_period_end TIMESTAMPTZ
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE companies
  SET
    stripe_subscription_id = p_stripe_subscription_id,
    subscription_status = p_status::subscription_status,
    subscription_end_date = p_current_period_end
  WHERE id = p_company_id;
END;
$$;

-- ============================================================================
-- STRIPE ACCOUNT FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_stripe_accounts_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_refunds_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- INVOICE FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_payment_stats(p_company_id UUID)
RETURNS TABLE (
  total_revenue NUMERIC,
  pending_payments NUMERIC,
  overdue_payments NUMERIC
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE status = 'succeeded'), 0),
    COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0),
    COALESCE(SUM(amount) FILTER (WHERE status = 'failed'), 0)
  FROM payments
  WHERE company_id = p_company_id;
END;
$$;

CREATE OR REPLACE FUNCTION generate_invoice_number(p_company_id UUID)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
  v_year TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');

  SELECT COUNT(*) INTO v_count
  FROM invoices
  WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  RETURN 'INV-' || v_year || '-' || LPAD((v_count + 1)::TEXT, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Calculate totals from line items
  NEW.subtotal := (SELECT COALESCE(SUM(quantity * unit_price), 0)
                   FROM invoice_line_items
                   WHERE invoice_id = NEW.id);

  NEW.tax_amount := NEW.subtotal * (COALESCE(NEW.tax_rate, 0) / 100);
  NEW.total := NEW.subtotal + NEW.tax_amount;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- FLOOR PLAN FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_floor_plans_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION get_table_guest_count(p_table_id UUID)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM floor_plan_guests
  WHERE table_id = p_table_id;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION get_unassigned_guests(p_floor_plan_id UUID)
RETURNS TABLE (
  guest_id UUID,
  guest_name TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT g.id, g.name
  FROM guests g
  WHERE g.company_id = (SELECT company_id FROM floor_plans WHERE id = p_floor_plan_id)
    AND g.id NOT IN (
      SELECT guest_id
      FROM floor_plan_guests fpg
      JOIN floor_plan_tables fpt ON fpg.table_id = fpt.id
      WHERE fpt.floor_plan_id = p_floor_plan_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION check_table_capacity()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_count INTEGER;
  v_capacity INTEGER;
BEGIN
  SELECT capacity INTO v_capacity
  FROM floor_plan_tables
  WHERE id = NEW.table_id;

  SELECT COUNT(*) INTO v_current_count
  FROM floor_plan_guests
  WHERE table_id = NEW.table_id;

  IF v_current_count >= v_capacity THEN
    RAISE EXCEPTION 'Table is at full capacity';
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- WHATSAPP FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_whatsapp_stats(p_company_id UUID)
RETURNS TABLE (
  total_sent BIGINT,
  total_delivered BIGINT,
  total_read BIGINT,
  total_failed BIGINT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'delivered')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'read')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT
  FROM whatsapp_messages
  WHERE company_id = p_company_id;
END;
$$;

-- ============================================================================
-- ANALYTICS EXPORT FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_analytics_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_expired_reports()
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM analytics_exports
  WHERE expires_at < NOW();
END;
$$;

CREATE OR REPLACE FUNCTION get_company_analytics(
  p_company_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'revenue', (SELECT * FROM get_revenue_analytics(p_company_id, p_start_date, p_end_date)),
    'payments', (SELECT jsonb_agg(row_to_json(t)) FROM get_payment_status_breakdown(p_company_id) t),
    'notifications', (SELECT jsonb_agg(row_to_json(t)) FROM get_notification_stats(p_company_id) t)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- SECURITY: Grant execute permissions to authenticated users
-- ============================================================================

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
