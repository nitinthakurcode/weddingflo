# RLS-PLAN-6B — Row-Level Security fail-closed DB backstop (PLAN ONLY, awaiting approval)

> **Status: READ-ONLY PLAN.** No migration written, no `drizzle-kit` run, no DB touched.
> Branch: `audit/rls-backstop` (cut from `audit/bulletproof` @ `1eca3bd` — PR #2 not yet merged).
> Skills: agentic-engineering-workflow, source-code-context (verified vs installed
> `postgres@3.4.9` + `drizzle-orm@0.45.2` + the real schema), grep-loop-review-workflow,
> service-layer-architecture, code-structure-cleanup.
>
> **Decision required before ANY schema change.** This is a large, outage-capable change; §6
> proposes splitting it into 3 reviewable sub-PRs with the dangerous role-cutover isolated.

---

## 0. Why this phase exists (the gap, restated from evidence)

Cluster S (Prompt 3) closed every cross-tenant IDOR at the **application** layer
(`assertClientAccess`/`assertEntityAccess`/`withinCompanyClients`). The DB has **no
fail-closed backstop**: a future unscoped resolver leaks again with nothing to catch it.

There is already substantial **Phase-2.1 RLS scaffolding on disk**, but it is **NOT
load-bearing**. Three independent facts make today's RLS a no-op:

1. **The app connects as a superuser.** CI/audit stack (`audit.yml:72,100`) and the local
   stack (`scripts/start-test-stack.sh:111`) both use `postgres` (superuser). **Superusers
   bypass ALL RLS** — even `FORCE ROW LEVEL SECURITY`. So policies are never evaluated.
2. **The session GUC is never set on the query path.** `ctx.withTenantScope` exists
   (`src/lib/db/with-tenant-scope.ts`, wired in `context.ts:62`) but is called in only
   **2** places. All **664 `ctx.db.*` call sites** (+ **344 imported-singleton `db.*`
   calls**) run on the raw pooled connection with **no `app.current_company_id`**. If RLS
   were enforced today, `current_company_id()` would return NULL → every policy → **0 rows
   / write rejected → full outage.**
3. **"Transitive FK isolation" was always a myth for direct queries.** `0024` §3B claims 24
   child tables are "isolated transitively through FKs." They are not: RLS only filters the
   table named in the query, never tables reached only by a future JOIN. Migration `0030`
   already discovered this for `client_vendors` (*"direct queries bypass parent RLS"*) and
   retrofitted it. The same hole remains open for the rest of §3B.

**The backstop only becomes real when (2) and (1) flip together** — GUC set on every path
**and** the app demoted to a non-superuser role. Flipping either alone is a no-op (still
superuser) or an outage (enforced but no GUC). This is the atomic-cutover risk in §4/§6.

---

## 1. INVENTORY — every table, direct `company_id` vs parent-FK-only

Parsed all 9 schema files (`schema.ts`, `schema-features.ts`, `-pipeline`, `-proposals`,
`-workflows`, `-questionnaires`, `-chatbot`, `-invitations`, `-esignature`).
**101 `pgTable` declarations / ~98 distinct tables.**

> **Reconciliation of KNOWN_GAPS §4.** §4 said "~33+ companyId-less tables in
> `schema-features.ts` alone (of ~98 total)." Corrected figure: **47 tables carry a direct
> `company_id`; 54 do not** (across ALL schema files). Of the 54, ~7 are global/auth (not
> tenant-scoped). So **~47 tenant-scoped child tables need a policy via parent-FK** (either a
> denormalized `company_id` like `0023`/`0030`, or a parent-join policy).

### 1a. DIRECT `company_id` column — 47 tables (policy = direct comparison)
`activity, api_keys, budget, chatbot_command_templates, chatbot_conversations,
chatbot_messages, chatbot_pending_calls, client_users, client_vendors, clients,
contract_templates, contracts, document_signature_requests, document_signature_templates,
events, floor_plans, gift_categories, gift_types, gifts, google_sheets_sync_settings,
guest_transport, guests, hotels, integration_connections, job_queue, messages,
notifications, pipeline_activities, pipeline_leads, pipeline_stages, proposal_templates,
proposals, questionnaire_templates, questionnaires, sms_templates, stripe_accounts,
team_invitations, thank_you_note_templates, timeline, timeline_templates, user, users,
vendors, wedding_invitations, whatsapp_templates, workflow_executions, workflows`

### 1b. Which DIRECT tables already have a `tenant_isolation` policy (from migrations)
- **`0024` Section 1 (explicit):** `user`, `clients`, `vendors`, `chatbot_conversations`,
  `chatbot_pending_calls`.
- **`0024` Section 2 (denormalized in `0023`, then policy):** `guests`, `events`, `timeline`,
  `budget`, `hotels`, `guest_transport`, `gifts`, `floor_plans`.
- **`0024` Section 3 (DO-loop, "IF column exists"):** `proposal_templates`, `proposals`,
  `contract_templates`, `contracts`, `workflows`, `workflow_executions`,
  `questionnaire_templates`, `questionnaires`, `messages`, `sms_templates`,
  `whatsapp_templates`, `pipeline_stages`, `pipeline_leads`, `pipeline_activities`,
  `team_invitations`, `wedding_invitations`, `activity`, `notifications`,
  `google_sheets_sync_settings`, `chatbot_messages`, `chatbot_command_templates`,
  `client_users`, `gift_categories`, `gift_types`, `thank_you_note_templates`,
  `stripe_accounts`, `job_queue`, `timeline_templates`, `users`.
- **`0030` (separate):** `client_vendors`.
- **Likely MISSING a policy among the 47 (verify on a live DB before writing the migration):**
  `api_keys`, `integration_connections`, `document_signature_requests`,
  `document_signature_templates` — these tables were added **after** `0024`'s hard-coded loop
  (migrations `0031` api_keys/integration_connections; the e-signature tables) and are **not
  in the loop's VALUES list**, so they almost certainly have RLS **disabled** today despite
  having `company_id`. **These are direct-policy quick wins.**

### 1c. NO direct `company_id` — 54 tables, by scoping parent
**Genuinely tenant-scoped child tables (need denormalize OR parent-join policy):**

| table | scoping FK chain → company | proposed policy form |
|-------|----------------------------|----------------------|
| `guest_preferences` | `guest_id → guests.company_id` | denormalize OR join `guests` |
| `gift_items` | `gift_id → gifts.company_id` | denormalize OR join `gifts` |
| `guest_conflicts` | `client_id → clients.company_id` (+guest FKs) | denormalize OR join `clients` |
| `guest_gifts` | `client_id → clients.company_id` | denormalize OR join `clients` |
| `gifts_enhanced` | `client_id → clients.company_id` | denormalize OR join `clients` (⚠ dead table? confirm) |
| `accommodations` | `client_id → clients.company_id` | denormalize OR join |
| `vehicles` | `client_id → clients.company_id` | denormalize OR join |
| `documents` | `client_id → clients.company_id` | denormalize OR join |
| `qr_codes` | `client_id → clients.company_id` | denormalize OR join |
| `creative_jobs` | `client_id → clients.company_id` | denormalize OR join |
| `invoices` | `client_id → clients.company_id` | denormalize OR join |
| `payments` | `client_id → clients.company_id` | denormalize OR join |
| `refunds` | `payment_id → payments → clients.company_id` | denormalize (2-hop) OR nested join |
| `advance_payments` | `budget_item_id → budget.company_id` | denormalize OR join `budget` |
| `sms_logs` | `client_id → clients.company_id` | denormalize OR join |
| `whatsapp_logs` | `client_id → clients.company_id` | denormalize OR join |
| `email_logs` | `client_id → clients.company_id` (user_id nullable) | denormalize OR join |
| `wedding_websites` | `client_id → clients.company_id` | denormalize OR join |
| `website_builder_pages` | `client_id → clients.company_id` | denormalize OR join |
| `website_builder_content` | `page_id → website_builder_pages → clients` | denormalize (2-hop) OR nested join |
| `hotel_bookings` | `hotel_id → hotels.company_id` (+guest) | denormalize OR join `hotels` |
| `calendar_synced_events` | `event_id → events.company_id` | denormalize OR join `events` |
| `floor_plan_tables` | `floor_plan_id → floor_plans.company_id` | denormalize OR join |
| `floor_plan_guests` | `floor_plan_id → floor_plans.company_id` | denormalize OR join |
| `seating_versions` | `floor_plan_id → floor_plans.company_id` | denormalize OR join |
| `seating_change_log` | `user_id` (+floor_plan?) — confirm | denormalize OR join |
| `questionnaire_responses` | `questionnaire_id → questionnaires.company_id` | denormalize OR join |
| `workflow_steps` | `workflow_id → workflows.company_id` | denormalize OR join |
| `workflow_execution_logs` | `execution_id → workflow_executions.company_id` | denormalize OR join |
| `document_signature_fields` | `request_id → document_signature_requests.company_id` | denormalize OR join |
| `document_signers` | `request_id → document_signature_requests.company_id` | denormalize OR join |
| `document_audit_trail` | `request_id → document_signature_requests.company_id` | denormalize OR join |
| `vendor_reviews` | `client_id`/`vendor_id → company_id` | denormalize OR join |
| `vendor_comments` | `vendor_id → vendors.company_id` (+user) | denormalize OR join |
| `team_client_assignments` | `client_id → clients.company_id` | denormalize OR join |
| `generated_reports` | `client_id`/`user_id` | denormalize OR join |
| `scheduled_reports` | `user_id → user.company_id` | denormalize OR join `user` |
| `ical_feed_tokens` | `client_id`/`user_id` | denormalize OR join |

**User-scoped tables (FK → `user.company_id`):** `push_subscriptions`, `push_logs`,
`push_notification_logs`, `push_notification_preferences`, `google_calendar_tokens`,
`calendar_sync_settings`, `sms_preferences`, `email_preferences`, `stripe_connect_accounts`.
→ policy = join `"user"` on `user_id`, OR denormalize `company_id`.

**ORPHANS the prompt named — confirmed parent chains:**
- `gift_items` → `gift_id → gifts` ✅ (gifts has company_id)
- `refunds` → `payment_id → payments → client_id → clients` ✅ (2-hop)
- `guest_preferences` → `guest_id → guests` ✅ (guests has company_id)
- `website_builder_layouts` → **GLOBAL** (PK only, no client/company FK — shared templates).

**GLOBAL / auth / system — EXCLUDE from tenant RLS (document as deliberate):**
`companies` (PK-scoped; super_admin global), `session`, `account`, `verification` (BetterAuth,
userId-scoped), `rate_limit_entries` (UNLOGGED ephemeral), `webhook_events` (provider-wide),
`website_builder_layouts` (global templates). Confirm `gifts_enhanced` is dead (memory says
chatbot was redirected off it) — if dead, drop rather than police.

> **Action item for the migration phase:** run `0024`'s Section-4 catch-all query on a live
> migrated DB to get the authoritative "has company-ish column but no policy" list — the
> static parse above is the design input, the live query is the gate.

---

## 2. CONTEXT-INJECTION DESIGN — set the GUC for all 664 `ctx.db` calls, zero router edits

**Goal:** every tenant query runs with `app.current_company_id` (+ `app.current_role`) set,
without editing 664 call sites. **"No middleware" = no Next.js `proxy.ts`/`middleware.ts`
auth** (CLAUDE rule 15) — a **tRPC procedure middleware is the correct, allowed seam** and is
explicitly *not* what that rule forbids. The plan below states the seam precisely and why the
"only in `createTRPCContext`" framing can't hold a transaction open by itself.

### 2a. Verified facts (source-code-context, installed versions)
- `postgres@3.4.9` exposes **`sql.reserve()`** (`node_modules/postgres/src/index.js:203`) and
  **`sql.begin()`** (`:234`). A reserved connection is itself callable like `sql` and can be
  released back to the pool.
- `drizzle-orm@0.45.2` `PostgresJsDatabase.transaction(fn)` exists
  (`postgres-js/session.d.ts:49`) → emits `BEGIN … COMMIT`. `SET LOCAL` / `set_config(k,v,true)`
  is **transaction-scoped** (auto-cleared on COMMIT/ROLLBACK) — exactly what
  `with-tenant-scope.ts` already does.
- `db` is a **pooled** client (`postgres(conn, { max: 20 })`, `src/lib/db/index.ts:18-28`).
  Pooling is the key constraint: a bare `db.execute(SET …)` then `db.select()` may land on
  **different** pooled connections, so the GUC MUST be set inside the same transaction (or on
  a reserved connection) as the queries that rely on it.

### 2b. Why "set it in `createTRPCContext`" alone does NOT work
`createTRPCContext` returns *before* the procedure runs. `db.transaction(cb)` only keeps the
txn open for the duration of `cb`; the context factory cannot "open a txn and hand back an
open `tx`." So binding `ctx.db` to a live scoped transaction requires a wrapper **around the
procedure execution**, i.e. a tRPC middleware — not the context factory. (A reserved
connection *can* be opened in the factory, but then needs an explicit release hook the fetch
adapter doesn't give us cleanly → leak risk. See 2d.)

### 2c. RECOMMENDED — finish `withTenantScope` as a base-procedure middleware (Pattern C)
One edit in the tRPC base builder (`src/server/trpc/index.ts`), zero router edits:

```
// pseudocode — base middleware applied to public/protected/admin procedures
const tenantScoped = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) return next();                       // unauthenticated: no scope
  return ctx.db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_company_id', ${ctx.companyId ?? ''}, true)`);
    await tx.execute(sql`SELECT set_config('app.current_role',       ${ctx.role}, true)`);
    return next({ ctx: { ...ctx, db: tx } });            // every ctx.db.* now runs inside the scoped txn
  });
});
```

- **Zero router edits:** procedures already use `ctx.db`; they transparently get `tx`.
- **Short-lived txn per procedure** (not a request-wide txn) → no long-held connection across
  SSE/AI calls. With `httpBatchLink`, each *procedure* in the batch gets its own middleware
  invocation → its own txn (good: no shared-rollback surprise between batched calls).
- **Reuses the existing, reviewed `with-tenant-scope.ts` helper** (service-layer: the "how" of
  scoping lives in one module; procedures keep owning the "what").
- **Caveats to design for (call out in the PR):**
  1. Procedures that do their *own* `ctx.db.transaction()` now nest → drizzle emits SAVEPOINTs
     (fine), but verify the heavy ones (clients 23-table cascade, floor-plans which uses raw
     `db` per CLAUDE rule 31).
  2. Read-only procedures now run in a transaction (minor overhead; acceptable).
  3. Procedures that intentionally cross tenants for `super_admin` rely on the
     `is_super_admin()` bypass in the policy — verify `ctx.role` propagates.

### 2d. ALTERNATIVE — AsyncLocalStorage + reserved connection (Pattern B)
`createTRPCContext` does `const conn = await sql.reserve(); await conn\`select set_config(...)\`;
ctx.db = drizzle(conn,{schema})`; release `conn` in a teardown. Closer to the prompt's
"bind in createTRPCContext" wording **but** needs a guaranteed release hook (fetch-adapter
lifecycle) or it leaks a pooled connection per request → pool exhaustion at `max:20`.
**Not recommended** vs Pattern C unless we discover nested-transaction blockers.

