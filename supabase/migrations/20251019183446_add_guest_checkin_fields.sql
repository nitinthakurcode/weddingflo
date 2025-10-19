-- Add check-in tracking fields to guests table
ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_by TEXT;

-- Add comments for documentation
COMMENT ON COLUMN guests.checked_in IS 'Whether the guest has checked in at the event';
COMMENT ON COLUMN guests.checked_in_at IS 'Timestamp when the guest checked in';
COMMENT ON COLUMN guests.checked_in_by IS 'User ID who performed the check-in';

-- Create index for better query performance on checked-in guests
CREATE INDEX IF NOT EXISTS idx_guests_checked_in ON guests(checked_in);
