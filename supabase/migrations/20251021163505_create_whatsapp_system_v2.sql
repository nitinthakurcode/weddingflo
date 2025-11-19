-- WhatsApp logs table
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  to_number text NOT NULL,
  from_number text NOT NULL,
  message text NOT NULL,
  template_name text,
  status text NOT NULL DEFAULT 'queued',
  -- Status: queued, sent, delivered, read, failed, undelivered
  twilio_sid text UNIQUE,
  error_code text,
  error_message text,
  media_url text[], -- Array of media URLs
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- WhatsApp templates table (for approved templates)
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  category text NOT NULL, -- MARKETING, UTILITY, AUTHENTICATION
  status text NOT NULL DEFAULT 'pending',
  -- Status: pending, approved, rejected
  template_body text NOT NULL,
  variables text[], -- Array of variable names
  media_type text, -- image, video, document
  header_text text,
  footer_text text,
  button_text text,
  button_url text,
  twilio_content_sid text UNIQUE,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, name, language)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_company_id ON whatsapp_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_client_id ON whatsapp_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON whatsapp_logs(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_twilio_sid ON whatsapp_logs(twilio_sid);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created_at ON whatsapp_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_company_id ON whatsapp_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_status ON whatsapp_templates(status);

-- RLS policies for whatsapp_logs
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own company whatsapp logs" ON whatsapp_logs;
CREATE POLICY "Users can view own company whatsapp logs"
  ON whatsapp_logs FOR SELECT
  USING (company_id::text = (auth.jwt() -> 'app_metadata' ->> 'company_id'));

DROP POLICY IF EXISTS "Users can insert own company whatsapp logs" ON whatsapp_logs;
CREATE POLICY "Users can insert own company whatsapp logs"
  ON whatsapp_logs FOR INSERT
  WITH CHECK (company_id::text = (auth.jwt() -> 'app_metadata' ->> 'company_id'));

DROP POLICY IF EXISTS "Users can update own company whatsapp logs" ON whatsapp_logs;
CREATE POLICY "Users can update own company whatsapp logs"
  ON whatsapp_logs FOR UPDATE
  USING (company_id::text = (auth.jwt() -> 'app_metadata' ->> 'company_id'));

-- RLS policies for whatsapp_templates
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own company whatsapp templates" ON whatsapp_templates;
CREATE POLICY "Users can view own company whatsapp templates"
  ON whatsapp_templates FOR SELECT
  USING (company_id::text = (auth.jwt() -> 'app_metadata' ->> 'company_id'));

DROP POLICY IF EXISTS "Users can insert own company whatsapp templates" ON whatsapp_templates;
CREATE POLICY "Users can insert own company whatsapp templates"
  ON whatsapp_templates FOR INSERT
  WITH CHECK (company_id::text = (auth.jwt() -> 'app_metadata' ->> 'company_id'));

DROP POLICY IF EXISTS "Users can update own company whatsapp templates" ON whatsapp_templates;
CREATE POLICY "Users can update own company whatsapp templates"
  ON whatsapp_templates FOR UPDATE
  USING (company_id::text = (auth.jwt() -> 'app_metadata' ->> 'company_id'));

DROP POLICY IF EXISTS "Users can delete own company whatsapp templates" ON whatsapp_templates;
CREATE POLICY "Users can delete own company whatsapp templates"
  ON whatsapp_templates FOR DELETE
  USING (company_id::text = (auth.jwt() -> 'app_metadata' ->> 'company_id'));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_whatsapp_logs_updated_at ON whatsapp_logs;
CREATE TRIGGER update_whatsapp_logs_updated_at
  BEFORE UPDATE ON whatsapp_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_whatsapp_templates_updated_at ON whatsapp_templates;
CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON whatsapp_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper function: Get WhatsApp statistics
CREATE OR REPLACE FUNCTION get_whatsapp_stats(
  p_company_id uuid,
  p_days int DEFAULT 30
)
RETURNS TABLE (
  total_sent bigint,
  delivered bigint,
  read bigint,
  failed bigint,
  delivery_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_sent,
    COUNT(*) FILTER (WHERE status = 'delivered')::bigint as delivered,
    COUNT(*) FILTER (WHERE status = 'read')::bigint as read,
    COUNT(*) FILTER (WHERE status IN ('failed', 'undelivered'))::bigint as failed,
    ROUND(
      (COUNT(*) FILTER (WHERE status IN ('delivered', 'read'))::numeric / NULLIF(COUNT(*), 0)) * 100,
      2
    ) as delivery_rate
  FROM whatsapp_logs
  WHERE company_id = p_company_id
    AND created_at >= NOW() - (p_days || ' days')::interval;
END;
$$ LANGUAGE plpgsql;
