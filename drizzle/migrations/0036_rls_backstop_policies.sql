-- Custom SQL migration file, put your code below! --

-- ============================================================================
-- Migration 0036: RLS fail-closed backstop — close every policy gap (additive, inert)
-- ============================================================================
-- Bulletproof re-audit — Prompt 6B.1. Adds `tenant_isolation` RLS policies to every
-- tenant-scoped table that lacked one, so a future unscoped resolver fails CLOSED at
-- the DB instead of leaking. Closes the hole migration 0030 first found ("direct
-- queries bypass parent RLS") for the WHOLE §3B child-table set, not just client_vendors.
--
-- INERT THIS PR: the app + CI still connect as the superuser `postgres`, which BYPASSES
-- all RLS (even FORCE). Enabling RLS + adding policies therefore changes NO runtime
-- behavior now (0024 already did this for 45 tables and the app works). Enforcement
-- happens only after the role cutover in 6B.3.
--
-- POLICY FORM (locked by user): DEFAULT Form B2 (parent-join, NO schema change) for all
-- child tables. Form B1 (denormalized company_id) is intentionally NOT used in 6B.1 —
-- B1 requires an INSERT/UPDATE TRIGGER that fires even under superuser, which is NOT
-- inert, and its perf benefit is unmeasurable while RLS is bypassed. B1 candidates are
-- flagged for 6B.3 (when enforcement is live and hotness is measurable). See the audit
-- ledger for the full B1-vs-B2 rationale.
--
-- Helpers reused (migration 0023): current_company_id(), is_super_admin().
-- super_admin bypasses every policy. Every policy is FOR ALL with BOTH USING and
-- WITH CHECK so cross-tenant WRITES are rejected too, not just hidden.
--
-- Idempotent: re-runnable over the 0022/0023/0024/0030/0031 state. Direct-table gaps
-- are filled create-only-if-missing (so the special `user` onboarding policy, which
-- allows company_id IS NULL, is NEVER clobbered). Child policies use DROP IF EXISTS +
-- CREATE (none has a pre-existing or special policy).
--
-- RUN AS: superuser/owner (Drizzle migrator).
-- ============================================================================


-- ============================================================================
-- SECTION A — DIRECT company_id tables missing a policy (Form A)
-- ============================================================================
-- Live audit found exactly TWO direct tables with a company_id column but no policy
-- (RLS not even enabled): document_signature_requests, document_signature_templates.
-- (api_keys + integration_connections were already covered by 0031.) This loop also
-- future-proofs: any company_id table WITHOUT a tenant_isolation policy gets the
-- standard direct policy. It NEVER touches a table that already has the policy, so the
-- `user` table's special onboarding policy (OR company_id IS NULL) is preserved.
DO $$
DECLARE _tbl TEXT;
BEGIN
  FOR _tbl IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    WHERE c.table_schema = 'public'
      AND c.column_name = 'company_id'
      AND t.table_type = 'BASE TABLE'
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public' AND p.tablename = c.table_name
          AND p.policyname = 'tenant_isolation'
      )
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', _tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', _tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I FOR ALL '
      'USING (company_id = current_company_id() OR is_super_admin()) '
      'WITH CHECK (company_id = current_company_id() OR is_super_admin())',
      _tbl
    );
    RAISE NOTICE '[6B.1][A] direct policy added: %', _tbl;
  END LOOP;
END
$$;


