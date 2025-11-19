-- =====================================================
-- WEDDING WEBSITES SYSTEM
-- Session 49: Custom Wedding Guest Websites
-- October 2025 Standards
-- =====================================================

-- Main wedding websites table
CREATE TABLE IF NOT EXISTS wedding_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Domain Configuration
  subdomain TEXT UNIQUE NOT NULL,
  custom_domain TEXT UNIQUE,
  custom_domain_verified BOOLEAN NOT NULL DEFAULT FALSE,
  dns_verification_token TEXT,

  -- Website Configuration
  template_id TEXT NOT NULL DEFAULT 'classic',
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  is_password_protected BOOLEAN NOT NULL DEFAULT FALSE,
  password_hash TEXT,

  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  og_image_url TEXT,

  -- Content Sections (JSONB for flexibility)
  hero_section JSONB NOT NULL DEFAULT '{}'::jsonb,
  our_story_section JSONB DEFAULT '{}'::jsonb,
  wedding_party_section JSONB DEFAULT '{}'::jsonb,
  event_details_section JSONB DEFAULT '{}'::jsonb,
  travel_section JSONB DEFAULT '{}'::jsonb,
  registry_section JSONB DEFAULT '{}'::jsonb,
  photo_gallery JSONB DEFAULT '[]'::jsonb,

  -- Customization
  theme_colors JSONB NOT NULL DEFAULT '{"primary": "#4F46E5", "secondary": "#EC4899"}'::jsonb,
  custom_css TEXT,
  fonts JSONB DEFAULT '{"heading": "Playfair Display", "body": "Lato"}'::jsonb,

  -- Features
  enable_rsvp BOOLEAN NOT NULL DEFAULT TRUE,
  enable_photo_upload BOOLEAN NOT NULL DEFAULT TRUE,
  enable_guest_book BOOLEAN NOT NULL DEFAULT TRUE,

  -- Analytics
  view_count INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT subdomain_format CHECK (subdomain ~ '^[a-z0-9-]+$'),
  CONSTRAINT subdomain_length CHECK (LENGTH(subdomain) >= 3 AND LENGTH(subdomain) <= 50)
);

-- Website page visits tracking
CREATE TABLE IF NOT EXISTS website_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES wedding_websites(id) ON DELETE CASCADE,
  visitor_ip TEXT,
  user_agent TEXT,
  referrer TEXT,
  page_path TEXT NOT NULL,
  country_code VARCHAR(2),
  city TEXT,
  session_id TEXT,
  visit_duration INTEGER,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE wedding_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_visits ENABLE ROW LEVEL SECURITY;

-- Companies can manage their own websites
CREATE POLICY "companies_manage_websites"
  ON wedding_websites
  FOR ALL
  USING (company_id = current_setting('app.current_company_id')::uuid);

-- Published websites are publicly readable
CREATE POLICY "public_read_published_websites"
  ON wedding_websites
  FOR SELECT
  USING (is_published = TRUE);

-- Anyone can insert analytics for published websites
CREATE POLICY "public_track_visits"
  ON website_visits
  FOR INSERT
  WITH CHECK (
    website_id IN (SELECT id FROM wedding_websites WHERE is_published = TRUE)
  );

-- Companies can read their website analytics
CREATE POLICY "companies_read_analytics"
  ON website_visits
  FOR SELECT
  USING (
    website_id IN (
      SELECT id FROM wedding_websites
      WHERE company_id = current_setting('app.current_company_id')::uuid
    )
  );

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_wedding_websites_client_id ON wedding_websites(client_id);
CREATE INDEX idx_wedding_websites_company_id ON wedding_websites(company_id);
CREATE INDEX idx_wedding_websites_subdomain ON wedding_websites(subdomain);
CREATE INDEX idx_wedding_websites_custom_domain ON wedding_websites(custom_domain)
  WHERE custom_domain IS NOT NULL;
CREATE INDEX idx_wedding_websites_published ON wedding_websites(is_published)
  WHERE is_published = TRUE;

CREATE INDEX idx_website_visits_website_id ON website_visits(website_id);
CREATE INDEX idx_website_visits_visited_at ON website_visits(visited_at);
CREATE INDEX idx_website_visits_session_id ON website_visits(session_id);

-- =====================================================
-- TRIGGER FOR AUTO-UPDATE
-- =====================================================

CREATE OR REPLACE FUNCTION update_wedding_websites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wedding_websites_updated_at_trigger
  BEFORE UPDATE ON wedding_websites
  FOR EACH ROW
  EXECUTE FUNCTION update_wedding_websites_updated_at();

-- =====================================================
-- HELPER FUNCTION: Generate Unique Subdomain
-- =====================================================

CREATE OR REPLACE FUNCTION generate_unique_subdomain(
  p_partner1_first TEXT,
  p_partner1_last TEXT,
  p_partner2_first TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_base TEXT;
  v_subdomain TEXT;
  v_counter INTEGER := 0;
BEGIN
  -- Create base subdomain
  IF p_partner2_first IS NOT NULL THEN
    v_base := LOWER(p_partner1_first || '-' || p_partner2_first);
  ELSE
    v_base := LOWER(p_partner1_first || '-' || p_partner1_last);
  END IF;

  -- Clean: only alphanumeric and hyphens
  v_base := REGEXP_REPLACE(v_base, '[^a-z0-9-]', '', 'g');

  v_subdomain := v_base;

  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM wedding_websites WHERE subdomain = v_subdomain) LOOP
    v_counter := v_counter + 1;
    v_subdomain := v_base || '-' || v_counter;
  END LOOP;

  RETURN v_subdomain;
END;
$$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE wedding_websites IS 'Wedding guest websites with custom domains';
COMMENT ON COLUMN wedding_websites.subdomain IS 'Free subdomain: john-jane.weddingflow.com';
COMMENT ON COLUMN wedding_websites.custom_domain IS 'Optional custom domain: couple.com ($19.99/year)';
COMMENT ON COLUMN wedding_websites.dns_verification_token IS 'Token for TXT record verification';
COMMENT ON TABLE website_visits IS 'Analytics tracking for website page views';
