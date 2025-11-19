-- Session 53: Calendar Integration System
-- Creates tables for both iCal feed and Google Calendar OAuth

-- Table 1: Google Calendar OAuth tokens (per user)
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE, -- Clerk user ID
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expiry timestamptz NOT NULL,
  scope text NOT NULL,
  calendar_id text, -- Google Calendar ID (primary or custom)
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Table 2: iCal feed tokens (secure private URLs per user)
CREATE TABLE IF NOT EXISTS ical_feed_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE, -- Clerk user ID
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  feed_token text NOT NULL UNIQUE, -- Secure random token for feed URL
  is_active boolean NOT NULL DEFAULT true,
  last_accessed timestamptz,
  access_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Table 3: Calendar sync settings (per user preferences)
CREATE TABLE IF NOT EXISTS calendar_sync_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE, -- Clerk user ID
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Google Calendar OAuth settings
  google_sync_enabled boolean NOT NULL DEFAULT false,
  google_auto_sync boolean NOT NULL DEFAULT true,
  google_sync_events boolean NOT NULL DEFAULT true,
  google_sync_timeline boolean NOT NULL DEFAULT true,

  -- iCal feed settings
  ical_feed_enabled boolean NOT NULL DEFAULT true,
  ical_include_events boolean NOT NULL DEFAULT true,
  ical_include_timeline boolean NOT NULL DEFAULT true,
  ical_include_tasks boolean NOT NULL DEFAULT false,

  -- General settings
  reminder_minutes_before integer DEFAULT 60,
  timezone text DEFAULT 'UTC',

  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Table 4: Synced events mapping (track Google Calendar sync status)
CREATE TABLE IF NOT EXISTS calendar_synced_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id text NOT NULL, -- Clerk user ID who synced

  -- Internal event reference
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Google Calendar reference
  google_event_id text NOT NULL,
  google_calendar_id text NOT NULL,

  -- Sync metadata
  last_synced_at timestamptz NOT NULL DEFAULT NOW(),
  sync_status text NOT NULL DEFAULT 'synced', -- synced, pending, failed
  sync_direction text NOT NULL DEFAULT 'bidirectional', -- to_google, from_google, bidirectional
  error_message text,

  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),

  UNIQUE(event_id, google_calendar_id)
);

-- Indexes for performance
CREATE INDEX idx_google_calendar_tokens_user_id ON google_calendar_tokens(user_id);
CREATE INDEX idx_google_calendar_tokens_company_id ON google_calendar_tokens(company_id);
CREATE INDEX idx_ical_feed_tokens_user_id ON ical_feed_tokens(user_id);
CREATE INDEX idx_ical_feed_tokens_feed_token ON ical_feed_tokens(feed_token);
CREATE INDEX idx_ical_feed_tokens_company_id ON ical_feed_tokens(company_id);
CREATE INDEX idx_calendar_sync_settings_user_id ON calendar_sync_settings(user_id);
CREATE INDEX idx_calendar_sync_settings_company_id ON calendar_sync_settings(company_id);
CREATE INDEX idx_calendar_synced_events_company_id ON calendar_synced_events(company_id);
CREATE INDEX idx_calendar_synced_events_event_id ON calendar_synced_events(event_id);
CREATE INDEX idx_calendar_synced_events_user_id ON calendar_synced_events(user_id);
CREATE INDEX idx_calendar_synced_events_google_event_id ON calendar_synced_events(google_event_id);

-- RLS policies for google_calendar_tokens
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calendar tokens"
  ON google_calendar_tokens FOR SELECT
  USING (user_id = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY "Users can insert own calendar tokens"
  ON google_calendar_tokens FOR INSERT
  WITH CHECK (user_id = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY "Users can update own calendar tokens"
  ON google_calendar_tokens FOR UPDATE
  USING (user_id = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY "Users can delete own calendar tokens"
  ON google_calendar_tokens FOR DELETE
  USING (user_id = (SELECT auth.jwt() ->> 'sub'));

-- RLS policies for ical_feed_tokens
ALTER TABLE ical_feed_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ical tokens"
  ON ical_feed_tokens FOR SELECT
  USING (user_id = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY "Users can insert own ical tokens"
  ON ical_feed_tokens FOR INSERT
  WITH CHECK (user_id = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY "Users can update own ical tokens"
  ON ical_feed_tokens FOR UPDATE
  USING (user_id = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY "Users can delete own ical tokens"
  ON ical_feed_tokens FOR DELETE
  USING (user_id = (SELECT auth.jwt() ->> 'sub'));

-- RLS policies for calendar_sync_settings
ALTER TABLE calendar_sync_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calendar settings"
  ON calendar_sync_settings FOR SELECT
  USING (user_id = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY "Users can insert own calendar settings"
  ON calendar_sync_settings FOR INSERT
  WITH CHECK (user_id = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY "Users can update own calendar settings"
  ON calendar_sync_settings FOR UPDATE
  USING (user_id = (SELECT auth.jwt() ->> 'sub'));

-- RLS policies for calendar_synced_events
ALTER TABLE calendar_synced_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company synced events"
  ON calendar_synced_events FOR SELECT
  USING (company_id::text = (SELECT auth.jwt() -> 'app_metadata' ->> 'company_id'));

CREATE POLICY "Users can insert company synced events"
  ON calendar_synced_events FOR INSERT
  WITH CHECK (company_id::text = (SELECT auth.jwt() -> 'app_metadata' ->> 'company_id'));

CREATE POLICY "Users can update company synced events"
  ON calendar_synced_events FOR UPDATE
  USING (company_id::text = (SELECT auth.jwt() -> 'app_metadata' ->> 'company_id'));

CREATE POLICY "Users can delete company synced events"
  ON calendar_synced_events FOR DELETE
  USING (company_id::text = (SELECT auth.jwt() -> 'app_metadata' ->> 'company_id'));

-- Triggers for updated_at columns
CREATE TRIGGER update_google_calendar_tokens_updated_at
  BEFORE UPDATE ON google_calendar_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ical_feed_tokens_updated_at
  BEFORE UPDATE ON ical_feed_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_sync_settings_updated_at
  BEFORE UPDATE ON calendar_sync_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_synced_events_updated_at
  BEFORE UPDATE ON calendar_synced_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE google_calendar_tokens IS 'OAuth tokens for Google Calendar API integration (per user)';
COMMENT ON TABLE ical_feed_tokens IS 'Secure tokens for private iCal feed URLs (per user)';
COMMENT ON TABLE calendar_sync_settings IS 'User preferences for calendar synchronization';
COMMENT ON TABLE calendar_synced_events IS 'Mapping between internal events and Google Calendar events';