-- ============================================================================
-- SECTION B — CHILD tables, single-hop parent-join (Form B2)
-- ============================================================================
-- Each child row is visible iff its parent row (which carries company_id) is visible.
-- Guard: only act when the child table + fk column + parent.company_id all exist.
-- super_admin bypasses regardless of parent existence.
-- NOTE on the join cast: most ids are TEXT, but a few parents use UUID (hotels,
-- document_signature_requests, questionnaires, workflows, workflow_executions) while
-- their child FKs are TEXT. To keep the common TEXT=TEXT joins index-friendly we cast
-- to ::text ONLY when the parent.id and child.fk types actually differ. (Index/plan
-- tuning under live enforcement is a 6B.3 concern; RLS is bypassed under superuser now.)
DO $$
DECLARE _tbl TEXT; _fk TEXT; _parent TEXT; _ptype TEXT; _ctype TEXT; _join TEXT;
BEGIN
  FOR _tbl, _fk, _parent IN VALUES
    -- → clients.company_id (fk = client_id)
    ('accommodations','client_id','clients'),
    ('creative_jobs','client_id','clients'),
    ('documents','client_id','clients'),
    ('guest_conflicts','client_id','clients'),
    ('guest_gifts','client_id','clients'),
    ('gifts_enhanced','client_id','clients'),          -- FLAG: low-use chatbot gift table, kept (62 code refs); see ledger
    ('invoices','client_id','clients'),
    ('payments','client_id','clients'),
    ('qr_codes','client_id','clients'),
    ('sms_logs','client_id','clients'),
    ('team_client_assignments','client_id','clients'),
    ('vehicles','client_id','clients'),
    ('website_builder_pages','client_id','clients'),
    ('wedding_websites','client_id','clients'),
    ('whatsapp_logs','client_id','clients'),
    ('email_logs','client_id','clients'),              -- FLAG: client_id nullable (system emails); user_id alt — revisit in 6B.3
    ('generated_reports','client_id','clients'),       -- FLAG: client_id nullable; user_id alt — revisit in 6B.3
    ('ical_feed_tokens','client_id','clients'),        -- FLAG: client_id nullable; user_id alt — revisit in 6B.3
    -- → guests.company_id (fk = guest_id)
    ('guest_preferences','guest_id','guests'),
    -- → gifts.company_id (fk = gift_id)
    ('gift_items','gift_id','gifts'),
    -- → floor_plans.company_id (fk = floor_plan_id)
    ('floor_plan_tables','floor_plan_id','floor_plans'),
    ('floor_plan_guests','floor_plan_id','floor_plans'),
    ('seating_versions','floor_plan_id','floor_plans'),
    ('seating_change_log','floor_plan_id','floor_plans'),
    -- → budget.company_id (fk = budget_item_id)
    ('advance_payments','budget_item_id','budget'),
    -- → events.company_id (fk = event_id)
    ('calendar_synced_events','event_id','events'),
    -- → hotels.company_id (fk = hotel_id)
    ('hotel_bookings','hotel_id','hotels'),
    -- → questionnaires.company_id (fk = questionnaire_id)
    ('questionnaire_responses','questionnaire_id','questionnaires'),
    -- → workflows.company_id (fk = workflow_id)
    ('workflow_steps','workflow_id','workflows'),
    -- → workflow_executions.company_id (fk = execution_id)
    ('workflow_execution_logs','execution_id','workflow_executions'),
    -- → document_signature_requests.company_id (fk = request_id) — parent gets its policy in Section A
    ('document_audit_trail','request_id','document_signature_requests'),
    ('document_signature_fields','request_id','document_signature_requests'),
    ('document_signers','request_id','document_signature_requests'),
    -- → vendors.company_id (fk = vendor_id)
    ('vendor_comments','vendor_id','vendors'),
    ('vendor_reviews','vendor_id','vendors'),
    -- → "user".company_id (fk = user_id)  (user is a reserved word; format %I quotes it)
    ('calendar_sync_settings','user_id','user'),
    ('email_preferences','user_id','user'),
    ('google_calendar_tokens','user_id','user'),
    ('push_logs','user_id','user'),
    ('push_notification_logs','user_id','user'),
    ('push_notification_preferences','user_id','user'),
    ('push_subscriptions','user_id','user'),
    ('scheduled_reports','user_id','user'),
    ('sms_preferences','user_id','user'),
    ('stripe_connect_accounts','user_id','user')
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=_tbl)
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_tbl AND column_name=_fk)
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_parent AND column_name='company_id')
    THEN
      SELECT data_type INTO _ptype FROM information_schema.columns
        WHERE table_schema='public' AND table_name=_parent AND column_name='id';
      SELECT data_type INTO _ctype FROM information_schema.columns
        WHERE table_schema='public' AND table_name=_tbl AND column_name=_fk;
      IF _ptype IS DISTINCT FROM _ctype THEN
        _join := format('p.id::text = %I.%I::text', _tbl, _fk);  -- bridge uuid/text mismatch
      ELSE
        _join := format('p.id = %I.%I', _tbl, _fk);              -- same type → index-friendly
      END IF;
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', _tbl);
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', _tbl);
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', _tbl);
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON %1$I FOR ALL '
        'USING (is_super_admin() OR EXISTS (SELECT 1 FROM %2$I p WHERE %3$s AND p.company_id = current_company_id())) '
        'WITH CHECK (is_super_admin() OR EXISTS (SELECT 1 FROM %2$I p WHERE %3$s AND p.company_id = current_company_id()))',
        _tbl, _parent, _join
      );
      RAISE NOTICE '[6B.1][B] parent-join policy added: % -> %(%)', _tbl, _parent, _fk;
    ELSE
      RAISE NOTICE '[6B.1][B] SKIPPED (missing table/fk/parent.company_id): %', _tbl;
    END IF;
  END LOOP;
