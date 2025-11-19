-- Add fields for Twilio webhook tracking to sms_logs table
-- This field enables tracking failed SMS deliveries

-- Add failed timestamp field
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_sms_logs_failed_at
  ON sms_logs(failed_at DESC)
  WHERE failed_at IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN sms_logs.failed_at IS 'Timestamp when SMS delivery failed (Twilio webhook)';
