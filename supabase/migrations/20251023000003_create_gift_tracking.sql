-- =====================================================
-- GIFT TRACKING & MANAGEMENT SYSTEM
-- Registry integration + thank you notes
-- Adapted for WeddingFlow Pro Architecture
-- =====================================================

-- Gift categories (customizable per company)
CREATE TABLE IF NOT EXISTS gift_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Category Information
  name TEXT NOT NULL,
  icon TEXT, -- Emoji or icon name
  color VARCHAR(7) DEFAULT '#4F46E5',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_category_per_company UNIQUE (company_id, name)
);

-- Main gifts table (enhanced from basic gifts table)
CREATE TABLE IF NOT EXISTS gifts_enhanced (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,

  -- Gift Information
  gift_name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES gift_categories(id) ON DELETE SET NULL,

  -- Gift Type
  gift_type TEXT NOT NULL DEFAULT 'physical',
  -- Options: 'physical', 'cash', 'gift_card', 'experience'

  -- Value
  monetary_value NUMERIC(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  estimated_value NUMERIC(10,2), -- For non-cash gifts

  -- Registry Information
  registry_name TEXT, -- 'Amazon', 'Target', 'Zola', etc.
  registry_url TEXT,
  registry_item_id TEXT,

  -- Delivery Status
  delivery_status TEXT NOT NULL DEFAULT 'ordered',
  -- Options: 'ordered', 'shipped', 'delivered', 'returned'
  ordered_date DATE,
  shipped_date DATE,
  received_date DATE,

  -- Receipt & Proof
  receipt_url TEXT, -- Cloudflare R2 URL
  tracking_number TEXT,

  -- Group Gift
  is_group_gift BOOLEAN NOT NULL DEFAULT FALSE,
  group_gift_organizer TEXT,
  group_gift_contributors TEXT[], -- Array of contributor names

  -- Thank You Note Status
  thank_you_sent BOOLEAN NOT NULL DEFAULT FALSE,
  thank_you_sent_date DATE,
  thank_you_note TEXT,
  thank_you_due_date DATE, -- Auto-calculated as received_date + 30 days

  -- Tags
  tags TEXT[],

  -- Notes
  internal_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_gift_type CHECK (
    gift_type IN ('physical', 'cash', 'gift_card', 'experience')
  ),
  CONSTRAINT valid_delivery_status CHECK (
    delivery_status IN ('ordered', 'shipped', 'delivered', 'returned')
  )
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE gift_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE gifts_enhanced ENABLE ROW LEVEL SECURITY;

-- Gift Categories
CREATE POLICY "companies_manage_gift_categories"
  ON gift_categories
  FOR ALL
  USING (company_id = current_setting('app.current_company_id')::uuid);

-- Gifts
CREATE POLICY "companies_manage_gifts"
  ON gifts_enhanced
  FOR ALL
  USING (company_id = current_setting('app.current_company_id')::uuid);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_gift_categories_company_id ON gift_categories(company_id);

CREATE INDEX idx_gifts_enhanced_client_id ON gifts_enhanced(client_id);
CREATE INDEX idx_gifts_enhanced_company_id ON gifts_enhanced(company_id);
CREATE INDEX idx_gifts_enhanced_guest_id ON gifts_enhanced(guest_id) WHERE guest_id IS NOT NULL;
CREATE INDEX idx_gifts_enhanced_category_id ON gifts_enhanced(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_gifts_enhanced_delivery_status ON gifts_enhanced(delivery_status);
CREATE INDEX idx_gifts_enhanced_thank_you_sent ON gifts_enhanced(thank_you_sent) WHERE thank_you_sent = FALSE;
CREATE INDEX idx_gifts_enhanced_thank_you_due ON gifts_enhanced(thank_you_due_date) WHERE thank_you_due_date IS NOT NULL;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_gifts_enhanced_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gifts_enhanced_updated_at_trigger
  BEFORE UPDATE ON gifts_enhanced
  FOR EACH ROW
  EXECUTE FUNCTION update_gifts_enhanced_updated_at();

-- Auto-calculate thank you due date and create reminder
CREATE OR REPLACE FUNCTION set_thank_you_due_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.received_date IS NOT NULL AND (OLD.received_date IS NULL OR NEW.received_date != OLD.received_date) THEN
    NEW.thank_you_due_date := NEW.received_date + INTERVAL '30 days';

    -- Create reminder 7 days before due date
    INSERT INTO thank_you_note_reminders (gift_id, reminder_date)
    VALUES (NEW.id, (NEW.received_date + INTERVAL '23 days')::DATE)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_thank_you_due_date_trigger
  BEFORE INSERT OR UPDATE ON gifts_enhanced
  FOR EACH ROW
  EXECUTE FUNCTION set_thank_you_due_date();

-- =====================================================
-- DEFAULT GIFT CATEGORIES
-- =====================================================

-- Insert default categories for new companies
CREATE OR REPLACE FUNCTION create_default_gift_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO gift_categories (company_id, name, icon, color) VALUES
    (NEW.id, 'Kitchen & Dining', '🍽️', '#10B981'),
    (NEW.id, 'Home Decor', '🏡', '#3B82F6'),
    (NEW.id, 'Cash', '💵', '#F59E0B'),
    (NEW.id, 'Gift Cards', '🎁', '#EC4899'),
    (NEW.id, 'Experiences', '🎭', '#8B5CF6'),
    (NEW.id, 'Other', '📦', '#6B7280');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on companies table for new company creation
CREATE TRIGGER create_default_gift_categories_trigger
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION create_default_gift_categories();

-- =====================================================
-- THANK YOU NOTE TEMPLATES
-- =====================================================

-- Thank you note templates (reusable templates per company)
CREATE TABLE IF NOT EXISTS thank_you_note_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Template Information
  name TEXT NOT NULL,
  template_text TEXT NOT NULL,
  -- Variables supported: {guest_name}, {gift_name}, {couple_names}
  -- Example: "Dear {guest_name}, Thank you for the wonderful {gift_name}..."

  -- Metadata
  is_default BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Thank you note reminders (automated reminders)
CREATE TABLE IF NOT EXISTS thank_you_note_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id UUID NOT NULL REFERENCES gifts_enhanced(id) ON DELETE CASCADE,

  -- Reminder Details
  reminder_date DATE NOT NULL,
  reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_sent_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for templates and reminders
CREATE INDEX idx_thank_you_templates_company_id ON thank_you_note_templates(company_id);
CREATE INDEX idx_thank_you_reminders_gift_id ON thank_you_note_reminders(gift_id);
CREATE INDEX idx_thank_you_reminders_date ON thank_you_note_reminders(reminder_date, reminder_sent) WHERE reminder_sent = FALSE;

-- RLS Policies for templates and reminders
ALTER TABLE thank_you_note_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE thank_you_note_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_manage_templates"
  ON thank_you_note_templates
  FOR ALL
  USING (company_id = current_setting('app.current_company_id')::uuid);

CREATE POLICY "companies_view_reminders"
  ON thank_you_note_reminders
  FOR SELECT
  USING (
    gift_id IN (
      SELECT id FROM gifts_enhanced
      WHERE company_id = current_setting('app.current_company_id')::uuid
    )
  );

-- Trigger for template updated_at
CREATE OR REPLACE FUNCTION update_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER templates_updated_at_trigger
  BEFORE UPDATE ON thank_you_note_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_templates_updated_at();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get thank you notes due soon
CREATE OR REPLACE FUNCTION get_thank_you_notes_due(
  p_company_id UUID,
  p_days_ahead INTEGER DEFAULT 7
)
RETURNS TABLE (
  gift_id UUID,
  gift_name TEXT,
  guest_name TEXT,
  received_date DATE,
  due_date DATE,
  days_until_due INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.gift_name,
    COALESCE(
      gs.first_name || ' ' || gs.last_name,
      g.group_gift_organizer
    ) as guest_name,
    g.received_date,
    g.thank_you_due_date,
    (g.thank_you_due_date - CURRENT_DATE)::INTEGER as days_until_due
  FROM gifts_enhanced g
  LEFT JOIN guests gs ON g.guest_id = gs.id
  WHERE g.company_id = p_company_id
    AND g.thank_you_sent = FALSE
    AND g.received_date IS NOT NULL
    AND g.thank_you_due_date IS NOT NULL
    AND g.thank_you_due_date <= CURRENT_DATE + p_days_ahead
  ORDER BY g.thank_you_due_date ASC;
END;
$$;

-- Get gift statistics for a client
CREATE OR REPLACE FUNCTION get_gift_stats(p_client_id UUID)
RETURNS TABLE (
  total_gifts INTEGER,
  total_value NUMERIC,
  gifts_received INTEGER,
  thank_you_sent INTEGER,
  thank_you_pending INTEGER,
  cash_gifts INTEGER,
  cash_total NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_gifts,
    SUM(COALESCE(monetary_value, estimated_value, 0)) as total_value,
    COUNT(*) FILTER (WHERE delivery_status = 'delivered')::INTEGER as gifts_received,
    COUNT(*) FILTER (WHERE thank_you_sent = TRUE)::INTEGER as thank_you_sent,
    COUNT(*) FILTER (WHERE thank_you_sent = FALSE AND received_date IS NOT NULL)::INTEGER as thank_you_pending,
    COUNT(*) FILTER (WHERE gift_type = 'cash')::INTEGER as cash_gifts,
    SUM(monetary_value) FILTER (WHERE gift_type = 'cash') as cash_total
  FROM gifts_enhanced
  WHERE client_id = p_client_id;
END;
$$;
