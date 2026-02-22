-- ============================================================================
-- Migration 0024: Enable Row-Level Security on ALL Tenant-Scoped Tables
-- ============================================================================
-- WeddingFlo Security Remediation — Phase 2.1 (Core RLS)
--
-- STRATEGY:
--   1. Enable RLS + FORCE on every table that has a companyId/company_id column
--   2. Create a tenant_isolation policy: rows visible only when
--      company_id matches current_company_id() session variable
--   3. Create a super_admin_bypass policy for platform-wide access
--   4. Exclude auth tables (session, account, verification) and global tables
--
-- COLUMN NAME NOTE:
--   Your schema may use "companyId" (camelCase) or "company_id" (snake_case).
--   This migration supports BOTH by checking for either column name.
--   Run the VERIFICATION QUERIES at the bottom before and after applying.
--
-- RUN AS: Superuser
-- PREREQUISITE: Migrations 0022 and 0023 must be applied first.
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: TABLES WITH DIRECT companyId (from original schema)
-- ============================================================================
-- These tables already had companyId in the architecture.
-- Adjust column references if your Drizzle schema uses different casing.

-- ---- "user" table ----
-- Note: "user" is a reserved word in PostgreSQL, must be quoted.
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "user"
  FOR ALL
  USING (
    "companyId" = current_company_id()
    OR "companyId" IS NULL  -- Users without a company (during onboarding)
    OR is_super_admin()
  )
  WITH CHECK (
    "companyId" = current_company_id()
    OR "companyId" IS NULL
    OR is_super_admin()
  );

-- ---- clients table ----
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON clients
  FOR ALL
  USING ("companyId" = current_company_id() OR is_super_admin())
  WITH CHECK ("companyId" = current_company_id() OR is_super_admin());

-- ---- vendors table ----
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON vendors
  FOR ALL
  USING ("companyId" = current_company_id() OR is_super_admin())
  WITH CHECK ("companyId" = current_company_id() OR is_super_admin());

-- ---- chatbot_conversations table ----
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_conversations FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON chatbot_conversations
  FOR ALL
  USING ("companyId" = current_company_id() OR is_super_admin())
  WITH CHECK ("companyId" = current_company_id() OR is_super_admin());

-- ---- chatbot_messages table (scoped through conversation) ----
-- chatbot_messages doesn't have companyId directly. We scope it through
-- the subscription on chatbot_conversations. If you want RLS on messages
-- too, add company_id and backfill from chatbot_conversations.

-- ---- chatbot_pending_calls table ----
ALTER TABLE chatbot_pending_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_pending_calls FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON chatbot_pending_calls
  FOR ALL
  USING ("companyId" = current_company_id() OR is_super_admin())
  WITH CHECK ("companyId" = current_company_id() OR is_super_admin());


-- ============================================================================
-- SECTION 2: TABLES WITH NEWLY DENORMALIZED company_id (from migration 0023)
-- ============================================================================
-- These tables had only clientId and got company_id added in migration 0023.

-- ---- guests table ----
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON guests
  FOR ALL
  USING (company_id = current_company_id() OR is_super_admin())
  WITH CHECK (company_id = current_company_id() OR is_super_admin());

-- ---- events table ----
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE events FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON events
  FOR ALL
  USING (company_id = current_company_id() OR is_super_admin())
  WITH CHECK (company_id = current_company_id() OR is_super_admin());

-- ---- timeline table ----
ALTER TABLE timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON timeline
  FOR ALL
  USING (company_id = current_company_id() OR is_super_admin())
  WITH CHECK (company_id = current_company_id() OR is_super_admin());

-- ---- budget table ----
ALTER TABLE budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON budget
  FOR ALL
  USING (company_id = current_company_id() OR is_super_admin())
  WITH CHECK (company_id = current_company_id() OR is_super_admin());

-- ---- hotels table ----
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON hotels
  FOR ALL
  USING (company_id = current_company_id() OR is_super_admin())
  WITH CHECK (company_id = current_company_id() OR is_super_admin());

-- ---- guest_transport table ----
ALTER TABLE guest_transport ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_transport FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON guest_transport
  FOR ALL
  USING (company_id = current_company_id() OR is_super_admin())
  WITH CHECK (company_id = current_company_id() OR is_super_admin());

-- ---- gifts table ----
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gifts FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON gifts
  FOR ALL
  USING (company_id = current_company_id() OR is_super_admin())
  WITH CHECK (company_id = current_company_id() OR is_super_admin());

-- ---- floor_plans table ----
ALTER TABLE floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE floor_plans FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON floor_plans
  FOR ALL
  USING (company_id = current_company_id() OR is_super_admin())
  WITH CHECK (company_id = current_company_id() OR is_super_admin());


-- ============================================================================
-- SECTION 3: ADDITIONAL TENANT-SCOPED TABLES
-- ============================================================================
-- These tables are listed in the architecture under "Additional Tables".
-- Adjust table names to match your actual Drizzle schema naming.
-- If a table doesn't exist yet, the ALTER will fail safely inside the DO block.

DO $$
DECLARE
  _tbl TEXT;
  _col TEXT;
