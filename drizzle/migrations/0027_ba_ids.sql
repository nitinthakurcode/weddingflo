-- ============================================================================
-- Migration 0027: Backfill company_id + RLS catch-up
-- ============================================================================
-- PREREQUISITE: Migrations 0024 (RLS) and 0026 (schema-reconciliation) applied.
--
-- THREE PURPOSES:
--   1. Add missing company_id column to chatbot_messages (0014 creates without
--      it, 0026's CREATE TABLE IF NOT EXISTS is a no-op since table exists).
--   2. Backfill NULL company_id from parent tables for RLS coverage.
--   3. Re-apply RLS for tables whose company_id was added in 0026 AFTER
--      migration 0024 ran (0024's DO block skipped them via IF EXISTS).
-- ============================================================================

-- ============================================================================
-- SECTION 1: Add missing columns
-- ============================================================================
-- chatbot_messages was created in 0014 without company_id.
-- 0026's CREATE TABLE IF NOT EXISTS is a no-op (table already exists).
ALTER TABLE chatbot_messages ADD COLUMN IF NOT EXISTS company_id text;
--> statement-breakpoint

-- ============================================================================
-- SECTION 2: Backfill NULL company_id from parent tables
-- ============================================================================

-- Child tables of clients: get company_id from clients
UPDATE guests SET company_id = c.company_id FROM clients c WHERE guests.client_id = c.id AND guests.company_id IS NULL;
--> statement-breakpoint
UPDATE events SET company_id = c.company_id FROM clients c WHERE events.client_id = c.id AND events.company_id IS NULL;
--> statement-breakpoint
UPDATE timeline SET company_id = c.company_id FROM clients c WHERE timeline.client_id = c.id AND timeline.company_id IS NULL;
--> statement-breakpoint
UPDATE budget SET company_id = c.company_id FROM clients c WHERE budget.client_id = c.id AND budget.company_id IS NULL;
--> statement-breakpoint
UPDATE hotels SET company_id = c.company_id FROM clients c WHERE hotels.client_id = c.id AND hotels.company_id IS NULL;
--> statement-breakpoint
UPDATE guest_transport SET company_id = c.company_id FROM clients c WHERE guest_transport.client_id = c.id AND guest_transport.company_id IS NULL;
--> statement-breakpoint
UPDATE gifts SET company_id = c.company_id FROM clients c WHERE gifts.client_id = c.id AND gifts.company_id IS NULL;
--> statement-breakpoint
UPDATE floor_plans SET company_id = c.company_id FROM clients c WHERE floor_plans.client_id = c.id AND floor_plans.company_id IS NULL;
--> statement-breakpoint

-- chatbot_messages: get company_id from chatbot_conversations
UPDATE chatbot_messages SET company_id = cc.company_id FROM chatbot_conversations cc WHERE chatbot_messages.conversation_id = cc.id AND chatbot_messages.company_id IS NULL;
--> statement-breakpoint

-- client_users: get company_id from clients
UPDATE client_users SET company_id = c.company_id FROM clients c WHERE client_users.client_id = c.id AND client_users.company_id IS NULL;
--> statement-breakpoint

-- ============================================================================
-- SECTION 3: RLS catch-up for tables skipped in migration 0024
-- ============================================================================
-- Migration 0024's DO block checks IF EXISTS for each (table, column) pair.
-- These tables had company_id added or were created in 0026, so 0024 skipped them.
-- We re-apply RLS here idempotently (DROP POLICY IF EXISTS + CREATE).

DO $$
DECLARE
  _tbl TEXT;
  _col TEXT;
BEGIN
  FOR _tbl, _col IN VALUES
    ('stripe_accounts',             'company_id'),
    ('messages',                    'company_id'),
    ('google_sheets_sync_settings', 'company_id'),
    ('client_users',                'company_id'),
    ('chatbot_messages',            'company_id'),
    -- Deprecated legacy users table (defense-in-depth)
    ('users',                       'company_id')
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = _tbl
        AND column_name = _col
    ) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', _tbl);
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', _tbl);

      EXECUTE format(
        'DROP POLICY IF EXISTS tenant_isolation ON %I', _tbl
      );

      EXECUTE format(
        'CREATE POLICY tenant_isolation ON %I
           FOR ALL
           USING (%I = current_company_id() OR is_super_admin())
           WITH CHECK (%I = current_company_id() OR is_super_admin())',
        _tbl, _col, _col
      );

      RAISE NOTICE 'RLS catch-up: enabled on table %', _tbl;
    ELSE
      RAISE NOTICE 'RLS catch-up SKIPPED (table/column not found): %.%', _tbl, _col;
    END IF;
  END LOOP;
END
$$;

-- End of migration
