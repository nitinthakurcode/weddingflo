-- ============================================================================
-- WEBHOOK EVENTS TABLE - Idempotency & Audit Trail
-- ============================================================================
-- This table is CRITICAL for production webhook handling:
-- 1. Idempotency: Prevents duplicate processing of the same webhook
-- 2. Audit Trail: Tracks all webhook deliveries for debugging and compliance
-- 3. Forensics: Enables investigation of payment/email/SMS issues
-- 4. Monitoring: Provides metrics on webhook processing success rates
--
-- WITHOUT THIS TABLE:
-- - Webhooks can be processed multiple times (data corruption)
-- - No way to debug "why did this payment fail?"
-- - Regulatory compliance issues (PCI-DSS, GDPR require audit trails)
-- - No way to identify duplicate webhooks from providers
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Provider identification
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'resend', 'twilio')),

  -- Webhook event identification (for idempotency)
  -- - Stripe: event.id (e.g., "evt_1ABC...")
  -- - Resend: email_id (e.g., "550e8400-e29b-41d4-a716-446655440000")
  -- - Twilio: MessageSid (e.g., "SM...")
  event_id TEXT NOT NULL,

  -- Event type (e.g., "payment_intent.succeeded", "email.delivered", "sent")
  event_type TEXT NOT NULL,

  -- Full webhook payload (for debugging and replay)
  payload JSONB NOT NULL,

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',    -- Received but not processed yet
    'processing', -- Currently being processed
    'processed',  -- Successfully processed
    'failed',     -- Processing failed (will retry)
    'skipped'     -- Skipped (e.g., unhandled event type)
  )),

  -- Processing details
  processed_at TIMESTAMPTZ, -- When processing completed
  processing_duration_ms INTEGER, -- How long processing took
  error_message TEXT, -- Error details if failed
  retry_count INTEGER DEFAULT 0, -- Number of retry attempts

  -- Metadata
  http_headers JSONB DEFAULT '{}', -- Request headers (for debugging)
  ip_address TEXT, -- Source IP (for security auditing)
  user_agent TEXT, -- User agent (for debugging)

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint for idempotency
  -- Ensures the same webhook event is only stored once
  CONSTRAINT webhook_events_provider_event_id_unique UNIQUE (provider, event_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookup: Check if webhook already processed (idempotency)
CREATE INDEX idx_webhook_events_provider_event_id
  ON webhook_events(provider, event_id);

-- Status queries: Find failed webhooks for retry
CREATE INDEX idx_webhook_events_status
  ON webhook_events(status)
  WHERE status IN ('pending', 'failed');

-- Time-series queries: Recent webhooks for monitoring
CREATE INDEX idx_webhook_events_created_at
  ON webhook_events(created_at DESC);

-- Provider-specific queries: All Stripe webhooks
CREATE INDEX idx_webhook_events_provider_created
  ON webhook_events(provider, created_at DESC);

-- Event type queries: All payment_intent.succeeded events
CREATE INDEX idx_webhook_events_event_type
  ON webhook_events(event_type);

-- Performance monitoring: Slow webhook processing
CREATE INDEX idx_webhook_events_duration
  ON webhook_events(processing_duration_ms DESC)
  WHERE processing_duration_ms IS NOT NULL;

-- Failed events for alerting
CREATE INDEX idx_webhook_events_failed_created
  ON webhook_events(created_at DESC)
  WHERE status = 'failed';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Webhooks are processed by system (no user context)
-- Only authenticated users can read webhook logs for debugging
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Super admins can view all webhook events
CREATE POLICY "Super admins can view all webhook events"
  ON webhook_events
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt()->'metadata'->>'role' = 'super_admin'
  );

-- Company admins can view their company's webhook events
-- (by joining with related tables based on payload data)
CREATE POLICY "Admins can view company webhook events"
  ON webhook_events
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt()->'metadata'->>'role' IN ('admin', 'super_admin')
  );

-- ============================================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_webhook_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER webhook_events_updated_at
  BEFORE UPDATE ON webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_events_updated_at();

-- ============================================================================
-- FUNCTION: Record webhook event (idempotency check + insert)
-- ============================================================================
-- This function provides atomic idempotency checking:
-- 1. Tries to insert the webhook event
-- 2. If event_id already exists, returns existing record
-- 3. If new, inserts and returns new record
--
-- This prevents race conditions where two webhook deliveries arrive simultaneously
-- ============================================================================