### 2e. The 344 imported-singleton `db.*` calls — MUST be handled or it's an outage
**344 call sites use the raw `db` singleton, not `ctx.db`** (background jobs, SSE
`/api/chatbot/stream`, cron, webhooks, `recalcClientStats`, `broadcastSync` producers,
Sheets sync). These run **outside any tRPC context** → no GUC → under enforced RLS they see
**0 rows / writes rejected**. Options (decide in §6):
- **(a) System/service connection that bypasses RLS:** a second pool as a role with
  `BYPASSRLS` (or the migration superuser) for trusted server-side jobs that legitimately act
  across tenants. Cleanest; keeps RLS strict for user paths.
- **(b) Explicit scope in each job:** wrap each job's DB work in `withTenantScope` with the
  company it already knows. More edits; safer least-privilege.
- Likely **a hybrid**: (a) for genuinely cross-tenant infra (webhooks, cron sweeps), (b) for
  per-company jobs (Sheets sync for one client). **This is the single biggest scoping
  decision and the main reason to stage (§6).**

---

## 3. RLS POLICY PLAN — one form per table

Helper functions already exist (`0023`): `current_company_id()`, `current_app_role()`,
`is_super_admin()`. Reuse them. Two policy forms:

**Form A — DIRECT (table has `company_id`):** (the established `0024` pattern)
```
ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;  ALTER TABLE <t> FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON <t> FOR ALL
  USING (company_id = current_company_id() OR is_super_admin())
  WITH CHECK (company_id = current_company_id() OR is_super_admin());
```
Apply to: the **4 direct tables missing a policy** (`api_keys`,
`integration_connections`, `document_signature_requests`, `document_signature_templates`) +
re-confirm all 47 are covered (the `0024` DO-loop silently SKIPs any table not in its VALUES
list, which is exactly how the 4 slipped through).

