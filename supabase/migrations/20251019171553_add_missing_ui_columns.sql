-- Migration: Add missing columns to match UI requirements
-- This migration adds all columns that are used in the UI forms but were missing from the database

-- ============================================================================
-- VENDORS TABLE - Add contract and payment tracking fields
-- ============================================================================
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS contract_signed BOOLEAN DEFAULT FALSE;

ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS contract_date DATE;

ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT FALSE;

ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'
  CHECK (payment_status IN ('pending', 'paid', 'overdue'));

-- ============================================================================
-- HOTELS TABLE - Add booking status and payment fields
-- ============================================================================
ALTER TABLE hotels
ADD COLUMN IF NOT EXISTS booking_confirmed BOOLEAN DEFAULT FALSE;

ALTER TABLE hotels
ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT FALSE;

ALTER TABLE hotels
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'
  CHECK (payment_status IN ('pending', 'paid', 'overdue'));

-- ============================================================================
-- GIFTS TABLE - Add thank you tracking fields
-- ============================================================================
ALTER TABLE gifts
ADD COLUMN IF NOT EXISTS thank_you_sent BOOLEAN DEFAULT FALSE;

ALTER TABLE gifts
ADD COLUMN IF NOT EXISTS thank_you_sent_date DATE;

-- ============================================================================
-- EVENTS TABLE - Add status field
-- ============================================================================
ALTER TABLE events
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planned'
  CHECK (status IN ('planned', 'confirmed', 'completed', 'cancelled'));

-- ============================================================================
-- GUESTS TABLE - Add RSVP status field
-- ============================================================================
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS rsvp_status TEXT DEFAULT 'pending'
  CHECK (rsvp_status IN ('pending', 'accepted', 'declined'));

-- ============================================================================
-- BUDGET TABLE - Add vendor link and payment fields
-- ============================================================================
ALTER TABLE budget
ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL;

-- Payment fields may already exist, add only if not present
ALTER TABLE budget
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'
  CHECK (payment_status IN ('pending', 'paid', 'overdue'));

ALTER TABLE budget
ADD COLUMN IF NOT EXISTS payment_date DATE;

-- ============================================================================
-- TIMELINE TABLE - Add duration field
-- ============================================================================
ALTER TABLE timeline
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- ============================================================================
-- DOCUMENTS TABLE - Add tags field
-- ============================================================================
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- ============================================================================
-- COLUMN COMMENTS - Add documentation
-- ============================================================================
COMMENT ON COLUMN vendors.contract_signed IS 'Whether contract has been signed with vendor';
COMMENT ON COLUMN vendors.contract_date IS 'Date when contract was signed';
COMMENT ON COLUMN vendors.deposit_paid IS 'Whether deposit has been paid';
COMMENT ON COLUMN vendors.payment_status IS 'Payment status: pending, paid, or overdue';

COMMENT ON COLUMN hotels.booking_confirmed IS 'Whether hotel booking is confirmed';
COMMENT ON COLUMN hotels.checked_in IS 'Whether guest has checked in';
COMMENT ON COLUMN hotels.payment_status IS 'Payment status: pending, paid, or overdue';

COMMENT ON COLUMN gifts.thank_you_sent IS 'Whether thank you note has been sent';
COMMENT ON COLUMN gifts.thank_you_sent_date IS 'Date when thank you note was sent';

COMMENT ON COLUMN events.status IS 'Event status: planned, confirmed, completed, or cancelled';

COMMENT ON COLUMN guests.rsvp_status IS 'RSVP status: pending, accepted, or declined';

COMMENT ON COLUMN budget.vendor_id IS 'Optional reference to vendor for this budget item';
COMMENT ON COLUMN budget.payment_status IS 'Payment status: pending, paid, or overdue';
COMMENT ON COLUMN budget.payment_date IS 'Date when payment was made';

COMMENT ON COLUMN timeline.duration_minutes IS 'Duration of timeline item in minutes';

COMMENT ON COLUMN documents.tags IS 'Array of tags for document categorization';

-- ============================================================================
-- INDEXES - Add for better query performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_vendors_payment_status ON vendors(payment_status);
CREATE INDEX IF NOT EXISTS idx_vendors_contract_signed ON vendors(contract_signed);

CREATE INDEX IF NOT EXISTS idx_hotels_booking_confirmed ON hotels(booking_confirmed);
CREATE INDEX IF NOT EXISTS idx_hotels_checked_in ON hotels(checked_in);
CREATE INDEX IF NOT EXISTS idx_hotels_payment_status ON hotels(payment_status);

CREATE INDEX IF NOT EXISTS idx_gifts_thank_you_sent ON gifts(thank_you_sent);

CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

CREATE INDEX IF NOT EXISTS idx_guests_rsvp_status ON guests(rsvp_status);

CREATE INDEX IF NOT EXISTS idx_budget_vendor_id ON budget(vendor_id);
CREATE INDEX IF NOT EXISTS idx_budget_payment_status ON budget(payment_status);

CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags);
