-- Create sms_logs table
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  sms_type TEXT NOT NULL CHECK (sms_type IN (
    'wedding_reminder',
    'rsvp_confirmation',
    'payment_reminder',
    'payment_received',
    'vendor_notification',
    'event_update',
    'general'
  )),
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  message_body TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'es', 'fr', 'de', 'ja', 'zh', 'hi')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'queued',
    'sending',
    'sent',
    'delivered',
    'undelivered',
    'failed'
  )),
  twilio_sid TEXT, -- Twilio message SID for tracking
  segments INTEGER DEFAULT 1, -- Number of SMS segments (160 chars each)
  error_code TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sms_preferences table for user notification settings
CREATE TABLE IF NOT EXISTS sms_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  receive_wedding_reminders BOOLEAN DEFAULT TRUE,
  receive_payment_reminders BOOLEAN DEFAULT TRUE,
  receive_rsvp_notifications BOOLEAN DEFAULT TRUE,
  receive_vendor_messages BOOLEAN DEFAULT TRUE,
  receive_event_updates BOOLEAN DEFAULT TRUE,
  sms_frequency TEXT DEFAULT 'immediate' CHECK (sms_frequency IN ('immediate', 'daily', 'off')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- Enable RLS
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sms_logs using session claims

-- Policy: Users can view SMS logs for their company
CREATE POLICY "Users can view sms logs in their company"
  ON sms_logs
  FOR SELECT
  TO authenticated
  USING (
    company_id::text = auth.jwt()->'metadata'->>'company_id'
  );

-- Policy: Users can insert SMS logs for their company
CREATE POLICY "Users can insert sms logs for their company"
  ON sms_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id::text = auth.jwt()->'metadata'->>'company_id'
  );

-- Policy: Users can update SMS logs in their company (for status updates)
CREATE POLICY "Users can update sms logs in their company"
  ON sms_logs
  FOR UPDATE
  TO authenticated
  USING (
    company_id::text = auth.jwt()->'metadata'->>'company_id'
  );

-- RLS Policies for sms_preferences using session claims

-- Policy: Users can view their own SMS preferences
CREATE POLICY "Users can view own sms preferences"
  ON sms_preferences
  FOR SELECT
  TO authenticated
  USING (
    user_id::text = auth.uid()::text
  );

-- Policy: Users can insert their own SMS preferences
CREATE POLICY "Users can insert own sms preferences"
  ON sms_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id::text = auth.uid()::text
    AND company_id::text = auth.jwt()->'metadata'->>'company_id'
  );

-- Policy: Users can update their own SMS preferences
CREATE POLICY "Users can update own sms preferences"
  ON sms_preferences
  FOR UPDATE
  TO authenticated
  USING (
    user_id::text = auth.uid()::text
  );

-- Indexes for performance

-- SMS logs indexes
CREATE INDEX idx_sms_logs_company_id ON sms_logs(company_id);
CREATE INDEX idx_sms_logs_client_id ON sms_logs(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_sms_logs_sms_type ON sms_logs(sms_type);
CREATE INDEX idx_sms_logs_status ON sms_logs(status);
CREATE INDEX idx_sms_logs_created_at ON sms_logs(created_at DESC);
CREATE INDEX idx_sms_logs_sent_at ON sms_logs(sent_at DESC) WHERE sent_at IS NOT NULL;
CREATE INDEX idx_sms_logs_recipient_phone ON sms_logs(recipient_phone);
CREATE INDEX idx_sms_logs_twilio_sid ON sms_logs(twilio_sid) WHERE twilio_sid IS NOT NULL;

-- Composite index for common queries
CREATE INDEX idx_sms_logs_company_status_created
  ON sms_logs(company_id, status, created_at DESC);

-- SMS preferences indexes
CREATE INDEX idx_sms_preferences_user_id ON sms_preferences(user_id);
CREATE INDEX idx_sms_preferences_company_id ON sms_preferences(company_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sms_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_sms_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER sms_logs_updated_at
  BEFORE UPDATE ON sms_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_logs_updated_at();

CREATE TRIGGER sms_preferences_updated_at
  BEFORE UPDATE ON sms_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_preferences_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON sms_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sms_preferences TO authenticated;

-- Create function to get SMS statistics
CREATE OR REPLACE FUNCTION get_sms_stats(p_company_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  total_sms BIGINT,
  sent_sms BIGINT,
  delivered_sms BIGINT,
  failed_sms BIGINT,
  total_segments BIGINT,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_sms,
    COUNT(*) FILTER (WHERE status IN ('sent', 'delivered'))::BIGINT as sent_sms,
    COUNT(*) FILTER (WHERE status = 'delivered')::BIGINT as delivered_sms,
    COUNT(*) FILTER (WHERE status IN ('failed', 'undelivered'))::BIGINT as failed_sms,
    COALESCE(SUM(segments), 0)::BIGINT as total_segments,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND(
          (COUNT(*) FILTER (WHERE status IN ('sent', 'delivered'))::NUMERIC / COUNT(*)::NUMERIC) * 100,
          2
        )
      ELSE 0
    END as success_rate
  FROM sms_logs
  WHERE
    company_id = p_company_id
    AND created_at >= NOW() - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check SMS preferences before sending
CREATE OR REPLACE FUNCTION should_send_sms(
  p_user_id UUID,
  p_sms_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_preferences RECORD;
BEGIN
  -- Get user preferences
  SELECT * INTO v_preferences
  FROM sms_preferences
  WHERE user_id = p_user_id;

  -- If no preferences set, default to TRUE (send SMS)
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;

  -- If SMS is turned off completely, return FALSE
  IF v_preferences.sms_frequency = 'off' THEN
    RETURN FALSE;
  END IF;

  -- Check specific preference based on SMS type
  CASE p_sms_type
    WHEN 'wedding_reminder' THEN
      RETURN v_preferences.receive_wedding_reminders;
    WHEN 'payment_reminder' THEN
      RETURN v_preferences.receive_payment_reminders;
    WHEN 'rsvp_confirmation' THEN
      RETURN v_preferences.receive_rsvp_notifications;
    WHEN 'vendor_notification' THEN
      RETURN v_preferences.receive_vendor_messages;
    WHEN 'event_update' THEN
      RETURN v_preferences.receive_event_updates;
    ELSE
      RETURN TRUE; -- Default to send for other types
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE sms_logs IS 'Tracks all SMS messages sent through the system with delivery status';
COMMENT ON TABLE sms_preferences IS 'User SMS notification preferences and frequency settings';
COMMENT ON COLUMN sms_logs.twilio_sid IS 'Twilio message SID for tracking delivery status';
COMMENT ON COLUMN sms_logs.segments IS 'Number of SMS segments (160 characters per segment)';
COMMENT ON COLUMN sms_logs.metadata IS 'Additional SMS data (template variables, custom fields)';
COMMENT ON FUNCTION get_sms_stats IS 'Get SMS sending statistics for a company over specified days';
COMMENT ON FUNCTION should_send_sms IS 'Check if SMS should be sent based on user preferences';