**Form B — PARENT-FK (no `company_id`):** two sub-options, **pick one consistently**:
- **B1 — Denormalize `company_id` + Form A** (the `0023`/`0030` precedent). Pros: fast (no
  join at query time), simple policy, matches existing code. Cons: backfill + a trigger (or
  app-write discipline) to keep it correct on INSERT. **Recommended for hot-path child tables**
  (guests-adjacent, floor-plan, budget children) for the same perf reason `0023` cited.
- **B2 — Parent-join policy, no schema change.** e.g.
  ```
  CREATE POLICY tenant_isolation ON gift_items FOR ALL
    USING (EXISTS (SELECT 1 FROM gifts g
                   WHERE g.id = gift_items.gift_id
                     AND (g.company_id = current_company_id() OR is_super_admin())));
  ```
  Pros: no column/backfill. Cons: subquery per row-check; 2-hop chains (`refunds`,
  `website_builder_content`) need nested EXISTS. **Recommended for cold/low-volume tables**
  (audit trails, logs, signature children) where the join cost is irrelevant.

**Per-table policy form** = the right-hand column of the §1c table. Net new work:
- **~4** direct-table policies (Form A) — quick wins.
- **~37** tenant-scoped child tables (Form B; split B1 hot / B2 cold per §1c).
- **~9** user-scoped tables (Form B join `"user"`).
- **EXCLUDE** the global/auth set (§1c) — encode as an explicit "no policy, documented" list,
  mirroring `0024` Section 5, so the catch-all audit query has a known allowlist.

