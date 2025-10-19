-- =====================================================
-- CREATE MISSING MODULE TABLES AND UPDATE RLS
-- All tables use session claims for RLS
-- =====================================================

-- =====================================================
-- 1. GUESTS TABLE - UPDATE POLICIES (table exists, client-level)
-- =====================================================

DROP POLICY IF EXISTS "Users can view guests in their company" ON guests;
DROP POLICY IF EXISTS "Users can insert guests for their company clients" ON guests;
DROP POLICY IF EXISTS "Users can insert guests in their company" ON guests;
DROP POLICY IF EXISTS "Users can update guests in their company" ON guests;
DROP POLICY IF EXISTS "Users can delete guests in their company" ON guests;

ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view guests in their company"
  ON guests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = guests.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

CREATE POLICY "Users can insert guests for their company clients"
  ON guests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = guests.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

CREATE POLICY "Users can update guests in their company"
  ON guests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = guests.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

CREATE POLICY "Users can delete guests in their company"
  ON guests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = guests.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

-- =====================================================
-- 2. HOTELS TABLE - CREATE (doesn't exist, client-level)
-- =====================================================
CREATE TABLE IF NOT EXISTS hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  hotel_name TEXT,
  room_number TEXT,
  room_type TEXT,
  check_in_date DATE,
  check_out_date DATE,
  accommodation_needed BOOLEAN DEFAULT TRUE,
  booking_confirmed BOOLEAN DEFAULT FALSE,
  checked_in BOOLEAN DEFAULT FALSE,
  cost DECIMAL(10, 2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view hotels in their company"
  ON hotels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = hotels.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

CREATE POLICY "Users can insert hotels for their company clients"
  ON hotels FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = hotels.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

CREATE POLICY "Users can update hotels in their company"
  ON hotels FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = hotels.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

CREATE POLICY "Users can delete hotels in their company"
  ON hotels FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = hotels.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

CREATE INDEX idx_hotels_client_id ON hotels(client_id);
CREATE INDEX idx_hotels_guest_id ON hotels(guest_id);
GRANT ALL ON hotels TO authenticated;

-- =====================================================
-- 3. GIFTS TABLE - CREATE (doesn't exist, client-level)
-- =====================================================
CREATE TABLE IF NOT EXISTS gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  gift_name TEXT NOT NULL,
  from_name TEXT,
  from_email TEXT,
  delivery_date DATE,
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'received', 'returned')),
  thank_you_sent BOOLEAN DEFAULT FALSE,
  thank_you_sent_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view gifts in their company"
  ON gifts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = gifts.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

CREATE POLICY "Users can insert gifts for their company clients"
  ON gifts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = gifts.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

CREATE POLICY "Users can update gifts in their company"
  ON gifts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = gifts.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

CREATE POLICY "Users can delete gifts in their company"
  ON gifts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = gifts.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

CREATE INDEX idx_gifts_client_id ON gifts(client_id);
CREATE INDEX idx_gifts_thank_you_sent ON gifts(thank_you_sent) WHERE thank_you_sent = FALSE;
GRANT ALL ON gifts TO authenticated;

-- =====================================================
-- 4. VENDORS TABLE - UPDATE POLICIES (company-level!)
-- =====================================================

DROP POLICY IF EXISTS "Users can view vendors in their company" ON vendors;
DROP POLICY IF EXISTS "Users can insert vendors for their company clients" ON vendors;
DROP POLICY IF EXISTS "Users can insert vendors in their company" ON vendors;
DROP POLICY IF EXISTS "Users can update vendors in their company" ON vendors;
DROP POLICY IF EXISTS "Users can delete vendors in their company" ON vendors;
DROP POLICY IF EXISTS "Company admins can delete vendors" ON vendors;

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Vendors are company-wide, use company_id directly
CREATE POLICY "Users can view vendors in their company"
  ON vendors FOR SELECT
  TO authenticated
  USING (company_id::text = auth.jwt()->'metadata'->>'company_id');

CREATE POLICY "Users can insert vendors in their company"
  ON vendors FOR INSERT
  TO authenticated
  WITH CHECK (company_id::text = auth.jwt()->'metadata'->>'company_id');

CREATE POLICY "Users can update vendors in their company"
  ON vendors FOR UPDATE
  TO authenticated
  USING (company_id::text = auth.jwt()->'metadata'->>'company_id');

CREATE POLICY "Users can delete vendors in their company"
  ON vendors FOR DELETE
  TO authenticated
  USING (company_id::text = auth.jwt()->'metadata'->>'company_id');

-- =====================================================
-- 5. BUDGET TABLE - UPDATE POLICIES (client-level)
-- =====================================================

DROP POLICY IF EXISTS "Users can view budget in their company" ON budget;
DROP POLICY IF EXISTS "Users can insert budget for their company clients" ON budget;
DROP POLICY IF EXISTS "Users can insert budget in their company" ON budget;
DROP POLICY IF EXISTS "Users can update budget in their company" ON budget;
DROP POLICY IF EXISTS "Users can delete budget in their company" ON budget;

ALTER TABLE budget ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view budget in their company"
  ON budget FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = budget.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

CREATE POLICY "Users can insert budget for their company clients"
  ON budget FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = budget.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

CREATE POLICY "Users can update budget in their company"
  ON budget FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = budget.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

CREATE POLICY "Users can delete budget in their company"
  ON budget FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = budget.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

-- =====================================================
-- 6. EVENTS TABLE - CREATE (doesn't exist, client-level)
-- =====================================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  venue_name TEXT,
  address TEXT,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'confirmed', 'completed', 'cancelled')),
  guest_count INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events in their company"
  ON events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = events.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

