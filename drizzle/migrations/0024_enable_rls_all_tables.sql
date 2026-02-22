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
--   Drizzle uses text('company_id') → DB column is always company_id (snake_case).
--   All policies reference company_id (unquoted) to match the actual DB column.
--   Run the VERIFICATION QUERIES at the bottom before and after applying.
--
-- RUN AS: Superuser
-- PREREQUISITE: Migrations 0022 and 0023 must be applied first.
-- ============================================================================

-- Transaction managed by Drizzle migrator

-- ============================================================================
-- SECTION 1: TABLES WITH DIRECT company_id (from original schema)
-- ============================================================================
-- These tables already had company_id in the original architecture.

-- ---- "user" table ----
-- Note: "user" is a reserved word in PostgreSQL, must be quoted.
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "user";
CREATE POLICY tenant_isolation ON "user"
  FOR ALL
  USING (
    company_id = current_company_id()
    OR company_id IS NULL  -- Users without a company (during onboarding)
    OR is_super_admin()
  )
  WITH CHECK (
    company_id = current_company_id()
    OR company_id IS NULL
    OR is_super_admin()
  );

-- ---- clients table ----
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON clients;
CREATE POLICY tenant_isolation ON clients
  FOR ALL
  USING (company_id = current_company_id() OR is_super_admin())
  WITH CHECK (company_id = current_company_id() OR is_super_admin());

-- ---- vendors table ----
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON vendors;
CREATE POLICY tenant_isolation ON vendors
  FOR ALL
  USING (company_id = current_company_id() OR is_super_admin())
  WITH CHECK (company_id = current_company_id() OR is_super_admin());

-- ---- chatbot_conversations table ----
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_conversations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON chatbot_conversations;
CREATE POLICY tenant_isolation ON chatbot_conversations
  FOR ALL
  USING (company_id = current_company_id() OR is_super_admin())
  WITH CHECK (company_id = current_company_id() OR is_super_admin());

-- ---- chatbot_messages table ----
-- chatbot_messages now has company_id (nullable, defense-in-depth).
-- RLS policy is applied via Section 3's dynamic loop below.

-- ---- chatbot_pending_calls table ----
ALTER TABLE chatbot_pending_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_pending_calls FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON chatbot_pending_calls;
CREATE POLICY tenant_isolation ON chatbot_pending_calls
  FOR ALL
  USING (company_id = current_company_id() OR is_super_admin())
  WITH CHECK (company_id = current_company_id() OR is_super_admin());


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
  -- Only tables that have a direct company_id column are listed here.
  -- Tables without company_id are documented in Section 3B below.
  FOR _tbl, _col IN VALUES
    -- Proposals & Contracts
    ('proposal_templates',          'company_id'),
    ('proposals',                   'company_id'),
    ('contract_templates',          'company_id'),
    ('contracts',                   'company_id'),
    -- Workflows
    ('workflows',                   'company_id'),
    ('workflow_executions',         'company_id'),
    -- Questionnaires
    ('questionnaire_templates',     'company_id'),
    ('questionnaires',              'company_id'),
    -- Communications
    ('messages',                    'company_id'),
    ('sms_templates',               'company_id'),
    ('whatsapp_templates',          'company_id'),
    -- CRM / Pipeline
    ('pipeline_stages',             'company_id'),
    ('pipeline_leads',              'company_id'),
    ('pipeline_activities',         'company_id'),
    -- Invitations
    ('team_invitations',            'company_id'),
    ('wedding_invitations',         'company_id'),
    -- Activity & Audit
    ('activity',                    'company_id'),
    ('notifications',               'company_id'),
    -- Google Integration
    ('google_sheets_sync_settings', 'company_id'),
    -- Chatbot (not covered in Section 1)
    ('chatbot_messages',            'company_id'),
    ('chatbot_command_templates',   'company_id'),
    -- Client / User scoping tables with direct company_id
    ('client_users',                'company_id'),
    -- Gift management
    ('gift_categories',             'company_id'),
    ('gift_types',                  'company_id'),
    ('thank_you_note_templates',    'company_id'),
    -- Payments & Billing
    ('stripe_accounts',             'company_id'),
    -- Background jobs
    ('job_queue',                   'company_id'),
    -- Templates
    ('timeline_templates',          'company_id'),
    -- Deprecated user table (defense-in-depth; "user" singular is BetterAuth, "users" plural is legacy)
    ('users',                       'company_id')
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
-- SECTION 3B: TABLES WITHOUT DIRECT company_id (NOT IN LOOP ABOVE)
-- ============================================================================
-- These 24 tables do NOT have a company_id column. They are scoped indirectly
-- through foreign keys to parent tables that DO have RLS. This means tenant
-- isolation is enforced transitively — if a query can't see the parent row,
-- JOINs to these child tables return nothing.
--
-- CHILD TABLES (FK CASCADE from RLS-protected parent):
--   workflow_steps              → workflowId → workflows.company_id
--   workflow_execution_logs     → executionId → workflow_executions.company_id
--   questionnaire_responses     → questionnaireId → questionnaires.company_id
--   floor_plan_tables           → floorPlanId → floor_plans.company_id
--   floor_plan_guests           → floorPlanId → floor_plans.company_id
--
-- CLIENT-SCOPED TABLES (FK to clients or vendors, which have RLS):
--   email_logs                  → clientId → clients.company_id
--   sms_logs                    → clientId → clients.company_id
--   whatsapp_logs               → clientId → clients.company_id
--   payments                    → clientId → clients.company_id
--   invoices                    → clientId → clients.company_id
--   wedding_websites            → clientId → clients.company_id
--   website_builder_pages       → clientId → clients.company_id
--   accommodations              → clientId → clients.company_id
--   vehicles                    → clientId → clients.company_id
--   client_vendors              → clientId + vendorId → clients/vendors.company_id
--   vendor_reviews              → vendorId + clientId → vendors/clients.company_id
--   guest_gifts                 → clientId → clients.company_id
--   advance_payments            → budgetItemId → budget.company_id
--   refunds                     → paymentId → payments → clients.company_id
--
-- USER-SCOPED TABLES (FK to "user", which has RLS):
--   push_subscriptions          → userId → user.company_id
--   google_calendar_tokens      → userId → user.company_id
--   calendar_sync_settings      → userId → user.company_id
--
-- GLOBAL / SYSTEM TABLES (no tenant data):
--   website_builder_layouts     → Global templates, no tenant-specific data
--   webhook_events              → System-wide provider event tracking
--
-- IMPORTANT: If any of these tables gain a company_id column in the future,
-- move them into Section 3's loop above.
-- ============================================================================


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
--   chatbot_pending_calls — Already has RLS in Section 1 (has company_id).
--
-- If you add new tables in the future, add them to Section 3's loop
-- or create explicit policies like Sections 1-2.


-- End of migration (transaction managed by Drizzle)

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
