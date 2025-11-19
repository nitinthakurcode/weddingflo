-- =====================================================
-- ANALYTICS & EXPORT SYSTEM
-- Session 54: Report generation and scheduling
-- October 2025 Standards
-- =====================================================

-- Export templates (saved configurations)
CREATE TABLE IF NOT EXISTS export_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Template Information
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL,

  -- Configuration (JSON)
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  include_charts BOOLEAN NOT NULL DEFAULT TRUE,
  include_summary BOOLEAN NOT NULL DEFAULT TRUE,

  -- Branding
  company_logo TEXT,
  company_colors JSONB DEFAULT '{"primary": "#4F46E5", "secondary": "#EC4899"}'::jsonb,

  -- Access Control
  created_by UUID NOT NULL REFERENCES users(id),
  is_public BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_report_type CHECK (
    report_type IN ('client_summary', 'guest_analytics', 'budget', 'timeline', 'vendor', 'revenue')
  )
);

-- Generated reports (archive)
CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Report Information
  report_type TEXT NOT NULL,
  report_name TEXT NOT NULL,
  file_format TEXT NOT NULL,

  -- File Storage (Cloudflare R2)
  file_url TEXT NOT NULL,
  file_size INTEGER,

  -- Filters & Config
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  date_range_start DATE,
  date_range_end DATE,

  -- Generation
  generated_by UUID NOT NULL REFERENCES users(id),
  generation_time_ms INTEGER,

  -- Access
  download_count INTEGER NOT NULL DEFAULT 0,
  last_downloaded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_file_format CHECK (file_format IN ('xlsx', 'pdf', 'csv', 'json'))
);

-- Scheduled reports
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Schedule
  name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  file_format TEXT NOT NULL DEFAULT 'pdf',
  frequency TEXT NOT NULL,
  day_of_week INTEGER,
  day_of_month INTEGER,
  time_of_day TIME NOT NULL DEFAULT '09:00:00',

  -- Configuration
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  filters JSONB DEFAULT '{}'::jsonb,

  -- Recipients
  email_recipients TEXT[] NOT NULL,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,

  -- Timestamps
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_frequency CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  CONSTRAINT valid_day_of_week CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
  CONSTRAINT valid_day_of_month CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31))
);

-- Analytics snapshots (for trending)
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Snapshot Data
  snapshot_date DATE NOT NULL,
  metrics JSONB NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_snapshot_per_day UNIQUE (company_id, snapshot_date)
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE export_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_manage_export_templates"
  ON export_templates FOR ALL
  USING (company_id = current_setting('app.current_company_id')::uuid);

CREATE POLICY "companies_manage_generated_reports"
  ON generated_reports FOR ALL
  USING (company_id = current_setting('app.current_company_id')::uuid);

CREATE POLICY "companies_manage_scheduled_reports"
  ON scheduled_reports FOR ALL
  USING (company_id = current_setting('app.current_company_id')::uuid);

CREATE POLICY "companies_read_analytics_snapshots"
  ON analytics_snapshots FOR SELECT
  USING (company_id = current_setting('app.current_company_id')::uuid);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_export_templates_company_id ON export_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_company_id ON generated_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_created_at ON generated_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_generated_reports_expires_at ON generated_reports(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_company_id ON scheduled_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(next_run_at) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_company_date ON analytics_snapshots(company_id, snapshot_date);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER export_templates_updated_at_trigger
  BEFORE UPDATE ON export_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_updated_at();

CREATE TRIGGER scheduled_reports_updated_at_trigger
  BEFORE UPDATE ON scheduled_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_updated_at();

-- =====================================================
-- CLEANUP: Auto-delete expired reports
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_expired_reports()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM generated_reports
  WHERE expires_at < NOW();
END;
$$;

-- =====================================================
-- ANALYTICS FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION get_company_analytics(
  p_company_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_clients INTEGER,
  active_clients INTEGER,
  total_guests INTEGER,
  total_budget NUMERIC,
  total_paid NUMERIC,
  events_this_month INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT c.id)::INTEGER as total_clients,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('planning', 'confirmed', 'in_progress'))::INTEGER as active_clients,
    COUNT(DISTINCT g.id)::INTEGER as total_guests,
    SUM(COALESCE(b.estimated_cost, 0)) as total_budget,
    SUM(COALESCE(b.paid_amount, 0)) as total_paid,
    COUNT(DISTINCT c.id) FILTER (
      WHERE c.wedding_date >= DATE_TRUNC('month', CURRENT_DATE)
        AND c.wedding_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    )::INTEGER as events_this_month
  FROM clients c
  LEFT JOIN guests g ON c.id = g.client_id
  LEFT JOIN budget b ON c.id = b.client_id
  WHERE c.company_id = p_company_id
    AND (p_start_date IS NULL OR c.created_at::DATE >= p_start_date)
    AND (c.created_at::DATE <= p_end_date);
END;
$$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE export_templates IS 'Saved report configuration templates';
COMMENT ON TABLE generated_reports IS 'Archive of generated reports with download tracking';
COMMENT ON TABLE scheduled_reports IS 'Automated report schedules';
COMMENT ON TABLE analytics_snapshots IS 'Daily snapshots for historical trending';
COMMENT ON FUNCTION get_company_analytics IS 'Get company-wide analytics summary';