CREATE POLICY "Users can insert events for their company clients"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = events.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

CREATE POLICY "Users can update events in their company"
  ON events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = events.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

CREATE POLICY "Users can delete events in their company"
  ON events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = events.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

CREATE INDEX idx_events_client_id ON events(client_id);
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_events_status ON events(status);
GRANT ALL ON events TO authenticated;

-- =====================================================
-- 7. TIMELINE TABLE - UPDATE POLICIES (client-level)
-- =====================================================

DROP POLICY IF EXISTS "Users can view timeline in their company" ON timeline;
DROP POLICY IF EXISTS "Users can insert timeline for their company clients" ON timeline;
DROP POLICY IF EXISTS "Users can insert timeline in their company" ON timeline;
DROP POLICY IF EXISTS "Users can update timeline in their company" ON timeline;
DROP POLICY IF EXISTS "Users can delete timeline in their company" ON timeline;

ALTER TABLE timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view timeline in their company"
  ON timeline FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = timeline.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

CREATE POLICY "Users can insert timeline for their company clients"
  ON timeline FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = timeline.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

CREATE POLICY "Users can update timeline in their company"
  ON timeline FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = timeline.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

CREATE POLICY "Users can delete timeline in their company"
  ON timeline FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = timeline.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

-- =====================================================
-- 8. DOCUMENTS TABLE - UPDATE POLICIES (client-level)
-- =====================================================

DROP POLICY IF EXISTS "Users can view documents in their company" ON documents;
DROP POLICY IF EXISTS "Users can insert documents for their company clients" ON documents;
DROP POLICY IF EXISTS "Users can insert documents in their company" ON documents;
DROP POLICY IF EXISTS "Users can update documents in their company" ON documents;
DROP POLICY IF EXISTS "Users can delete documents in their company" ON documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents in their company"
  ON documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = documents.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

CREATE POLICY "Users can insert documents for their company clients"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = documents.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

CREATE POLICY "Users can update documents in their company"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = documents.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

CREATE POLICY "Users can delete documents in their company"
  ON documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = documents.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );

-- Comments
COMMENT ON TABLE hotels IS 'Hotel accommodation management for guests';
COMMENT ON TABLE gifts IS 'Gift registry and thank you note tracking';
COMMENT ON TABLE events IS 'Event brief and details management';

-- Migration complete - all RLS policies use session claims
