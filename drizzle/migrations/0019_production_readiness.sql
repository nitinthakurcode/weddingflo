-- Production Readiness Migration - February 2026
-- Fixes eventId type mismatches and adds performance indexes

-- ============================================
-- FIX EVENT ID TYPE MISMATCHES
-- ============================================

-- client_vendors.eventId: uuid -> text
ALTER TABLE "client_vendors" ALTER COLUMN "event_id" TYPE text USING event_id::text;

-- budget.eventId: uuid -> text
ALTER TABLE "budget" ALTER COLUMN "event_id" TYPE text USING event_id::text;

-- guest_transport.eventId: uuid -> text
ALTER TABLE "guest_transport" ALTER COLUMN "event_id" TYPE text USING event_id::text;

-- questionnaires.eventId: uuid -> text (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questionnaires' AND column_name = 'event_id') THEN
    ALTER TABLE "questionnaires" ALTER COLUMN "event_id" TYPE text USING event_id::text;
    ALTER TABLE "questionnaires" ALTER COLUMN "client_id" TYPE text USING client_id::text;
  END IF;
END $$;

-- ============================================
-- SOFT DELETE FILTERED INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS clients_active_idx ON clients(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS events_active_idx ON events(client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS timeline_active_idx ON timeline(client_id) WHERE deleted_at IS NULL;

-- ============================================
-- QUERY PATTERN INDEXES
-- ============================================

-- Client query patterns
CREATE INDEX IF NOT EXISTS clients_status_idx ON clients(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS clients_wedding_date_idx ON clients(wedding_date) WHERE deleted_at IS NULL;

-- Event query patterns
CREATE INDEX IF NOT EXISTS events_event_date_idx ON events(event_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS events_status_idx ON events(status) WHERE deleted_at IS NULL;

-- Vendor query patterns
CREATE INDEX IF NOT EXISTS vendors_category_idx ON vendors(category);

-- Budget query patterns
CREATE INDEX IF NOT EXISTS budget_payment_status_idx ON budget(payment_status);
CREATE INDEX IF NOT EXISTS budget_category_idx ON budget(category);

-- Messages query patterns
CREATE INDEX IF NOT EXISTS messages_is_read_idx ON messages(is_read);

-- Activity query patterns
CREATE INDEX IF NOT EXISTS activity_action_idx ON activity(action);

-- Pipeline query patterns
CREATE INDEX IF NOT EXISTS pipeline_leads_priority_idx ON pipeline_leads(priority);
CREATE INDEX IF NOT EXISTS pipeline_leads_status_idx ON pipeline_leads(status);

-- Auth event logging indexes
CREATE INDEX IF NOT EXISTS activity_type_action_idx ON activity(type, action);
CREATE INDEX IF NOT EXISTS activity_user_id_created_idx ON activity(user_id, created_at DESC);

-- ============================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================

-- For filtering by company and status
CREATE INDEX IF NOT EXISTS clients_company_status_idx ON clients(company_id, status) WHERE deleted_at IS NULL;

-- For event date queries by client
CREATE INDEX IF NOT EXISTS events_client_date_idx ON events(client_id, event_date) WHERE deleted_at IS NULL;

-- For guest queries by RSVP status
CREATE INDEX IF NOT EXISTS guests_client_rsvp_idx ON guests(client_id, rsvp_status);

-- For budget tracking by client and payment status
CREATE INDEX IF NOT EXISTS budget_client_payment_idx ON budget(client_id, payment_status);