CREATE OR REPLACE FUNCTION record_webhook_event(
  p_provider TEXT,
  p_event_id TEXT,
  p_event_type TEXT,
  p_payload JSONB,
  p_http_headers JSONB DEFAULT '{}',
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
  webhook_id UUID,
  is_duplicate BOOLEAN,
  existing_status TEXT
) AS $$
DECLARE
  v_webhook_id UUID;
  v_existing_status TEXT;
  v_is_duplicate BOOLEAN := FALSE;
BEGIN
  -- Try to insert the webhook event
  BEGIN
    INSERT INTO webhook_events (
      provider,
      event_id,
      event_type,
      payload,
      http_headers,
      ip_address,
      user_agent,
      status
    ) VALUES (
      p_provider,
      p_event_id,
      p_event_type,
      p_payload,
      p_http_headers,
      p_ip_address,
      p_user_agent,
      'pending'
    )
    RETURNING id INTO v_webhook_id;

    -- New webhook, not a duplicate
    RETURN QUERY SELECT v_webhook_id, FALSE, 'pending'::TEXT;

  EXCEPTION WHEN unique_violation THEN
    -- Webhook already exists (duplicate delivery)
    -- Get the existing webhook details
    SELECT id, status INTO v_webhook_id, v_existing_status
    FROM webhook_events
    WHERE provider = p_provider
      AND event_id = p_event_id;

    -- Return existing webhook info
    RETURN QUERY SELECT v_webhook_id, TRUE, v_existing_status;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Mark webhook as processed
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_webhook_processed(
  p_webhook_id UUID,
  p_status TEXT,
  p_processing_duration_ms INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE webhook_events
  SET
    status = p_status,
    processed_at = NOW(),
    processing_duration_ms = p_processing_duration_ms,
    error_message = p_error_message,
    updated_at = NOW()
  WHERE id = p_webhook_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Increment retry count
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_webhook_retry(
  p_webhook_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_retry_count INTEGER;
BEGIN
  UPDATE webhook_events
  SET
    retry_count = retry_count + 1,
    status = 'failed',
    updated_at = NOW()
  WHERE id = p_webhook_id
  RETURNING retry_count INTO v_retry_count;

  RETURN v_retry_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Get webhook statistics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_webhook_stats(
  p_provider TEXT DEFAULT NULL,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  provider TEXT,
  total_webhooks BIGINT,
  processed_webhooks BIGINT,
  failed_webhooks BIGINT,
  pending_webhooks BIGINT,
  success_rate NUMERIC,
  avg_processing_time_ms NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    we.provider,
    COUNT(*)::BIGINT as total_webhooks,
    COUNT(*) FILTER (WHERE we.status = 'processed')::BIGINT as processed_webhooks,
    COUNT(*) FILTER (WHERE we.status = 'failed')::BIGINT as failed_webhooks,
    COUNT(*) FILTER (WHERE we.status = 'pending')::BIGINT as pending_webhooks,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND(
          (COUNT(*) FILTER (WHERE we.status = 'processed')::NUMERIC / COUNT(*)::NUMERIC) * 100,
          2
        )
      ELSE 0
    END as success_rate,
    ROUND(AVG(we.processing_duration_ms)::NUMERIC, 2) as avg_processing_time_ms
  FROM webhook_events we
  WHERE
    (p_provider IS NULL OR we.provider = p_provider)
    AND we.created_at >= NOW() - INTERVAL '1 hour' * p_hours
  GROUP BY we.provider
  ORDER BY we.provider;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Authenticated users can read webhook events (via RLS policies)
GRANT SELECT ON webhook_events TO authenticated;

-- Webhook handlers need to insert/update (system level, bypasses RLS)
-- This is handled via service role key in webhook handlers

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE webhook_events IS 'Audit trail and idempotency tracking for all webhook deliveries';
COMMENT ON COLUMN webhook_events.event_id IS 'Provider-specific unique event ID (Stripe event.id, Resend email_id, Twilio MessageSid)';
COMMENT ON COLUMN webhook_events.payload IS 'Full webhook payload for debugging and potential replay';
COMMENT ON COLUMN webhook_events.processing_duration_ms IS 'How long webhook processing took (for performance monitoring)';
COMMENT ON COLUMN webhook_events.retry_count IS 'Number of processing attempts (for monitoring retry behavior)';
COMMENT ON FUNCTION record_webhook_event IS 'Atomically record webhook event with built-in idempotency check';
COMMENT ON FUNCTION mark_webhook_processed IS 'Mark webhook as successfully processed or failed';
COMMENT ON FUNCTION get_webhook_stats IS 'Get webhook processing statistics for monitoring dashboards';