Every policy needs `FOR ALL` + both `USING` and `WITH CHECK` so **writes** are fail-closed too
(a cross-tenant INSERT/UPDATE is rejected, not just hidden).

---

## 4. NON-SUPERUSER ROLE + fail-closed test (the atomic, reversible unit)

**Today:** app + CI connect as superuser `postgres` → RLS bypassed → policies never tested.
Scaffolding exists: `0022_create_app_role.sql` creates `weddingflo_app` (non-superuser, DML +
sequence grants + default privileges), and `scripts/init-postgres.sql` has a parallel
`weddingflo_app` create — **but neither is used by `audit.yml` or `start-test-stack.sh`** (both
still use `postgres`). `0022`'s password is the literal `CHANGE_ME_BEFORE_RUNNING`.

**Plan:**
1. **Finish the role** (migration, idempotent): ensure `weddingflo_app` exists, `NOSUPERUSER
   NOBYPASSRLS`, has DML + sequence + default-privilege grants (0022 already does this). Set a
   real password out-of-band (env/secret), never in the migration.
2. **CI audit stack runs the suite as `weddingflo_app`:** add the role create to the stack
   bootstrap, run `db:migrate` as `postgres` (DDL/policies need owner), then point the
   **suite's** `DATABASE_URL` at `weddingflo_app`. This is what finally *exercises* RLS in CI.
   Keep a separate superuser URL for the migrate step only.
