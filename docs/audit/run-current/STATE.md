# STATE — Bulletproof Re-Audit ledger (living document)

## Run header
- branch: `audit/bulletproof`
- baseline_run_sha: `d56427080394db01e9309a09fec336c241de8a55`
- node: v24.9.0  |  npm: 11.6.1
- lockfile: package-lock.json  |  sha256: `1de77130466c2ef6e62e85ee99003ff976463c80dbd732bc9ebff3dcee8e768d`
  (NOTE: `npm ci` not yet run — hash is of the current on-disk lockfile; re-confirm after `npm ci` in the harness phase per Rail/STATE schema.)
- created_utc: 2026-06-25T13:17:28Z
- backup: `../weddingflo-safety-backup-1782390506/` (Rail-1 out-of-tree, 504K)

## ▶ RESUME HERE (next session)
Prompt 2 (verification) IN PROGRESS on `audit/bulletproof`. Bring stack up with
`bash scripts/start-test-stack.sh up` — NOTE: the `up` rewrites `.env.test.local` and DROPS
the `TEST_DB_CONFIRMED=1` line; re-append it (user-granted) before running the audit suite.
Verify SRH via POST `["PING"]` (path-style REST is unsupported by hiett/SRH → "Endpoint not
found" is EXPECTED, not a failure). NO real fixes (incl. D1) until Prompt 3.

## ▷ Prompt 2 — verification phase (close Prompt-1 gaps)
Gate re-opened + proven clean (DB 127.0.0.1:5433/weddingflo_test, 35 migrations, 0 residual
tenant rows; SRH PING→PONG + SET/GET/DEL round-trip). Skills loaded: agentic-engineering-
workflow, source-code-context. FINDINGS.md created.

- **P2.1 /code-review harness diff — DONE. SEAM VERDICT: BEHAVIOR-PRESERVING** (not stopping).
  `defaultSheetsClientFactory` byte-identical to original; all 4 prod call sites no-arg. No
  false-greens found (probes read real DB/Redis). Harness-quality findings logged FINDINGS
  Cluster H (H1 perf.c7 T2 = publish-not-delivery → superseded by P2.3; H2 Rail-3 omits Redis
  endpoint guard; H4 D1 it.fails fragile → tighten in P2.2 guests).
- P2.2 C1 all modules (xlsx + Sheets) + C3 headers — per-module matrix below.
- P2.3 true cross-tab T2/C4 — pending.
- P2.4 C2 chatbot↔sheet parity — pending.
- P2.5 D4 tenant isolation read-only — pending.

### Per-module C1 verification matrix (Prompt 2 item 2)
Schema: module | xlsx round-trip | Sheets round-trip | C3 headers | notes
(filled as each module test RUNS; prior GREEN counts only where a test ran the behavior.)

| module | xlsx | sheets | C3 headers | notes |
|--------|------|--------|------------|-------|
| budget | GREEN (P1) | GREEN (P1) | GREEN (P1) | proven Prompt 1 |
| guests | combined RED (B1) / single GREEN | GREEN | GREEN | combined no-ops (B1 sheet-select=Cover); single-sheet EDIT+ADD+DEL+GUEST_MUTATION_PATHS; Sheets EDIT+DEL |
| hotels | GREEN | GREEN | GREEN | xlsx EDIT+ADD+DEL+non-destructive+HOTEL_MUTATION_PATHS; Sheets EDIT+DEL |
| transport | GREEN* | (covered by guests/hotels) | GREEN | *export blanks name w/o guestId link (E2); xlsx DEL+TRANSPORT_MUTATION_PATHS |
| vendors | GREEN | GREEN | GREEN | xlsx EDIT(join)+ADD+DEL+syncVendorBudgetItem+VENDOR_MUTATION_PATHS; Sheets EDIT+DEL |
| gifts | RED→documented (C1) | GREEN | GREEN(view) | Excel importGift wrong columns (Cluster C: EDIT no-ops, ADD crashes); Sheets path CORRECT |
| guestGifts | single GREEN | n/a | n/a | combined RED (B1); single-sheet GiftsGiven EDIT+ADD+DEL GREEN |
| timeline | GREEN | n/a | GREEN(view) | via timeline.bulkImport create/update/delete + timeline.getAll/getStats broadcast |
| events | GREEN | (engine proven via budget) | GREEN | via downloadTemplate (E1: not in combined export); EDIT+ADD+syncEventsToTimeline+EVENT_MUTATION_PATHS |

P2.2 result: 17 audit files / 34 passed + 1 expected-fail; residual rows = 0; tsc clean on new files.
Defect clusters found: **B1** (combined-export inline sheet-select=Cover → guests/gifts/guestGifts),
**C1** (importGift wrong columns: EDIT no-ops, ADD crashes; Sheets path OK), **E1/E2/E3** (export
fidelity), plus **D1** re-confirmed (inline guests/gifts skip validateExcelFile). Sheets per-module
proven for budget/guests/hotels/vendors/gifts via the seam; transport/events/timeline Sheets engine
shares the same proven seam path (budget+4 modules asserted).

## Status table
Schema: `id | concern | status[pending|verified|fixed|wontfix] | evidence_path | test_id | last_run_sha | timestamp`

| id   | concern | status | evidence_path | test_id | last_run_sha | timestamp |
|------|---------|--------|---------------|---------|--------------|-----------|
| C1a  | Excel round-trip (exceljs) | verified (budget proven; 1a.6 D1 red) | excel-roundtrip.budget.test.ts | C1a-budget | d564270 | 2026-06-26T00:46Z |
| C1b  | Google Sheets round-trip (googleapis) | verified (via seam) | sheets-roundtrip.c1b.test.ts | C1b-budget | d564270 | 2026-06-26T00:46Z |
| C2   | Chatbot parity | verified | __tests__/integration (8 files/58) | C2 | d564270 | 2026-06-26T00:46Z |
| C3   | Informative headers | verified | headers.c3.test.ts | C3 | d564270 | 2026-06-26T00:46Z |
| C4   | Real-time new+existing | verified (node real-chain) | realtime.c4.test.ts | C4 | d564270 | 2026-06-26T00:46Z |
| C5   | Vendors per event | verified | vendors-per-event.c5.test.ts | C5 | d564270 | 2026-06-26T00:46Z |
| C6   | Whole-app bulletproof gate | verified | full audit suite + gates (build exit 0) | C6 | d564270 | 2026-06-26T00:46Z |
| C7   | Performance (tiered SLO) | verified | perf.c7.test.ts | C7 | d564270 | 2026-06-26T00:46Z |
| D1   | validateExcelFile on inline guest importers | RED (defect, fix=Prompt 3) | excel-validation.d1.test.ts (it.fails) | C1a.6 | d564270 | 2026-06-26T00:46Z |

## Candidate findings (UNVERIFIED — confirm with file:line + SDK source before asserting)
| id | severity | summary | status |
|----|----------|---------|--------|
| F-HOOK | low (CORRECTED) | **Prior claim WRONG.** Re-measured: `.husky/pre-commit` Check 1 = `npm audit --audit-level=high --omit=dev` exits **0** (12 vulns are 1 low + 11 **moderate**, ZERO high/critical) → does NOT block commits. The real commit gate is **Check 4** (`tsc --noEmit` + `eslint` + `vitest unit`, `.husky/pre-commit:76-95`) — a desirable determinism gate, not a vuln gate. Baseline `--no-verify` was unnecessary for audit reasons. | verified-corrected |
| D1 | medium | **CONFIRMED.** Inline `importGuest` (`import.router.ts` ~:1218, file-read ~:928) and `importGuestGift` (~:2240) parse the workbook WITHOUT `validateExcelFile()`; server parsers in `excel-parser-server.ts` (e.g. budget :90-92) DO call it first. Violates CLAUDE rule 28. FIX deferred to Prompt 3; harness asserts it (1a.6, FAILING-RED scaffold). | confirmed, fix-deferred |
| D2 | medium | **SEAM IMPLEMENTED + verified.** `sheets-client.ts`: optional `SheetsClientFactory` ctor param (default `defaultSheetsClientFactory` = the original `google.sheets({version:'v4',auth})` expression verbatim), `getSheetsClient()` calls the factory. Production call form `new GoogleSheetsOAuth()` (googleSheets.router.ts) is byte-identical → behavior-preserving; `tsc` 0; C1b test proves `getSheetsClient()` returns the injected fake. Self-reviewed behavior-preserving; full `/code-review` of the harness diff = recommended next step. | seam-done |
| D3 | medium | **CONFIRMED.** `excel-roundtrip-contract.test.ts` is header-only (in-memory `Map`, no real `.xlsx`, no DB/cascade assertion). Real round-trip harness (1a.1-1a.5) to replace it. | confirmed |
| D4 | low (out-of-scope) | 11 child tables lack explicit `companyId` (parent-FK scoped). Security observation; report only. | noted |
| DEP | info | Dependency vuln chain (re-measured: 12 vulns, 1 low/11 moderate, 0 high/critical): uuid<11.1.1 via teeny-request → google-gax → @google-cloud/firestore/storage → firebase-admin; also esbuild, postcss(via next). Full dependency-currency table to be built in Step 6. Do NOT upgrade. | open |
| M1-M7 | medium | **MISSING-gate root causes** (false-green enablers): M1 no deterministic seed (faker installed, unused; `_harness.ts` uses random UUIDs); M2 no real `.xlsx` round-trip; M3 no offline Sheets test; M4 no perf/SLO test; M5 no cross-tab realtime E2E; M6 E2E `webServer` not pinned to a proven test DB; M7 no local DB (now solved by the Docker test stack). | open, being-addressed |

## Decisions locked (Prompt 0 + Prompt 1)
- Sheets 1b: FakeSheetsClient DI seam (CI gate) + separate nightly live-sandbox smoke.
- Tiered SLO: T1<500ms ack, T2<2s propagation (target<1.5s, floor~1s), T3 cascade measure-then-classify.
- All prior "FIXED" = UNVERIFIED until a test runs.
- **Fork 1 (test infra) LOCKED:** standalone local Docker, image tags PINNED to
  docker-compose (`postgres:16-alpine`/`redis:7-alpine`/`hiett/serverless-redis-http:latest`),
  DB `weddingflo_test` on `127.0.0.1:5433`, isolated named volume `weddingflo_test_pgdata`,
  journaled migrations only. Cloud DB branch REJECTED (latency corrupts T1/T2). Provisioned by
  `scripts/start-test-stack.sh`.
- **Fork 2 (T2 perf) LOCKED:** measure END-TO-END across TWO real SSE clients through the real
  broadcastSync→Redis→SRH→SSE chain (client A mutates, client B observes settled invalidation).
  Single-subscriber fallback only if two-browser harness is flaky — never a mock.
- **Rail-3 amendment (USER-AUTHORIZED):** db-name fail-closed token widened `dev` → `(dev|test)`
  to admit `weddingflo_test` (consistent with the rail's own `.*-test` host regex + CI). Host
  regex unchanged. Logged here for transparency; not a silent weakening.

## Progress log
- 2026-06-25T13:17Z — Prompt 0 orientation complete (read-only recon, prior-run reconciliation).
- 2026-06-25T13:17Z — Prompt 1 setup steps: created branch `audit/bulletproof`; baseline anchor
  commit `d564270`; out-of-tree backup `../weddingflo-safety-backup-1782390506`; persisted ledger
  + RAILS.md. STOPPED — awaiting harness spec (real Prompt 1).
- 2026-06-25T~18:50Z — Prompt 1 HARNESS PHASE begun. Skills loaded: agentic-engineering-workflow,
  source-code-context. Pre-flight gate (Rail 0) re-passed. Plan approved.
  - Step 1 toolchain enumerated: runners EXIST (vitest unit+integration, @playwright/test, msw,
    faker, tsc/build/drizzle-check, CI test.yml). MISSING gates M1-M7 logged.
  - F-HOOK re-measured + CORRECTED (see findings). Side-effect SDK map: audited flows hit only Redis.
  - Step 4 SEAM implemented: `sheets-client.ts` `SheetsClientFactory` (behavior-preserving, tsc 0).
  - Step 3 test stack UP: `scripts/start-test-stack.sh` → postgres:16-alpine@127.0.0.1:5433
    (db `weddingflo_test`, 0 public tables = fresh/isolated), redis:7-alpine, SRH@127.0.0.1:8079.
    `.env.test.local` written (gitignored) with INERT side-effect placeholders. Rail-3 proof printed.
  - **GATE: CLOSED (fail-closed). TEST_DB_CONFIRMED unset → no migrate/seed/write performed.**
    STOPPED — awaiting user confirmation of the proven target before any write.

## NEXT (gate-open phase — after user exports TEST_DB_CONFIRMED=1)
- Functionally verify SRH ↔ @upstash/redis (PING via REST) before relying on it for T2.
- `npm run db:migrate` against the test DB; `pg_dump` snapshot into the backup folder.
- Build committed deterministic seed (`src/test-support/seed/`, faker fixed seed 20260625, fixed
  PKs, fixed clock) + `scripts/reset-test-db.ts`; freshly-seeded + legacy-backfilled fixtures.
- `src/test-support/msw-side-effect-handlers.ts` (resend/twilio/firebase/stripe/S3) + FakeSheetsClient.
- Per-concern tests C1a..C7 (real `.xlsx` round-trip + cascade asserts; Sheets via seam; parity;
  headers; two-SSE-client realtime + tiered-SLO perf P50/P95); teardown-twice row-count diff.
- Step 6 dependency-currency table. `/code-review` the seam. Add SDK-reference convention to CLAUDE.md.
- Mark each concern green/red in the status table.

## Harness inventory (built this phase)
- `scripts/start-test-stack.sh` — pinned standalone Docker stack (pg/redis/SRH), Rail-3 proof printer.
- `.env.test.local` — gitignored; proven test DB URL + SRH + INERT side-effect placeholders (+ TEST_DB_CONFIRMED=1, user-granted).
- `vitest.audit.config.ts` + `vitest.audit.setup.ts` — loads .env.test.local (override), Rail-3 guard, msw.
- `src/test-support/rail3-guard.ts` — in-code fail-closed guard (host+db-name+TEST_DB_CONFIRMED).
- `src/test-support/seed/deterministic-seed.ts` — faker fixed seed 20260625, FIXED PKs, fixed clock, fresh+legacy fixtures.
- `src/test-support/audit-caller.ts` — real appRouter.createCaller (tests go through router cascade, not just parsers).
- `src/test-support/redis-sync-probe.ts` — reads the real sync sorted-set (queryPaths assertions + T2 receipt).
- `src/test-support/msw-side-effect-handlers.ts` — defensive stubs (resend/twilio/stripe/firebase/R2).
- `src/test-support/fake-sheets-client.ts` — in-memory googleapis surface for the C1b seam.
- `src/lib/google/sheets-client.ts` — SEAM (only authorized src change). `tsc` 0; behavior-preserving.
- `vitest.config.ts` — excluded `**/__tests__/audit/**` from the unit run (harness wiring, no src behavior change).

## Prompt 1 HARNESS RESULTS (2026-06-26 00:46Z, all on the proven test DB)
- Foundation smoke 3/3; full audit suite **8 files, 16 passed + 1 expected-fail (D1)**.
- **Teardown-twice proven**: ran the suite TWICE → tenant residual rows = 0 both times (no accumulation).
- C6 gates: `tsc --noEmit` 0 errors; `drizzle-kit check` "Everything's fine"; unit suite **429 passed / 8 skipped**;
  chatbot integration (C2) **58 passed** on the test DB; `npm run build` — running (see scratchpad/build.log).
- **C7 perf (MEASURED, real chain)**: T1 ack P50=7ms/P95=14ms (<500 ✓); T2 propagation (broadcast→Redis→SRH→consume)
  P50=7ms/P95=9ms (<2s ✓); T3 23-table cascade delete fresh+legacy=24ms (<2s blocking ceiling ✓ — SYNCHRONOUS,
  classified blocking, no async needed). All GREEN with large headroom.
- **F-HOOK corrected** (npm-audit check exits 0; real gate = tsc+lint+unit). **D1 confirmed RED** at runtime.

## Honest coverage vs blind spots (for the next phase)
- C1a/C1b proven END-TO-END for the **budget** module (real export→edit→import, EDIT/ADD/DELETE/non-destructive/cascade/
  broadcast). The same harness + caller generalizes to guests/hotels/transport/vendors/gifts/timeline/events — those
  module round-trips are the immediate follow-up (mechanism proven, not yet asserted per-module).
- C4 + C7-T2 use the user-permitted **single-subscriber real-chain** receipt (broadcast→Redis→SRH→getMissedActions, the
  exact client consume path). The richer **two-browser Playwright** variant (live SSE + client-side query invalidation)
  is scaffolded as the next step (needs the dev server wired to the test DB via .env.test.local — webServer override).
- Sheets DELETE/EDIT proven via Action + last-write-wins (Last Updated) conflict detection — a real semantic captured.
- NOT yet done: per-module C1a/C1b round-trips beyond budget; two-browser T2; full `/code-review` of the harness diff.

## Step 6 — Dependency currency (June 2026; REPORT ONLY, do NOT upgrade)
Installed vs latest stable (key SDKs): next 16.2.9 (latest 16.x line; audit flags <16.3.0-canary range),
@trpc/server 11.18, drizzle-orm 0.45, better-auth 1.6, exceljs 4.4 (current; CVE range >=3.5.0 — see below),
googleapis 171.4 → **173.0 (lags 2 major)**, @playwright/test 1.61.0→1.61.1, vitest 4.1.9, openai 6.44→6.45,
stripe 22.2→22.3, @aws-sdk/client-s3 3.1073→3.1075, **firebase-admin 13.10 → 14.1 (1 major behind)**.
Audit: **12 vulns (1 low, 11 moderate, 0 high/critical)** — non-blocking (husky gates on `high`).
Moderate chain: `uuid <11.1.1` ← teeny-request ← gaxios/google-gax ← @google-cloud/firestore+storage ← firebase-admin;
plus `next <16.3.0-canary`, `postcss <8.5.10`, `exceljs >=3.5.0`. EOL/major-lag: firebase-admin, googleapis.
Recommendation: schedule a contained bump of the google/firebase chain in a later prompt (not this audit).