END
$$;


-- ============================================================================
-- SECTION C — CHILD tables, two-hop parent-join (Form B2, nested EXISTS)
-- ============================================================================
-- refunds: payment_id → payments.client_id → clients.company_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='refunds') THEN
    ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
    ALTER TABLE refunds FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS tenant_isolation ON refunds;
    CREATE POLICY tenant_isolation ON refunds FOR ALL
      USING (is_super_admin() OR EXISTS (
        SELECT 1 FROM payments pay JOIN clients c ON c.id = pay.client_id
        WHERE pay.id = refunds.payment_id AND c.company_id = current_company_id()))
      WITH CHECK (is_super_admin() OR EXISTS (
        SELECT 1 FROM payments pay JOIN clients c ON c.id = pay.client_id
        WHERE pay.id = refunds.payment_id AND c.company_id = current_company_id()));
    RAISE NOTICE '[6B.1][C] 2-hop policy added: refunds -> payments -> clients';
  END IF;
END $$;

-- website_builder_content: page_id → website_builder_pages.client_id → clients.company_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='website_builder_content') THEN
    ALTER TABLE website_builder_content ENABLE ROW LEVEL SECURITY;
    ALTER TABLE website_builder_content FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS tenant_isolation ON website_builder_content;
    CREATE POLICY tenant_isolation ON website_builder_content FOR ALL
      USING (is_super_admin() OR EXISTS (
        SELECT 1 FROM website_builder_pages wbp JOIN clients c ON c.id = wbp.client_id
        WHERE wbp.id = website_builder_content.page_id AND c.company_id = current_company_id()))
      WITH CHECK (is_super_admin() OR EXISTS (
        SELECT 1 FROM website_builder_pages wbp JOIN clients c ON c.id = wbp.client_id
        WHERE wbp.id = website_builder_content.page_id AND c.company_id = current_company_id()));
    RAISE NOTICE '[6B.1][C] 2-hop policy added: website_builder_content -> website_builder_pages -> clients';
  END IF;
END $$;


-- ============================================================================
-- SECTION D — DOCUMENTED EXCLUDES (intentionally NO tenant policy)
-- ============================================================================
-- These base tables have neither a company_id nor a tenant-scoping FK chain, and must
-- stay readable across tenants by design. Listed here so the catch-all audit query has
-- a known allowlist:
--   companies               — the tenant root itself; PK-scoped, super_admin global.
--   session, account, verification — BetterAuth, userId/token-scoped by auth layer.
--   rate_limit_entries      — UNLOGGED ephemeral counters, no tenant data.
--   webhook_events          — provider-wide event log (its event_id is a Stripe/etc.
--                             provider id, NOT a FK to our events table).
--   website_builder_layouts — global, shared page-builder templates (no client/company).
--   __drizzle_migrations__  — Drizzle's own migration ledger (not an app table).
--
-- FLAG (data hygiene, NOT policed here — out of 6B scope): `guests_backup` is an
-- ad-hoc backup table holding tenant data (client_id) but is NOT a Drizzle-managed
-- pgTable, so it cannot get a matching schema object. It should be reviewed/dropped
-- separately; left untouched by this migration.

-- End of migration (transaction managed by Drizzle migrator)