3. **Fail-closed regression test** (new `tenant-isolation-rls.*.test.ts`, runs under
   `weddingflo_app`):
   - **No GUC set → 0 rows** (`SELECT` on `clients`/`guests`/each child returns empty; INSERT
     rejected). Proves default-deny.
   - **GUC = tenant A → only A's rows**; tenant B's rows invisible; cross-tenant UPDATE/INSERT
     (`WITH CHECK`) **rejected**.
   - **`super_admin` role GUC → full visibility** (bypass path works).
   - **Direct query on each former-§3B child** (`gift_items`, `refunds`, `guest_preferences`,
     …) is isolated — the exact hole `0030` found, now closed for all of them.
   - Keep the existing app-level `tenant-isolation.d4` 25/25 green **and** add this DB-level
     layer (defense in depth, not a replacement).
4. **ATOMIC CUTOVER (outage risk — ship as ONE reversible unit):** the production app's
   `DATABASE_URL` role flip (`postgres` → `weddingflo_app`) MUST land **in the same release**
   as the §2 context-injection (GUC on every path) **and** the §2e singleton/job strategy.
   - Demote-without-GUC = every query returns 0 rows (total outage).
   - GUC-without-demote = still superuser (no enforcement; safe no-op, fine as an intermediate
     verify step — see §6 staging).
   - **Reversibility:** the flip is a single env var; rollback = point `DATABASE_URL` back to
     the superuser role and redeploy. Policies can stay (they're inert under superuser). Keep
     `weddingflo_app` `NOBYPASSRLS` so it can never silently re-bypass.

---

## 5. MIGRATION APPROACH (PLAN ONLY — nothing generated yet)

Per CLAUDE rules 20–23:
- **`drizzle-kit check` → `drizzle-kit generate` → `drizzle-kit migrate`. NEVER `push`.**
- **Matching Drizzle schema for every raw-SQL object.** Denormalized `company_id` columns
  (Form B1) MUST be added to the Drizzle `pgTable` definitions (rule 22: raw SQL needs matching
  schema) so `drizzle-kit check`/`generate` stays consistent and future `generate` runs don't
  try to drop them. RLS policies / `CREATE POLICY` are not first-class in drizzle-kit 0.45 →
  they live in **custom SQL migration files** (the `0024`/`0030` precedent), hand-authored in
  `drizzle/migrations/` and registered in the journal (the `0030` note documents exactly how an
  out-of-band file was re-journaled — follow that).
- **No `CREATE INDEX CONCURRENTLY`** (rule 23 — migrations run in a txn). The new
  `company_id` indexes use plain `CREATE INDEX IF NOT EXISTS` (as `0023` already does).
- **Idempotent** (`IF NOT EXISTS` / `DROP POLICY IF EXISTS` / backfill `WHERE … IS NULL`) so
  re-runs over the partially-applied `0022–0024/0030` state are safe no-ops.
- **Ordering:** (1) role + grants → (2) denormalize columns + backfill + indexes + matching
  schema → (3) policies on the gap tables → (4) flip CI suite role → (5) tests. DDL/policy
  migrations run as the owner/superuser; only the *suite* connects as `weddingflo_app`.
- **Backfill correctness:** every denormalized `company_id` must be `NOT NULL` only *after*
  backfill verifies zero NULLs (else RLS hides legitimately-NULL rows). Plan a verification
  query gate between backfill and `SET NOT NULL`.

---

## 6. RECOMMENDED STAGING (this is too large for one PR — split it)

Pre-flight (grep-loop): **664 + 344 call sites, ~98 tables, an outage-capable role cutover** →
one PR is unreviewable and unsafe. Propose **3 sequential, individually-revertible PRs**:

- **6B.1 — Schema + policies (additive, inert).** Denormalize `company_id` (Form B1 tables) +
  matching Drizzle schema + backfill + indexes; add policies to the ~50 gap tables;
  finish/journal the role migration. **App stays on superuser → zero behavior change.** Gate:
  `drizzle-kit check`, full audit suite still green (RLS inert), `0024` catch-all query returns
  empty.
- **6B.2 — Context injection, still superuser.** Land the §2c middleware so the GUC is set on
  every path. Still superuser → RLS not enforced, but we prove the txn-wrapping + nesting
  (clients cascade, floor-plans raw `db`) doesn't break anything. Gate: full suite green;
  manual smoke.
- **6B.3 — The atomic cutover.** §2e singleton/job strategy + flip the **CI suite** role to
  `weddingflo_app` + the §4 fail-closed tests (RLS now exercised, must pass) + the prod
  `DATABASE_URL` role flip as the final, single-env-var, reversible step. Gate: new
  `tenant-isolation-rls` suite green under the non-superuser role; app-level `d4` still 25/25.

Each PR is small enough for the grep-loop review; the dangerous change is isolated to 6B.3 and
is one env var to roll back.

---

## 7. OPEN QUESTIONS FOR APPROVAL (before any migration is written)
1. **Staging:** approve the 3-PR split (§6), or want it as one?
2. **Policy form for child tables:** OK with the hybrid (B1 denormalize hot paths / B2
   parent-join cold paths per §1c), or prefer one uniform approach?
3. **Singleton/job strategy (§2e):** approve the hybrid (BYPASSRLS service role for infra +
   explicit `withTenantScope` for per-company jobs)?
4. **`gifts_enhanced`:** confirm dead → drop instead of policing?
5. **Scope of 6B:** RLS backstop only, or also fold in the deferred **intra-tenant authz pass**
   (sms aggregates, `createPaymentIntent`, `addGuestConflict`, `vendors.addReview`, gifts
   `guestId`) from KNOWN_GAPS §1–2? (Recommend: separate, after 6B.)

---

*End of plan. Awaiting approval. No schema/DB changes made; branch `audit/rls-backstop` holds
only this document.*
