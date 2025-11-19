-- =====================================================
-- DOMAIN DNS RECORDS TABLE
-- Session 49: DNS verification for custom domains
-- October 2025 Standards
-- =====================================================

-- Custom domain DNS records (for verification)
CREATE TABLE IF NOT EXISTS domain_dns_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES wedding_websites(id) ON DELETE CASCADE,

  -- DNS Record Information
  record_type TEXT NOT NULL, -- 'TXT', 'CNAME', 'A'
  record_name TEXT NOT NULL, -- _weddingflow.couple.com
  record_value TEXT NOT NULL, -- verification token or IP

  -- Status
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,

  -- Instructions for user
  instructions TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_record_type CHECK (record_type IN ('TXT', 'CNAME', 'A'))
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_domain_dns_records_website_id ON domain_dns_records(website_id);
CREATE INDEX IF NOT EXISTS idx_domain_dns_records_verified ON domain_dns_records(verified) WHERE verified = TRUE;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE domain_dns_records ENABLE ROW LEVEL SECURITY;

-- Companies can manage DNS records for their websites
CREATE POLICY "companies_manage_dns_records"
  ON domain_dns_records
  FOR ALL
  USING (
    website_id IN (
      SELECT id FROM wedding_websites
      WHERE company_id = current_setting('app.current_company_id')::uuid
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Generate DNS verification token
CREATE OR REPLACE FUNCTION generate_dns_verification_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'wf-verify-' || LOWER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 16));
END;
$$;

-- =====================================================
-- TRIGGER FOR AUTO-UPDATE
-- =====================================================

CREATE OR REPLACE FUNCTION update_domain_dns_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER domain_dns_records_updated_at_trigger
  BEFORE UPDATE ON domain_dns_records
  FOR EACH ROW
  EXECUTE FUNCTION update_domain_dns_records_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE domain_dns_records IS 'DNS configuration for custom domains';
COMMENT ON COLUMN domain_dns_records.record_type IS 'Type of DNS record: TXT (verification), CNAME (routing), or A (direct IP)';
COMMENT ON COLUMN domain_dns_records.verified IS 'Whether DNS record has been verified as configured correctly';
