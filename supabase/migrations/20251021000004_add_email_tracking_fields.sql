-- Add fields for Resend webhook tracking to email_logs table
-- These fields enable comprehensive email engagement tracking

-- Add tracking timestamp fields
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS complained_at TIMESTAMPTZ;

-- Add engagement counter fields
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS opened_count INTEGER DEFAULT 0;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS clicked_count INTEGER DEFAULT 0;

-- Update status CHECK constraint to include new statuses
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_status_check;
ALTER TABLE email_logs ADD CONSTRAINT email_logs_status_check
  CHECK (status IN (
    'pending',
    'sent',
    'delivered',
    'delayed',
    'failed',
    'bounced',
    'complained'
  ));

-- Add indexes for new fields (performance optimization)
CREATE INDEX IF NOT EXISTS idx_email_logs_opened_at
  ON email_logs(opened_at DESC)
  WHERE opened_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_logs_clicked_at
  ON email_logs(clicked_at DESC)
  WHERE clicked_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_logs_bounced_at
  ON email_logs(bounced_at DESC)
  WHERE bounced_at IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN email_logs.opened_at IS 'Timestamp when email was first opened (Resend webhook)';
COMMENT ON COLUMN email_logs.clicked_at IS 'Timestamp when email link was first clicked (Resend webhook)';
COMMENT ON COLUMN email_logs.bounced_at IS 'Timestamp when email bounced (Resend webhook)';
COMMENT ON COLUMN email_logs.complained_at IS 'Timestamp when recipient marked as spam (Resend webhook)';
COMMENT ON COLUMN email_logs.opened_count IS 'Number of times email was opened (Resend webhook tracking)';
COMMENT ON COLUMN email_logs.clicked_count IS 'Number of times links were clicked (Resend webhook tracking)';
