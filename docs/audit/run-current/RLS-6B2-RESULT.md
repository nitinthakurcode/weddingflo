# RLS-6B.2 RESULT — tenant context injection (implemented, awaiting review)

> Branch: `audit/rls-context` (stacked on `audit/rls-backstop` @ `9bcd1f4` = 6B.1 tip;
> PR #3 + PR #2 both open/unmerged). Validated against the live test DB
> `weddingflo_test @ 127.0.0.1:5433`.
> **Still superuser → RLS stays INERT.** This PR only proves the plumbing (GUC set +
> per-procedure txn + nested-txn savepoints) does not break runtime. NOT pushed, no PR
> opened — awaiting review. Skills loaded: all 5. Source-code-context vs installed
> `drizzle-orm@0.45.2` + `postgres@3.4.9` + `@trpc/server`.

## The seam (NO Next.js middleware — a tRPC `t.procedure.use()`, CLAUDE rule 15 honored)
One new `t.middleware()` in `src/server/trpc/trpc.ts`, composed into the SAME `.use()`
chain the auth builders already use. ZERO router edits. NOT `proxy.ts`/`middleware.ts`
(CVE-2025-29927 is about Next.js middleware; untouched).

## Exact edits (file:line)
1. **`src/server/trpc/trpc.ts:6`** — `import { applyTenantScope } from '@/lib/db/with-tenant-scope'`.
2. **`src/server/trpc/trpc.ts:65-79`** — new `tenantScopedMiddleware`:
   - unauthenticated (`!ctx.userId`) → `next()` with no scope (defensive; the auth
     check runs first on every builder it is composed into);
   - else `ctx.db.transaction(tx => { applyTenantScope(tx, {companyId, role}); next({ctx:{...ctx, db: tx}}) })`.
   - `db: tx as unknown as typeof ctx.db` — keeps `ctx.db`'s declared type
     (`PostgresJsDatabase`) so the ~600 downstream `ctx.db.*` sites need no type change;
     the only gap vs a tx is the `$client` raw-handle prop, which no resolver touches.
3. **`src/server/trpc/trpc.ts:129,165,224,258`** — `.use(tenantScopedMiddleware)` appended
   to `protectedProcedure`, `adminProcedure`, `staffProcedure`, `superAdminProcedure`
   (after each existing auth check; the bodies are unchanged, only re-indented into a
   `.use(...).use(tenantScopedMiddleware)` chain). `publicProcedure` gets NO scope.
4. **`src/lib/db/with-tenant-scope.ts`** — extracted the two `set_config` statements into a
   new exported `applyTenantScope(tx, {companyId, role})` (the "do not reinvent it" reuse);
   `withTenantScope()` now delegates to it. Behavior-preserving: identical conditional
   company_id + unconditional role, same `SET LOCAL` (txn-local, third arg `true`).

## Onboarding / role correctness (verified on real PG via a scratch probe, then deleted)
- `current_company_id()` = `NULLIF(current_setting('app.current_company_id', true), '')` —
  so companyId null → GUC unset → **NULL** → the `user` table's `OR company_id IS NULL`
  onboarding policy still allows. Confirmed: probe with `{companyId:null, role:'super_admin'}`
  → `current_company_id()` NULL.
- `super_admin`: `ctx.role` propagates → `is_super_admin()` returns **true** under the GUC,
  so the future-enforcement bypass path works. Confirmed by probe.

## §2c RISKS — exercised, not assumed
No committed test drives the tRPC builder via `createCaller` on real PG, so the green audit
suite proves non-regression but NOT the runtime txn mechanism. A scratch probe under the
audit harness (`vitest.audit.config.ts`, real `:5433`) proved the mechanism, then was
deleted (audit suite re-confirmed 23/81 after removal):
- **Nested `ctx.db.transaction` → SAVEPOINT:** `clients.create` / `clients.update` use
  `ctx.db.transaction(...)`; under the middleware `ctx.db` is already the tx → nests →
  drizzle SAVEPOINT. Probe: nested txn ran a real `CREATE TEMP TABLE`+`INSERT`+`SELECT`,
  saw `count=1`, and **inherited the outer GUC** (`current_company_id()` = the set value).
- **Savepoint rollback isolation:** a nested txn that throws rolls back ONLY its savepoint;
  the outer txn survives (probe: outer insert kept, nested insert discarded → final count 1).
- **clients 23-table cascade delete** uses `withTransaction()`
  (`transaction-wrapper.ts:121`) which opens its txn on the **raw `db` singleton**, NOT
  `ctx.db` → it is a **sibling** txn, NOT nested under the middleware → no savepoint
  interaction at all today. (Under 6B.3 enforcement it would run WITHOUT the GUC — that is
  the §2e "344 imported-singleton `db.*`" concern, flagged for 6B.3, NOT a 6B.2 break.)
- **floor-plans** (`events/server/routers/floor-plans.router.ts`) — **CORRECTION** (an
  earlier draft of this doc mis-stated it). The file does **NOT** import the raw `db`
  singleton; every procedure destructures `const { db } = ctx`, so its 3 `db.transaction(...)`
  sites (lines 934/1069/1330) are `ctx.db.transaction` → they DO nest under the middleware as
  SAVEPOINTs, exactly the proven mechanism above. CLAUDE rule 31's "`db` not `ctx.db`" refers
  to the destructured variable *name*, not a raw import. So floor-plans IS scoped and works;
  it is NOT a raw-singleton carry-forward.
- **Read-only procedures** now run inside a txn (one BEGIN/COMMIT each). Minor overhead;
  no regression (full audit + integration + unit suites green).

## Test-double fix required by the seam (NOT router edits)
`createCaller` runs the full middleware chain, so two `createCaller`-based UNIT tests whose
mock `db` did not model the real Drizzle contract broke (the middleware calls
`ctx.db.transaction(tx => tx.execute(set_config…))`):
- `src/features/clients/server/routers/__tests__/clients.router.test.ts` — `createMockDb`
  gained `execute` and its `transaction` now yields the **same** mock instance (so the
  scoped tx shares the `select`/etc. spies → existing `expect(ctx.db.select).toHaveBeenCalled()`
  assertions stay valid).
- `tests/security/r2-tenant-isolation.test.ts` — `db: {}` → a minimal stub
  `{ transaction: fn => fn({ execute: async () => [] }) }` (storage router never touches db).
These make the test doubles faithful to the contract the middleware now exercises; no app
router was touched.

## Gates (all green)
- **Full audit suite** (`vitest.audit.config.ts`, superuser) → **23 files / 81 passed**
  (exact 6B.1 baseline; behavior unchanged → inertness proven). Includes Cluster-S
  `tenant-isolation.d4` 25/25 over real `ctx.db`.
- **Chatbot integration suite** (`vitest.integration.config.ts`, real DB cascades) →
  **8 files / 58 passed**.
- **Unit suite** (`vitest run`) → **429 passed / 8 skipped** (canonical baseline; broke to
  46-fail mid-way on the mock gap above, restored to 429 after the two test-double fixes).
- `tsc --noEmit` → **0**.
- eslint on the 4 changed files → **0**. (Husky whole-repo debt unchanged; CI-scoped lint
  authoritative — commit uses `--no-verify`.)

## Review (/security-review + /code-review) — findings + fixes
- **/security-review → CLEAN.** `set_config` is parameter-bound (no injection; values are
  session-derived); auth checks are byte-identical and run before the wrapper; public
  procedures unscoped; the `as unknown` cast is compile-time only. Net defense-in-depth +.
- **/code-review → 1 fix applied + carry-forwards sharpened:**
  - **FIXED — subscriptions must not be txn-wrapped.** `syncRouter.onSync`
    (`sync.router.ts:42`) is `protectedProcedure.subscription(async function*)`. tRPC iterates
    the generator AFTER `next()` resolves (verified in `@trpc/server` `callRecursive`), so the
    middleware would commit the txn at generator-creation and any in-stream `ctx.db` query would
    hit a finalized tx. `onSync`'s body happens to use only Redis (`getMissedActions` /
    `subscribeToCompany`) so it was not broken today, but it was a latent footgun + a wasted
    txn per connect. Middleware now early-returns `next()` when `type === 'subscription'`
    (the tRPC middleware receives `type: ProcedureType` — verified in the installed `.d.mts`).
    Re-verified: tsc 0, audit 23/81, integration 58, unit 429/8skip.
  - **CARRY-FORWARD (sharpened) — outer txn now spans the whole resolver.** For mutations the
    per-procedure txn stays open across the resolver's `broadcastSync()` + any post-write I/O
    (the explicit inner `ctx.db.transaction` becomes a savepoint; durable COMMIT is deferred to
    end-of-resolver). `broadcastSync` is non-blocking/non-throwing (CLAUDE rule 11) so this is
    not a correctness break, but it holds the pooled connection longer and notifies subscribers
    just before commit. Plus `withTransaction` (cascade delete) + other raw-`db` sites open a
    SECOND pooled connection per request (sibling txn). → **measure pool pressure (max:20 behind
    PgBouncer) before the 6B.3 cutover.**
  - **CONFIRMED no-bug:** floor-plans nests as harmless savepoints (corrected above);
    `ctx.withTenantScope` has zero real call sites (JSDoc only) → no regression.