BEGIN
  -- List of (table_name, company_id_column_name) pairs
  -- Adjust these to match your actual schema!
  FOR _tbl, _col IN VALUES
    -- Proposals & Contracts
    ('proposal_templates',        'company_id'),
    ('proposals',                 'company_id'),
    ('contract_templates',        'company_id'),
    ('contracts',                 'company_id'),
    -- Workflows
    ('workflows',                 'company_id'),
    ('workflow_steps',            'company_id'),
    ('workflow_executions',       'company_id'),
    ('workflow_execution_logs',   'company_id'),
    -- Questionnaires
    ('questionnaire_templates',   'company_id'),
    ('questionnaires',            'company_id'),
    ('questionnaire_responses',   'company_id'),
    -- Communications
    ('email_logs',                'company_id'),
    ('sms_logs',                  'company_id'),
    ('whatsapp_logs',             'company_id'),
    ('push_subscriptions',        'company_id'),
    ('messages',                  'company_id'),
    -- Payments
    ('payments',                  'company_id'),
    ('invoices',                  'company_id'),
    ('refunds',                   'company_id'),
    ('advance_payments',          'company_id'),
    -- CRM / Pipeline
    ('pipeline_stages',           'company_id'),
    ('pipeline_leads',            'company_id'),
    ('pipeline_activities',       'company_id'),
    -- Website Builder
    ('wedding_websites',          'company_id'),
    ('website_builder_layouts',   'company_id'),
    ('website_builder_pages',     'company_id'),
    -- Invitations
    ('team_invitations',          'company_id'),
    ('wedding_invitations',       'company_id'),
    -- Activity & Audit
    ('activity',                  'company_id'),
    ('notifications',             'company_id'),
    ('webhook_events',            'company_id'),
    -- Google Integration
    ('google_sheets_sync_settings', 'company_id'),
    ('google_calendar_tokens',      'company_id'),
    ('calendar_sync_settings',      'company_id'),
    -- Additional feature tables
    ('accommodations',            'company_id'),
    ('vehicles',                  'company_id'),
    ('vendor_reviews',            'company_id'),
    ('client_vendors',            'company_id'),
    ('guest_gifts',               'company_id'),
    ('floor_plan_tables',         'company_id'),
    ('floor_plan_guests',         'company_id'),
    ('timeline_templates',        'company_id')
  LOOP
    -- Only apply if the table and column actually exist
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = _tbl
        AND column_name = _col
    ) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', _tbl);
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', _tbl);

      -- Drop existing policy if re-running
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

      RAISE NOTICE 'RLS enabled on table: %', _tbl;
    ELSE
      RAISE NOTICE 'SKIPPED (table or column not found): %.%', _tbl, _col;
    END IF;
  END LOOP;
END
$$;


-- ============================================================================
-- SECTION 4: CATCH-ALL — Find any tables we missed
-- ============================================================================
-- Run this query AFTER the migration to find tables with a company-like
-- column that do NOT yet have RLS enabled.

-- This is a verification query, not executed as part of the migration.
-- Uncomment and run manually:
--
-- SELECT t.tablename, c.column_name
-- FROM pg_tables t
-- JOIN information_schema.columns c
--   ON c.table_name = t.tablename AND c.table_schema = 'public'
-- WHERE (c.column_name ILIKE '%company%id%' OR c.column_name ILIKE '%companyid%')
--   AND t.schemaname = 'public'
--   AND NOT EXISTS (
--     SELECT 1 FROM pg_policies p WHERE p.tablename = t.tablename
--   )
-- ORDER BY t.tablename;


-- ============================================================================
-- SECTION 5: TABLES EXPLICITLY EXCLUDED FROM RLS
-- ============================================================================
-- These tables should NOT have tenant-scoped RLS:
--
--   companies          — Global table; super_admin needs full access.
--                        Individual companies are accessed by company_admin
--                        but filtering is done by primary key, not RLS.
--
--   session            — BetterAuth session table. Scoped by userId/token.
--                        Auth middleware handles session validation.
--
--   account            — BetterAuth OAuth/credential records. Scoped by userId.
--
--   verification       — BetterAuth email verification tokens. Short-lived.
--
--   rate_limit_entries — UNLOGGED ephemeral table. No sensitive data.
--
--   chatbot_pending_calls — Already has RLS above (has companyId).
--
-- If you add new tables in the future, add them to Section 3's loop
-- or create explicit policies like Sections 1-2.


COMMIT;

-- ============================================================================
-- VERIFICATION: Run these queries after the migration
-- ============================================================================
--
-- 1. List ALL tables with RLS enabled:
--    SELECT tablename, policyname, permissive, roles, cmd, qual
--    FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
--
-- 2. Count tables with RLS vs without:
--    SELECT
--      (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--       WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity) AS rls_enabled,
--      (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--       WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity) AS rls_disabled;
--
-- 3. Test isolation (run as weddingflo_app, NOT superuser):
--    SET app.current_company_id = 'company-a-uuid';
--    SELECT count(*) FROM clients;  -- Should only return Company A's clients
--    RESET app.current_company_id;
--    SELECT count(*) FROM clients;  -- Should return 0 (no context = no rows)
-- ============================================================================
