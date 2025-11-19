-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  email_type TEXT NOT NULL CHECK (email_type IN (
    'client_invite',
    'wedding_reminder',
    'rsvp_confirmation',
    'payment_reminder',
    'payment_receipt',
    'vendor_communication',
    'general'
  )),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'es', 'fr', 'de', 'ja', 'zh', 'hi')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  resend_id TEXT, -- Resend email ID for tracking
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create email_preferences table for user notification settings
CREATE TABLE IF NOT EXISTS email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  receive_wedding_reminders BOOLEAN DEFAULT TRUE,
  receive_payment_reminders BOOLEAN DEFAULT TRUE,
  receive_rsvp_notifications BOOLEAN DEFAULT TRUE,
  receive_vendor_messages BOOLEAN DEFAULT TRUE,
  receive_marketing BOOLEAN DEFAULT FALSE,
  email_frequency TEXT DEFAULT 'immediate' CHECK (email_frequency IN ('immediate', 'daily', 'weekly')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_logs using session claims

-- Policy: Users can view email logs for their company
CREATE POLICY "Users can view email logs in their company"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (
    company_id::text = auth.jwt()->'metadata'->>'company_id'
  );

-- Policy: Users can insert email logs for their company
CREATE POLICY "Users can insert email logs for their company"
  ON email_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id::text = auth.jwt()->'metadata'->>'company_id'
  );

-- Policy: Users can update email logs in their company (for status updates)
CREATE POLICY "Users can update email logs in their company"
  ON email_logs
  FOR UPDATE
  TO authenticated
  USING (
    company_id::text = auth.jwt()->'metadata'->>'company_id'
  );

-- RLS Policies for email_preferences using session claims

-- Policy: Users can view their own email preferences
CREATE POLICY "Users can view own email preferences"
  ON email_preferences
  FOR SELECT
  TO authenticated
  USING (
    user_id::text = auth.uid()::text
  );

-- Policy: Users can insert their own email preferences
CREATE POLICY "Users can insert own email preferences"
  ON email_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id::text = auth.uid()::text
    AND company_id::text = auth.jwt()->'metadata'->>'company_id'
  );

-- Policy: Users can update their own email preferences
CREATE POLICY "Users can update own email preferences"
  ON email_preferences
  FOR UPDATE
  TO authenticated
  USING (
    user_id::text = auth.uid()::text
  );

-- Indexes for performance

-- Email logs indexes
CREATE INDEX idx_email_logs_company_id ON email_logs(company_id);
CREATE INDEX idx_email_logs_client_id ON email_logs(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC) WHERE sent_at IS NOT NULL;
CREATE INDEX idx_email_logs_recipient_email ON email_logs(recipient_email);
CREATE INDEX idx_email_logs_resend_id ON email_logs(resend_id) WHERE resend_id IS NOT NULL;

-- Composite index for common queries
CREATE INDEX idx_email_logs_company_status_created
  ON email_logs(company_id, status, created_at DESC);

-- Email preferences indexes
CREATE INDEX idx_email_preferences_user_id ON email_preferences(user_id);
CREATE INDEX idx_email_preferences_company_id ON email_preferences(company_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_email_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER email_logs_updated_at
  BEFORE UPDATE ON email_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_email_logs_updated_at();

CREATE TRIGGER email_preferences_updated_at
  BEFORE UPDATE ON email_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_email_preferences_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON email_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON email_preferences TO authenticated;

-- Create function to get email statistics
CREATE OR REPLACE FUNCTION get_email_stats(p_company_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  total_emails BIGINT,
  sent_emails BIGINT,
  delivered_emails BIGINT,
  failed_emails BIGINT,
  bounced_emails BIGINT,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_emails,
    COUNT(*) FILTER (WHERE status = 'sent')::BIGINT as sent_emails,
    COUNT(*) FILTER (WHERE status = 'delivered')::BIGINT as delivered_emails,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_emails,
    COUNT(*) FILTER (WHERE status = 'bounced')::BIGINT as bounced_emails,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND(
          (COUNT(*) FILTER (WHERE status IN ('sent', 'delivered'))::NUMERIC / COUNT(*)::NUMERIC) * 100,
          2
        )
      ELSE 0
    END as success_rate
  FROM email_logs
  WHERE
    company_id = p_company_id
    AND created_at >= NOW() - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check email preferences before sending
CREATE OR REPLACE FUNCTION should_send_email(
  p_user_id UUID,
  p_email_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_preferences RECORD;
BEGIN
  -- Get user preferences
  SELECT * INTO v_preferences
  FROM email_preferences
  WHERE user_id = p_user_id;

  -- If no preferences set, default to TRUE (send email)
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;

  -- Check specific preference based on email type
  CASE p_email_type
    WHEN 'wedding_reminder' THEN
      RETURN v_preferences.receive_wedding_reminders;
    WHEN 'payment_reminder' THEN
      RETURN v_preferences.receive_payment_reminders;
    WHEN 'rsvp_confirmation' THEN
      RETURN v_preferences.receive_rsvp_notifications;
    WHEN 'vendor_communication' THEN
      RETURN v_preferences.receive_vendor_messages;
    ELSE
      RETURN TRUE; -- Default to send for other types
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE email_logs IS 'Tracks all emails sent through the system with delivery status';
COMMENT ON TABLE email_preferences IS 'User email notification preferences and frequency settings';
COMMENT ON COLUMN email_logs.resend_id IS 'Resend.com email ID for tracking delivery status';
COMMENT ON COLUMN email_logs.metadata IS 'Additional email data (template variables, custom fields)';
COMMENT ON FUNCTION get_email_stats IS 'Get email sending statistics for a company over specified days';
COMMENT ON FUNCTION should_send_email IS 'Check if email should be sent based on user preferences';