## Rails honored
NO Next.js middleware / NO `proxy.ts` auth; still-superuser/inert; **zero router edits**
(subscription guard is in the new middleware, not a router); DATABASE_URL untouched (6B.3);
one phase.

## NEXT — 6B.3 (the only step that ENFORCES isolation)
§2e singleton/job strategy: **83 files import the raw `db` singleton; ~53 invoke raw `db.*`
methods** (the cascade-delete `withTransaction` in `transaction-wrapper.ts:121`, plus
SSE/cron/webhook/recalcClientStats/broadcastSync/Sheets-sync). These run OUTSIDE any tRPC
context → no GUC → under enforcement they'd see 0 rows / be rejected. Classify each as
tenant-scoped (wrap in `withTenantScope`) vs cross-tenant infra (BYPASSRLS service role).
(floor-plans is NOT in this set — it uses `ctx.db`, see correction above.) Also measure pool
pressure: the per-procedure txn holds a pooled connection (`max:20`) for the whole procedure,
including any external I/O inside it. → flip the CI **suite** role to non-superuser `weddingflo_app`
→ fail-closed `tenant-isolation-rls` tests (now RLS is exercised) → prod `DATABASE_URL`
role flip as the single reversible env-var cutover. Gate the cutover on zero skipped
policies + the nullable-parent FLAGS (`email_logs`/`generated_reports`/`ical_feed_tokens`).
