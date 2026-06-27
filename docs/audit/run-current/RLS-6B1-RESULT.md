# RLS-6B.1 RESULT — inert schema + policies (implemented, awaiting review)

> Branch: `audit/rls-backstop` (stacked on `audit/bulletproof`; PR #2 not merged).
> Validated against the live test DB `weddingflo_test @ 127.0.0.1:5433`.
> **Additive + inert: app/CI still connect as superuser `postgres` → RLS is bypassed →
> zero behavior change.** NOT pushed, no PR opened — awaiting review. Skills loaded: all 5.

## Migration list (2 new, both hand-authored custom SQL, journaled like 0030)
- **`0035_ensure_app_role.sql`** — idempotent re-assert of the non-superuser `weddingflo_app`
  role: `NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION`, CONNECT + USAGE +
  DML on all current tables/sequences + default privileges for future tables. **No password
  in the migration** (set out-of-band before the 6B.3 cutover). 0022 already created the role;
  this makes the posture explicit and covers tables added since 0022. Does NOT switch any
  `DATABASE_URL`.
- **`0036_rls_backstop_policies.sql`** — adds `tenant_isolation` (FOR ALL, USING + WITH CHECK,
  `super_admin` bypass) to **every** previously-unpoliced tenant table. Reuses the existing
  `current_company_id()` / `is_super_admin()` helpers (0023). Idempotent
  (`DROP POLICY IF EXISTS` / create-only-if-missing for direct tables / existence-guarded loop).

## Policy form: B2 for ALL child tables, B1 for NONE (decision + rationale)
The user's rule was "DEFAULT B2; B1 only for genuinely hot tables, and only with a derive-on-write
**trigger**." In 6B.1 **every** child table uses **B2 (parent-join, no schema change)**; **zero**
tables use B1. Why B1 was used for none **in this inert PR**:
1. **A B1 trigger is NOT inert.** An INSERT/UPDATE trigger fires on every write *even under
   superuser* — that is a real runtime behavior change + new failure surface, which violates the
   "additive + inert, zero behavior change" contract of 6B.1. A B2 policy is genuinely inert
   (superuser bypasses RLS entirely).
2. **Hotness is unmeasurable while RLS is bypassed.** No policy is evaluated yet, so there is no
   evidence to justify denormalization now.
3. **Smallest reversible diff** (5 files, SQL only, no columns/backfill/NOT NULL/triggers).
- **B1 candidates flagged for 6B.3** (when enforcement is live + hotness measurable): the
  seating/floor-plan children (`floor_plan_guests`, `floor_plan_tables`, `seating_versions`,
  `seating_change_log`), `guest_preferences`, `gift_items`. If the parent-join EXISTS shows up
  in 6B.3 plans, denormalize `company_id` + a derive-on-write trigger then.

### Join-type correctness
Most ids are TEXT; five parents are UUID (`hotels`, `document_signature_requests`,
`questionnaires`, `workflows`, `workflow_executions`) with TEXT child FKs. The B2 loop casts
`::text` on BOTH sides **only when the parent.id and child.fk types differ**, so the common
TEXT=TEXT joins stay index-friendly. (Caught via a rolled-back dry-run: `operator does not
exist: uuid = text` on `hotel_bookings → hotels`; drizzle-kit had swallowed the error.)

## Coverage (49 policies added) — verified on the live DB
- **Section A — direct `company_id`, Form A (2):** `document_signature_requests`,
  `document_signature_templates` (RLS was OFF; now `ENABLE`+`FORCE`+policy). The plan guessed 4;
  the live DB showed `api_keys` + `integration_connections` were already covered by `0031`.
- **Section B — single-hop parent-join, B2 (45):** 18 → `clients`, 1 → `guests`, 1 → `gifts`,
  4 → `floor_plans`, 1 → `budget`, 1 → `events`, 1 → `hotels`, 1 → `questionnaires`,
  1 → `workflows`, 1 → `workflow_executions`, 3 → `document_signature_requests`, 2 → `vendors`,
  10 → `"user"`.
- **Section C — two-hop parent-join, B2 (2):** `refunds → payments → clients`,
  `website_builder_content → website_builder_pages → clients`.
- **Tables with policy: 45 → 94.**

### Gates (all green)
- `drizzle-kit check` → "Everything's fine".
- `drizzle-kit generate` (plain) → "No schema changes" (confirms schema-inert; B2 adds no columns).
- **0024 §4 catch-all** (company_id col but no policy) → **0 rows (EMPTY)** ✓.
- **Broad sweep** (any base table with no policy, minus the documented allowlist) → **EMPTY** ✓.
- **Full audit suite** (`vitest.audit.config.ts`, superuser) → **23 files / 81 passed** (was 80;
  +1 is environment noise, not a regression) → inertness proven.
- `tsc --noEmit` → **0**.
- eslint: the pre-existing whole-repo husky debt (111 errors in `src/components/**`,
  `vitest.setup.ts`, …) is unchanged; **this PR's diff is SQL + migration-meta JSON only (zero
  TS/JS)**, so CI-scoped `npm run lint` (authoritative) is unaffected.
- `user` table's special onboarding policy (`OR company_id IS NULL`) **preserved** (create-only-
  if-missing never clobbers it).

## gifts_enhanced disposition: KEPT (not dropped) + B2 policy + flag
Grep found **62 live references** — a dedicated `gifts-enhanced.router.ts`, active chatbot
read/write (`tool-executor.ts:7098` "Use giftsEnhanced … with fallback to gifts"), and the
clients 23-table cascade delete. Live test seed has 0 rows, but committed code clearly uses it.
Per the task rule ("if any reference/data remains, leave it + parent-join policy + flag") it is
**KEPT** with a `clients`(client_id) B2 policy. **FLAG:** the earlier intent to retire it
(memory: chatbot redirected to canonical `gifts`) is only partially done — a retire-or-keep
decision belongs to a separate cleanup, not this RLS PR.

## Documented excludes (intentionally no tenant policy)
`companies` (tenant root), `session`/`account`/`verification` (BetterAuth), `rate_limit_entries`
(ephemeral), `webhook_events` (provider-wide), `website_builder_layouts` (global templates),
`__drizzle_migrations__` (drizzle meta). **FLAG (out of 6B scope):** `guests_backup` — an ad-hoc
backup table holding tenant data (`client_id`) but NOT a Drizzle pgTable; left untouched, should
be reviewed/dropped separately.

## Nullable-parent FLAGS for 6B.3 (rows with a NULL scoping FK are hidden except super_admin)
`email_logs`, `generated_reports`, `ical_feed_tokens` (each scoped via `client_id`, which is
nullable; `user_id` is an alternate parent). Revisit when enforcement is live.

## Branch / base used
`audit/rls-backstop`, stacked on `audit/bulletproof` (PR #2 still open/unmerged). Migrations
applied + validated on `weddingflo_test @ :5433` only — **not** local dev (`:5432`), **not** prod.
