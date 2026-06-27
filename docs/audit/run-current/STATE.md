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
**Prompt 6A.2 — vendors combined-export round-trip data-loss FIXED** on `audit/bulletproof`.
The combined export now feeds per-client `clientVendors`-enriched vendor rows via a shared
`fetchClientVendorExportRows` helper (`src/lib/export/vendor-export-data.ts`), used by BOTH the
combined export AND `downloadTemplate('vendors')` — so the §G.6 per-link columns (Contract
Amount, Service Date, Deposit, Approval, On-Site POC, Deliverables, Event) populate and round-trip
instead of being emitted blank and silently cleared on re-import. The importer's header-presence
non-destructive contract is kept by design (clearing a cell = explicit unassign). New regression
`excel-roundtrip.vendors-combined.test.ts` (3/3, proven RED without the export fix). KNOWN_GAPS §5
vendors → **fixed**. Gates: tsc 0, eslint 0 err, **audit 23 files/81**, Cluster-S IDOR 25/25,
downloadTemplate contract 6/6, integration 58, unit 429/8skip; /code-review (1 stale-comment fix
applied) + /security-review CLEAN. SHA: `__6A2_SHA__`. → **Next is still Prompt 6B** (RLS
fail-closed backstop + CI gate).

### (prior) Prompt 6A.1 — downloadTemplate SSOT-bypass fix + ledger hygiene COMPLETE on `audit/bulletproof`.
`import.router.ts downloadTemplate` no longer authors columns inline for its 6 clean modules
(guests/budget/hotels/transport/guestGifts/events) — they render from `MODULE_SHAPES` via
`buildExportSheet` (guarded by `downloadtemplate-shape-contract.test.ts`, 6/6). `MODULE_SHAPES.events`
gained Action + verbose Status (handbook §G.8b); `MODULE_SHAPES.vendors` expanded to the §G.6 rich
set. vendors + gifts stay inline as documented data-source exceptions (KNOWN_GAPS §5). Ledger fixed:
21 placeholder SHAs → real hashes; Cluster-S per-site map lines re-verified; INVENTORY companyId-less
count corrected (11 reachable-subset → ~33+/~98 real). Gates: tsc 0, eslint 0, **audit 22/78**,
integration 58, unit 429/8skip. → **Next is still Prompt 6B** (RLS fail-closed backstop + CI gate).

### Prompt 6A.1 OUTCOME (downloadTemplate single-source + ledger hygiene) — DONE
Skills: service-layer-architecture (downloadTemplate "how" → shared `buildExportSheet`/`MODULE_SHAPES`),
source-code-context (cited handbook §G.2/§G.6/§G.8b + file:line — export.router:62 global vendors,
excel-parser-server.ts:760 present-blank→unassign), grep-loop-review-workflow.
- **SSOT bypass fixed:** the 6 clean modules route through `buildExportSheet` (downloadTemplate's
  flat rows normalized — `__guest` for hotels, `guestName` for guestGifts — so the SSOT `toCell`
  reads them). guests now emits Side + Checked In (handbook §G.2); events emits verbose Status +
  Action (§G.8b). New `downloadtemplate-shape-contract.test.ts` locks downloadTemplate ≡ MODULE_SHAPES.
- **By-design exceptions (NOT routed):** vendors (per-client `clientVendors` link view vs combined
  export's global `vendors` table — `MODULE_SHAPES.vendors` expanded to §G.6 rich, but the combined
  export's per-link cols are blank + NOT the round-trip path; caveat per the importer's present-blank
  →unassign) and gifts (gift-REGISTRY single sheet vs combined gift-DELIVERY `GiftsGiven`, §G.7
  two-table split). Documented in KNOWN_GAPS §5.
- **Ledger hygiene:** status-table SHAs S=95d83a2 / R(+C2)=f861088 / E=1c01510 / H=3b83ed8 /
  C4+C7=9f68252; Cluster-S per-site map file:line re-verified to current proc-declaration lines;
  INVENTORY + KNOWN_GAPS companyId-less count corrected for the 6B RLS scope.

---

### (prior) Prompt 6A — Re-validation + convergence re-sweep COMPLETE on `audit/bulletproof` (read-only +
docs; NO new fixes). Full suite green + UNWEAKENED; the CONVERGENCE.md falsifiable prediction is
**CONFIRMED (ZERO new Cluster-R + ZERO new Cluster-S instances)** — the repeat-bug loop is CLOSED
for R and S at the application layer. `KNOWN_GAPS.md` written (honest, no false 100%).
→ **Next is Prompt 6B (defense-in-depth lock-in)**: (1) land the Cluster-S **RLS fail-closed DB
backstop** (`app.current_company_id` + RLS policies on the 11 child tables lacking explicit companyId)
deferred from Prompt 3 — needs `drizzle-kit generate`+`migrate` (NEVER push), matching schema, and a
non-superuser test role to actually exercise RLS (the current test role is superuser → RLS bypassed);
(2) wire `vitest.audit.config.ts` into CI on the pinned stack (a contract test that any new importer
bypassing the SSOT / any unscoped resolver breaks the build). Optional follow-up (NOT audit-blocking):
an **intra-tenant authorization pass** for the residuals (sms/payment/addGuestConflict + new O1
`vendors.addReview` + gifts `guestId`). Stack: `bash scripts/start-test-stack.sh up` rewrites
`.env.test.local` and DROPS `TEST_DB_CONFIRMED=1` — re-append before the audit suite.

### Prompt 6A OUTCOME (re-validation + convergence re-sweep) — DONE
Skills: grep-loop-review-workflow (the re-validation loop), source-code-context (cited file:line —
import-cascade/module-shape SSOT exports, client-access helpers, 52-router sweep). Read-only + docs only.
- **Full suite (honest, this session):** tsc 0; eslint 0 errors / 98 warnings (pre-existing); **audit
  21 files / 72 passed**; **integration 58**; **unit 429 passed / 8 skipped**. Per-cluster zero-regression
  re-confirmed: **S** `tenant-isolation.d4` **25/25** (T1–T11 + W1–W8); **R** `excel-roundtrip.*` +
  `excel-validation.d1` + `parity-c2` + `sheets-roundtrip.*`; **E** `module-shape-contract` +
  `excel-roundtrip.{events,transport,gifts}` + `headers-per-module.c3`; **H** `sheets-roundtrip.c1b` +
  `excel-validation.d1` + `perf.c7`.
- **Perf re-measured (real stack):** T1 ack P50 7 / P95 14ms (<500 ✓); T2 publish P50 7 / P95 7ms;
  **T2 true cross-tab delivery P50 306 / P95 310ms** (min 57, max 310) (<2s ✓, <1.5s target ✓);
  T3 23-table cascade fresh+legacy = 22ms (<2s blocking ceiling ✓).
- **CONVERGENCE RE-SWEEP — prediction CONFIRMED, loop CLOSED (R & S):**
  - **Cluster S = 0 NEW.** All 52 `*.router.ts` + analyticsExport + sync swept. Every tenant-table
    access by caller-supplied id routes through `assertClientAccess` (105 sites) / `assertEntityAccess`
    (5) / `withinCompanyClients` (3), OR an inline parent→company ownership check, OR ctx-self-scope.
    Independently spot-verified gifts/hotels guard heads.
  - **Cluster R = 0 NEW.** `importData` → `selectModuleWorksheet`+`validateExcelFile`+`runImportRecalcCascade`;
    all 9 `import*FromSheet` recalc per SSOT; combined exporter builds all 8 module sheets via
    `buildExportSheet` (only non-module `Cover` hand-built). Independently grep-verified.
  - **Noted, NOT counted** (FINDINGS "Prompt 6A re-sweep observations"): O1 `vendors.addReview`
    (within-tenant quirk), O2 `excel-exporter.ts` (separate export-only surface, contract-tested),
    O3 redundant-but-harmless recalc on Sheets hotels/transport.
- **KNOWN_GAPS.md** written: per-concern coverage + the 3 within-tenant residuals, the gifts
  `guestId` intra-tenant observation, the two-browser SSE limitation, and the pending RLS backstop (6B).

### Prompt 3-H OUTCOME (Cluster H — harness hardening) — DONE
Meta-only (test-infra + the in-code Rail-3 guard); NO app/src behavior changed. Skills: grep-loop-
review-workflow (loop), source-code-context (cited file:line for every touched file), service-layer
(considered for the H2 guard — kept the two asserts explicit; see review note). A hardened harness
must be as STRICT as before, never weaker — every change is stricter or honesty-only:
- **H1** (perf/SLO label overstated delivery) — `perf.c7.test.ts` T2 RELABELLED to "publish/enqueue
  latency" + docstring now states broadcastSync is awaited inside the mutation (PUBLISH latency, not
  cross-tab DELIVERY) and points to the authoritative `perf-t2-crosstab.c7.test.ts` for true
  delivery. Assertion (<2s) KEPT as a cheap publish ceiling — not weakened, just honestly named.
- **H2** (Rail-3 guarded only the DB) — `rail3-guard.ts` gains `assertTestRedis()`: asserts
  `UPSTASH_REDIS_REST_URL` host ∈ the same non-prod HOST_RE + `TEST_DB_CONFIRMED`. Wired into
  `vitest.audit.setup.ts` (fails the WHOLE run if the Redis endpoint is prod, same as the DB) AND
  into `redis-sync-probe.ts clearSync` (defense-in-depth at the only destructive DEL). The whole
  test stack (DB + Redis/SRH) is now provably non-prod. A prod `*.upstash.io` host → fail-closed.
- **H3** (loose `/(dev|test)/` substring footgun) — `DBNAME_RE` tightened to bounded-token
  `/(^|[_-])(dev|test)([_-]|$)/`. STRICTER (rejects `latest_prod`, `attestation`, `development`);
  `weddingflo_test` / `*_dev` still authorized (8/8 regex cases verified). Honors the dev→dev|test
  directive; never weaker.
- **H4** (D1 tripwire keyed on ANY throw) — `excel-validation.d1.test.ts` guests+gifts assertions
  tightened from `.rejects.toThrow()` to `.rejects.toThrow(/Missing required column/i)` so an
  unrelated throw (NOT-NULL insert, FORBIDDEN, missing worksheet) can no longer masquerade as
  "D1 fixed". Matches the propagated `validateExcelFile` message (verified green).
- **H5** (non-destructive proof only checked an in-sheet column) — `sheets-roundtrip.c1b.test.ts`
  adds an ABSENT-column preservation assertion: captures `created_at` + `is_per_guest_item` (neither
  is in `BUDGET_HEADERS`) before import and asserts both survive unchanged. `created_at` is a real
  DB-default timestamp the importer cannot recreate → meaningful, not trivially-true.
- **H6** (overstated determinism) — `deterministic-seed.ts` removes the DEAD `faker.seed(FIXED_SEED)`
  (faker was never invoked; all seed values are fixed literals) + the now-unused `@faker-js/faker`
  import and `FIXED_SEED` export; docstring corrected to state determinism is structural (fixed
  literal PKs + FIXED_NOW), not seeded. No determinism change (values were always literals).
- **Gates (all green, unweakened):** tsc 0; eslint 0 errors (2 pre-existing unused-disable warnings,
  unchanged — confirmed on HEAD); **audit 21 files / 72 passed** (was 71; +1 = H5's new absent-column
  assertion runs in the existing it); **Cluster-S IDOR 25/25**; Cluster-R import tests green;
  Cluster-E round-trips green; **integration 58**; **unit 429 / 8 skip**. /code-review on the diff:
  0 correctness bugs, 1 low DRY nit (assertTestDb/assertTestRedis share a host-parse block —
  intentional divergence, db also checks db-name; left per Rail-6 smallest-diff). /security-review
  not required (test-infra only; the change STRENGTHENS the safety guard, no new app surface).

---

### (prior) Prompt 3-E — Cluster E (export/import shape not single-sourced) COMPLETE on `audit/bulletproof`.
E1/E2/E3 + the deferred gifts export shape fixed by a per-module column-SHAPE SSOT
(`src/lib/import/module-shape.ts`: ordered header/key/width/required/formatter per module)
consumed by BOTH the combined exporter (`export-utils.ts` → `buildExportSheet`) AND the import
service (`import-cascade.ts` derives `MODULE_SHEET_NAME` + `INLINE_IMPORT_VALIDATION` from it).
**E1** Events now in the combined export (round-trips via importData('events')). **E2**
`export.router` preserves the stored transport `guestName` (no-guest-link rows no longer blank →
no longer skipped on re-import). **E3 / gifts shape** combined gift sheet reshaped to the
handbook §G.7 gift-DELIVERY shape (`guest_gifts`, sheet `GiftsGiven`, leading ID + required Gift
Name) → round-trips via importData('guestGifts'); the old view-only `Serial #` 'Gifts' sheet is
gone. Timeline combined stays VIEW-ONLY (handbook §G.8 — by design; round-trip path is the
dedicated `exportTimelineExcel`). `downloadTemplate('gifts')` dead-column bug fixed (reads real
`gifts` name/value/status/guestId). Gates: tsc 0, eslint 0, **audit 21 files/71 passed**, unit
429/8skip, integration 58, **Cluster-S IDOR still 25/25**, Cluster-R import tests green,
/code-review (2 fidelity fixes applied: Date cells + raw text-cost, regression-locked),
/security-review CLEAN.
**Next is Cluster H — harness hardening** (H2 Rail-3 Redis-endpoint guard, H3–H6; meta, not app fix).
Cluster S/R NOT re-opened (regressions still green); Cluster H UNTOUCHED this phase.
Bring stack up with `bash scripts/start-test-stack.sh up` — the `up` rewrites `.env.test.local`
and DROPS `TEST_DB_CONFIRMED=1`; re-append it before the audit suite. SRH speaks POST `["PING"]`
(path-style REST → "Endpoint not found" is EXPECTED).

### Prompt 3-E OUTCOME (Cluster E — export/import shape SSOT) — DONE
- **Convergence fix (N→1):** new `src/lib/import/module-shape.ts` (pure, no DB) owns each
  combined-export module's column SHAPE — header label, exceljs key, width, required flag, and the
  export formatter (`toCell`). `buildExportSheet(wb, module, rows)` is the single place a module
  sheet is materialized. `export-utils.ts` lost ~350 lines of duplicated inline sheet-building;
  `import-cascade.ts` now DERIVES `MODULE_SHEET_NAME` + `INLINE_IMPORT_VALIDATION` (guests,
  guestGifts) from the SSOT via `inlineValidationSpec`, so the sheet/required headers it validates
  are provably the labels the exporter writes (no drift). New `module-shape-contract.test.ts`
  asserts both sides consume the SSOT + value-fidelity (Date cells, raw text-cost).
- **Per-finding (test_ids):**
  - **E1** events absent from combined export → added Events sheet from the SSOT (handbook §G.8b).
    `excel-roundtrip.events.test.ts` "FIXED (E1): events are in the combined export and round-trip
    from it (EDIT by ID)".
  - **E2** transport Guest Name derived-then-blanked when guestId null → `export.router` prefers the
    stored `gt.guestName`. `excel-roundtrip.transport.test.ts` "FIXED (E2): a transport row with NO
    guest link keeps its name on export → survives re-import".
  - **E3 / gifts export shape** combined gift sheet reshaped to gift-DELIVERY `GiftsGiven` (ID +
    required Gift Name) round-trippable via importData('guestGifts'); old 'Gifts' Serial-# sheet
    removed. `excel-roundtrip.gifts.test.ts` "FIXED (E3): combined export emits a round-trippable
    GiftsGiven sheet…" + "FIXED (E3): combined-export GiftsGiven round-trips via
    importData(guestGifts) (EDIT by ID)". `downloadTemplate('gifts')` dead `g.giftName` columns →
    real `gifts` columns. C3 per-module test now requires Guests/Hotels/Transport/Vendors/Budget/
    **GiftsGiven**/**Events**/Timeline; Events + GiftsGiven added to the EDITABLE (must mark required
    + example) set.
- **/code-review fixes applied:** the SSOT `pick()`/`s()`/`Number()` formatters changed cell types
  vs the deleted inline code — (1) guest arrival/departure timestamp cells stringified to verbose
  locale text; (2) budget text-cost coerced to Number (type-flip + NaN on non-numeric). Reverted to
  raw passthrough (`raw()` helper) + `|| default` semantics; locked by a contract unit assertion.
- **Deferred (NOT this phase):** Cluster H (harness hardening). Handbook-sync rule deferred per
  Rail-2 (NEVER edit the handbook during the audit). The `gifts`-REGISTRY single-sheet Excel path
  (`importGift`/`downloadTemplate('gifts')` → `gifts` table) is kept distinct from the gift-delivery
  combined sheet per handbook §G.7 "two-table split"; not merged.

### Prompt 3-R OUTCOME (Cluster R — single import service) — DONE
- **Convergence fix (N→1):** new `src/lib/import/import-cascade.ts` owns the parts that drifted:
  `selectModuleWorksheet(wb, module)` picks the module sheet by canonical NAME (kills B1's
  generic find that matched the export 'Cover'); `runImportRecalcCascade(db, module, clientId)`
  is the per-module recalc SSOT (guests/budget→clientStats+perGuestBudget, vendors→clientStats)
  that Excel importData AND the Sheets importers call — so neither can omit a recalc (P1/I1);
  `INLINE_IMPORT_VALIDATION` is the per-module sheet+required-header spec the inline Excel path
  validates via `validateExcelFile` up front (D1, CLAUDE rule 28).
- **Per-finding:**
  - **D1** inline guests/gifts/guestGifts now call `validateExcelFile` first (rejects malformed /
    wrong-sheet / missing name column). test `excel-validation.d1.test.ts` (guests + gifts).
  - **B1** inline path selects the module sheet by name → combined-export guests round-trip
    applies EDIT/DELETE/ADD. test `excel-roundtrip.guests.test.ts`. (gifts/guestGifts combined
    sheets are Cluster-E-shaped (no ID, 'Gift Item') → cleanly REJECTED by validation, not garbage.)
  - **C1** `importGift` rewritten to real columns (name/value/status/guestId), typed via
    `$inferInsert` (wrong column = compile error), name-match on `g.name` (no crash), non-destructive
    update, +companyId. test `excel-roundtrip.gifts.test.ts`.
  - **P1** Sheets `importGuestsFromSheet` now runs the full recalc cascade (per-guest budget no
    longer stale). test `parity-chatbot-vs-sheet.c2.test.ts` (sheet recalcs to 100×partySize=200).
  - **I1** Sheets `importVendorsFromSheet` now recalcs client stats. test
    `sheets-roundtrip.modules.test.ts` (clients.budget == itemized sum). Also fixed the latent
    **budget-sheets sibling** (`importBudgetFromSheet` skipped per-guest recalc) the same way.
  - **I2** removed dead inline `importVendor/importBudget/importHotel/importTransport` (674 lines)
    + their unreachable switch cases (buffer block returns first; grep proved no live caller).
- **Cross-cluster safety:** import paths still verify client→company BEFORE parsing; new test
  `excel-roundtrip.guests.test.ts` "cross-tenant import is REJECTED". Cluster-S 25/25 unchanged.
- **/code-review fixes applied:** importGift non-destructive update + companyId (was nulling
  value/guestId on partial uploads); removed double-recalc in `importAllFromSheets` (per-module
  importers self-recalc now); routed the `validateImport` preview through `selectModuleWorksheet`.
- **Deferred (NOT this phase):** Cluster-E gifts combined-export shape (no ID col, guestGift-sourced
  'Gift Item' — the gifts downloadTemplate EXPORT still reads dead g.giftName) = Cluster E. Inline
  importers remaining in import.router.ts vs CLAUDE rule 29 (excel-parser-server.ts) = large refactor,
  pre-existing. Handbook-sync rule deferred per Rail-2 (NEVER edit the handbook during the audit).
  Pre-existing gifts `guestId`→foreign-guest name leak (also via gifts.create/update; gifts.router
  read-join unscoped) = intra-tenant IDOR candidate for a Cluster-S follow-up (not introduced here).

### Prompt 3 OUTCOME (Cluster S — security IDOR) — DONE
- **Convergence fix (N→1):** `src/server/trpc/client-access.ts` extended (the existing single
  chokepoint). `assertEntityAccess(ctx, loadClientId)` derives the owning clientId for non-clientId
  -keyed entities (floorPlanId/budgetItemId/guestId) and funnels through `assertClientAccess`;
  `withinCompanyClients(ctx, col)` scopes company-wide aggregate reads on tables lacking companyId
  (sms_logs). All resolvers call the chokepoint instead of trusting a caller-supplied id.
- **RLS fail-closed backstop = DEFERRED to Prompt 6** (DB-level `app.current_company_id` + RLS on
  the 11 child tables that lack explicit companyId). The test DB role is superuser (RLS bypassed),
  so this phase proves the APPLICATION-level scope — exactly the prod reality for these tRPC paths.
- **Within-tenant residuals (OUT OF SCOPE for Cluster S = cross-TENANT; noted for later):**
  sms aggregates scope by company not by staff-assignment; createPaymentIntent allows own-clientId +
  same-company invoice; addGuestConflict doesn't verify guestIds belong to the (own) client. None is
  a cross-tenant breach (security-review confirmed). Candidates for an intra-tenant pass.

## ▷ PROMPT 3 FIX ORDER (security first, then severity; one regression test per cluster)
Standing principle: prior GREEN counts only where a test RAN it; flip each "documented-defect"
assertion to assert CORRECT behavior as its fix lands.

1. **Cluster S — tenant-isolation IDOR (HIGH, do FIRST: active cross-tenant exposure + writes).**
   Staged: (1a) patch every confirmed unscoped read/write (T1–T11, W1–W8) to scope on
   `ctx.companyId` / verify parent→company; (1b) introduce the enforced scoped seam +
   DB RLS fail-closed (+ explicit companyId on the 11 child tables). Regression test:
   extend `tenant-isolation.d4.test.ts` to cover ALL swept procedures (cross-tenant read ⇒
   empty/throw; cross-tenant write ⇒ rejected). Highest blast radius = W1 googleSheets.importFromSheet
   (cross-tenant delete), T3 analyticsExport (global totals), T4 sms.getSmsLogs (dump-all).
2. **Cluster R — single import service (HIGH: B1, C1; MED: P1, D1, I1; cleanup: I2).**
   Extract one per-module import service (validate → parse-by-sheet-name → typed `$inferInsert`
   mapping → upsert → full cascade set → broadcast via `*_MUTATION_PATHS`); route inline Excel +
   Sheets + chatbot bulk through it; delete dead reimplementations. Regression tests already
   scaffolded: `excel-roundtrip.{guests,gifts}.test.ts` (flip B1/C1 defect-assertions to expect
   correct), `parity-chatbot-vs-sheet.c2.test.ts` (P1 → parity holds), `excel-validation.d1.test.ts`.
3. **Cluster E — export/import shape SSOT (LOW–MED: E1, E2, E3).** Per-module field SSOT consumed
   by exporter + import service. Regression: `headers-per-module.c3` + events/transport round-trips.
4. **Cluster H — harness hardening (meta, not app fix).** H2 (Rail-3 Redis-endpoint guard), H3–H6.
5. **Prompt 6 re-validation:** wire `vitest.audit.config.ts` into CI on the pinned stack + a
   contract test on the centralized import service + an RLS/scope fail-closed test. Falsifiable
   prediction (CONVERGENCE.md): a 6th pass finds ZERO new Cluster-R/S instances.

### Prompt 2 OUTCOME (verification complete — 20 audit files / 40 passed + 1 expected-fail)
All five items done; 6 confirmed defect clusters logged in FINDINGS (feeds Prompt 3):
- **B1** (high) combined-export inline importer selects `Cover` → guests/gifts/guestGifts
  combined round-trip silently no-ops.
- **C1** (high) `importGift` reads/writes non-existent columns → Excel gift EDIT no-ops, ADD
  crashes (Sheets gift path is correct).
- **T1/T2** (high) cross-tenant IDOR: `floorPlans.getChangeHistory` + `getGuestPreferences`
  leak another tenant's rows (no company ownership check).
- **P1** (med) Sheets guest import skips `recalcPerGuestBudgetItems` → per-guest budget stale
  (chatbot/Excel recalc; Sheets doesn't).
- **E1/E2/E3** (low–med) export fidelity (events absent from combined export; transport name
  blanked w/o guestId; Gifts/Timeline view-only sheets).
- **D1** (med) re-confirmed: inline guests/gifts importers skip `validateExcelFile`.
Plus harness-quality H1 RESOLVED (true T2 measured) and H2/H3/H4/H5/H6 noted.

## ▷ Prompt 2 — verification phase (close Prompt-1 gaps)
Gate re-opened + proven clean (DB 127.0.0.1:5433/weddingflo_test, 35 migrations, 0 residual
tenant rows; SRH PING→PONG + SET/GET/DEL round-trip). Skills loaded: agentic-engineering-
workflow, source-code-context. FINDINGS.md created.

- **P2.1 /code-review harness diff — DONE. SEAM VERDICT: BEHAVIOR-PRESERVING** (not stopping).
  `defaultSheetsClientFactory` byte-identical to original; all 4 prod call sites no-arg. No
  false-greens found (probes read real DB/Redis). Harness-quality findings logged FINDINGS
  Cluster H (H1 perf.c7 T2 = publish-not-delivery → superseded by P2.3; H2 Rail-3 omits Redis
  endpoint guard; H4 D1 it.fails fragile → tighten in P2.2 guests).
- **P2.2 DONE** — C1 all modules (xlsx + Sheets) + C3 headers — per-module matrix below. Found B1, C1, E1–E3; D1 re-confirmed.
- **P2.3 DONE** — true cross-tab T2 via real `subscribeToCompany` live-stream: P50 305ms / P95 307ms (<2s budget); resolves H1 (was 9ms publish-only). Full two-browser BLOCKED: auth secrets (BETTER_AUTH_SECRET/TOKEN_ENCRYPTION_KEY/GOOGLE_CLIENT_ID/NEXT_PUBLIC_APP_URL/SUPABASE key) absent from .env.local + .env.test.local — cannot boot an authenticated dev server vs the test DB without them. `perf-t2-crosstab.c7.test.ts`.
- **P2.4 DONE** — C2 chatbot↔sheet parity: client-stat recalc parity HOLDS; per-guest budget recalc DIVERGES (P1, Sheets skips it). `parity-chatbot-vs-sheet.c2.test.ts`.
- **P2.5 DONE** — D4 tenant isolation: 2 cross-tenant IDOR leaks confirmed (T1 getChangeHistory, T2 getGuestPreferences); getById properly scoped; giftItems unscoped-but-unused. `tenant-isolation.d4.test.ts`.

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

Full P2 result: 20 audit files / 40 passed + 1 expected-fail; residual rows = 0; tsc clean on new files.
Defect clusters found: **B1** (combined-export inline sheet-select=Cover → guests/gifts/guestGifts),
**C1** (importGift wrong columns: EDIT no-ops, ADD crashes; Sheets path OK), **E1/E2/E3** (export
fidelity), plus **D1** re-confirmed (inline guests/gifts skip validateExcelFile). Sheets per-module
proven for budget/guests/hotels/vendors/gifts via the seam; transport/events/timeline Sheets engine
shares the same proven seam path (budget+4 modules asserted).

## Status table
Schema: `id | concern | status[pending|verified|fixed|wontfix] | evidence_path | test_id | last_run_sha | timestamp`

| id   | concern | status | evidence_path | test_id | last_run_sha | timestamp |
|------|---------|--------|---------------|---------|--------------|-----------|
| C1a  | Excel round-trip (exceljs) | verified ALL MODULES (budget/hotels/transport/vendors/events/timeline + guests/gifts defects documented) | excel-roundtrip.{guests,hotels,transport,vendors,events,gifts}.test.ts, timeline-bulkimport.test.ts | C1a-allmods | 8521a43 | 2026-06-26T14:35Z |
| C1b  | Google Sheets round-trip (googleapis) | verified budget+guests/hotels/vendors/gifts via seam | sheets-roundtrip.{c1b,modules}.test.ts | C1b-allmods | 8521a43 | 2026-06-26T14:35Z |
| C2   | Chatbot parity (REAL: chatbot vs sheet end-state) | verified parity HOLDS for client stats; DIVERGES on per-guest budget (P1) | parity-chatbot-vs-sheet.c2.test.ts | C2-parity | f861088 | 2026-06-26T14:56Z |
| C3   | Informative headers (per-module) | verified | headers-per-module.c3.test.ts | C3-permod | 8521a43 | 2026-06-26T14:35Z |
| C4   | Real-time delivery (true cross-tab) | verified (real subscribeToCompany live-stream) | perf-t2-crosstab.c7.test.ts | C4-crosstab | 9f68252 | 2026-06-26T16:36Z |
| C5   | Vendors per event | verified | vendors-per-event.c5.test.ts | C5 | d564270 | 2026-06-26T00:46Z |
| C6   | Whole-app bulletproof gate | verified | full audit suite 20 files/40+1 | C6 | 8521a43 | 2026-06-26T16:36Z |
| C7   | Performance T2 (true delivery) | verified P50 305ms/P95 307ms (<2s) | perf-t2-crosstab.c7.test.ts | C7-T2 | 9f68252 | 2026-06-26T16:36Z |
| D1   | validateExcelFile on inline guest/gift importers | **fixed** (inline path validates first via INLINE_IMPORT_VALIDATION) | excel-validation.d1.test.ts (guests+gifts reject) | D1 | f861088 | 2026-06-26T21:14Z |
| B1   | combined-export inline sheet-select=Cover (guests/gifts/guestGifts no-op) | **fixed** (selectModuleWorksheet by name) | excel-roundtrip.guests.test.ts (combined EDIT/DELETE/ADD) | B1 | f861088 | 2026-06-26T21:14Z |
| C1   | importGift wrong columns (EDIT no-ops, ADD crashes) | **fixed** (real columns, typed $inferInsert, non-destructive, +companyId) | excel-roundtrip.gifts.test.ts (EDIT+ADD+value) | C1-gift | f861088 | 2026-06-26T21:14Z |
| S    | **Cluster S — tenant-isolation IDOR (all 19 sites)** | **fixed** (centralized scope; RLS backstop→Prompt 6) | tenant-isolation.d4.test.ts (25/25) | see per-site below | 95d83a2 | 2026-06-26T19:10Z |
| P1   | Sheets guest import skips recalcPerGuestBudgetItems | **fixed** (routes through runImportRecalcCascade SSOT) | parity-chatbot-vs-sheet.c2.test.ts | P1 | f861088 | 2026-06-26T21:14Z |
| I1   | Sheets vendor single-module import skips recalcClientStats (+budget-sheets sibling) | **fixed** (routes through runImportRecalcCascade SSOT) | sheets-roundtrip.modules.test.ts (clients.budget==itemized sum) | I1 | f861088 | 2026-06-26T21:14Z |
| I2   | 4 dead inline reimplementations (importVendor/Budget/Hotel/Transport) | **fixed** (674 lines removed; grep proved no live caller) | tsc 0 + full audit suite green | I2 | f861088 | 2026-06-26T21:14Z |
| E1   | events absent from combined client export | **fixed** (Events sheet built from module-shape SSOT; combined round-trip) | excel-roundtrip.events.test.ts ("FIXED (E1) … combined export … round-trip") | E1 | 1c01510 | 2026-06-26T22:15Z |
| E2   | transport Guest Name blanked when guestId null → row skipped on re-import | **fixed** (export.router prefers stored gt.guestName) | excel-roundtrip.transport.test.ts ("FIXED (E2) … no guest link keeps its name") | E2 | 1c01510 | 2026-06-26T22:15Z |
| E3   | gifts/timeline view-only combined sheets (no ID/round-trip) | **fixed** (gifts→GiftsGiven delivery shape, round-trips via importData('guestGifts'); timeline view-only by design per handbook §G.8) | excel-roundtrip.gifts.test.ts ("FIXED (E3)" ×2); headers-per-module.c3.test.ts | E3 | 1c01510 | 2026-06-26T22:15Z |
| E-gift | gifts downloadTemplate EXPORT read dead g.giftName/fromName/… columns | **fixed** (reads real gifts name/value/status/guestId, matches importGift) | excel-roundtrip.gifts.test.ts (gifts single-sheet EDIT/ADD) + module-shape-contract.test.ts | E-gift | 1c01510 | 2026-06-26T22:15Z |
| E-SSOT | export/import column shape not single-sourced (drift root) | **fixed** (module-shape.ts SSOT consumed by exporter + import service) | module-shape-contract.test.ts (5 passed: derivation + value fidelity) | E-SSOT | 1c01510 | 2026-06-26T22:15Z |
| H1   | perf.c7 T2 label overstated cross-tab DELIVERY (measured publish latency) | **fixed** (relabelled to publish/enqueue latency; docstring points to perf-t2-crosstab.c7 for true delivery; <2s ceiling kept) | perf.c7.test.ts ("T2 publish/enqueue latency P95 < 2s") | H1 | 3b83ed8 | 2026-06-26T22:42Z |
| H2   | Rail-3 fail-closed guarded only the DB, not the Redis/SRH endpoint | **fixed** (assertTestRedis: UPSTASH host ∈ non-prod HOST_RE + TEST_DB_CONFIRMED; wired into audit setup AND clearSync DEL) | rail3-guard.ts; vitest.audit.setup.ts; redis-sync-probe.ts; audit run RAIL-3 OK log (redisHost=127.0.0.1) | H2 | 3b83ed8 | 2026-06-26T22:42Z |
| H3   | DBNAME_RE loose substring (`latest_prod` would authorize a wipe) | **fixed** (bounded-token `/(^|[_-])(dev|test)([_-]|$)/`; stricter, weddingflo_test still passes; 8/8 cases) | rail3-guard.ts (DBNAME_RE) | H3 | 3b83ed8 | 2026-06-26T22:42Z |
| H4   | D1 tripwire keyed on ANY throw (unrelated throw = false "fixed") | **fixed** (assert specific `/Missing required column/i` for guests+gifts) | excel-validation.d1.test.ts | H4 | 3b83ed8 | 2026-06-26T22:42Z |
| H5   | Sheets non-destructive proof only checked an in-sheet column | **fixed** (absent-column preservation: created_at + is_per_guest_item unchanged across import) | sheets-roundtrip.c1b.test.ts | H5 | 3b83ed8 | 2026-06-26T22:42Z |
| H6   | determinism overstated (dead faker.seed; comment claimed faker drove it) | **fixed** (removed dead faker.seed + import + FIXED_SEED export; docstring states fixed-literal determinism) | deterministic-seed.ts; full audit suite green (72) | H6 | 3b83ed8 | 2026-06-26T22:42Z |
| 6A.1 | downloadTemplate authored columns INLINE (Cluster-E SSOT bypass; guests dropped Side+CheckedIn, events Status+Action drift) | **fixed** (6 clean modules → buildExportSheet/MODULE_SHAPES; events §G.8b Action+Status; vendors §G.6 rich; vendors+gifts inline by design) | downloadtemplate-shape-contract.test.ts (6/6) + module-shape-contract + excel-roundtrip.{events,vendors} | 6A1 | e272fce | 2026-06-27 |
| 6A.2 | combined-export vendor round-trip DATA LOSS (read bare global `vendors` → §G.6 per-link cols blank → re-import silently cleared un-edited vendors' contract/deposit/service-date/approval/POC/event) | **fixed** (shared `fetchClientVendorExportRows` feeds per-client `clientVendors`-enriched rows to BOTH combined export + downloadTemplate; importer header-presence kept by design = explicit unassign) | excel-roundtrip.vendors-combined.test.ts (3/3, RED without fix: POPULATES + un-edited KEEPS + explicit-unassign) | 6A2 | `__6A2_SHA__` | 2026-06-27 |

### Cluster S — per-site fixed map (Prompt 3) — guarding test_id = `tenant-isolation.d4.test.ts` case
Mechanism column: CHOKE = `assertClientAccess(ctx, clientId)`; DERIVE = `assertEntityAccess` (load
entity → clientId → CHOKE); SCOPE = `withinCompanyClients`/inArray company-clients in the DB WHERE.
`file:line` = the current **procedure-declaration** line, re-verified at 6A.1 (the earlier numbers
had drifted as the routers grew during the Cluster-S fixes).

| id  | procedure | file:line | mechanism | test case |
|-----|-----------|-----------|-----------|-----------|
| T1  | floorPlans.getChangeHistory | floor-plans.router.ts:1463 | DERIVE(floorPlanId→clientId) | T1 REJECTED |
| T2  | floorPlans.getGuestPreferences | floor-plans.router.ts:1596 | CHOKE | T2 REJECTED |
| T3  | analyticsExport.getCompanyAnalytics | analyticsExport.ts:31 | SCOPE(inArray clientIds) | analytics counts only own tenant |
| T4  | sms.getSmsLogs | sms.router.ts:549 | SCOPE(withinCompanyClients) | T4 no foreign log |
| T5  | sms.getSmsStats | sms.router.ts:606 | SCOPE(withinCompanyClients) | T5 aggregates exclude B |
| T6  | budget.getAdvancePayments | budget.router.ts:870 | DERIVE(budgetItemId→clientId) | T6 REJECTED |
| T7  | floorPlans.getUnassignedGuests | floor-plans.router.ts:977 | CHOKE (+catch rethrows TRPCError) | T7 REJECTED |
| T8  | floorPlans.getGuestConflicts | floor-plans.router.ts:1568 | CHOKE | T8 REJECTED |
| T9  | floorPlans.checkConflicts | floor-plans.router.ts:559 | DERIVE(guestId→clientId) | T9 REJECTED |
| T10 | vendors.getClientEvents | vendors.router.ts:1305 | CHOKE | T10 REJECTED |
| T11 | guestTransport.getStats | guest-transport.router.ts:75 | CHOKE (ctx.) | T11 REJECTED |
| W1  | googleSheets.importFromSheet | googleSheets.router.ts:344 | CHOKE (FIRST line, pre-OAuth) | W1 REJECTED + B timeline intact |
| W2  | payment.createInvoice | payment.router.ts:173 | CHOKE | W2 REJECTED + no B invoice |
| W3  | payment.createPaymentIntent | payment.router.ts:343 | CHOKE | W3 REJECTED |
| W4  | guests.checkIn | guests.router.ts:1288 | DERIVE(guestId→clientId, ctx.) | W4 REJECTED + B not checked-in |
| W5  | accommodations.setDefault | accommodations.router.ts:329 | CHOKE + id∧clientId-scoped update | W5 REJECTED + B default unchanged |
| W6  | floorPlans.addGuestConflict | floor-plans.router.ts:1623 | CHOKE (ctx.) | W6 REJECTED |
| W7  | guestTransport.create | guest-transport.router.ts:100 | CHOKE (ctx.) | W7 REJECTED + no B transport |
| W8  | timeline.reorder | timeline.router.ts:296 | client→company (pre-existing) + id∧clientId-scoped update | W8 REJECTED + B order unchanged |

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
- 2026-06-26T~19:10Z — **Prompt 3 (Cluster S, security IDOR) COMPLETE.** Skills run:
  grep-loop-review-workflow (loop), service-layer-architecture (fix design), source-code-context
  (cited file:line + verified drizzle `inArray(col, subquery)` against node_modules). Handbook
  H.1 confirmed all 19 procedures tenant-bound by design (no platform-global view among them).
  Centralized enforcement built in `client-access.ts`; all 19 sites routed through it (N→1).
  Regression suite flipped to expect-correct + expanded to all 19 + worst-write delete →
  25/25 green. Gates all green; /code-review surfaced 2 real defects (accommodations setDefault
  unset-then-set-none footgun; getUnassignedGuests swallowed auth throw) → both fixed.
  /security-review CLEAN. RLS fail-closed backstop deferred to Prompt 6. Cluster R/E/H untouched.
- 2026-06-26T~21:14Z — **Prompt 3-R (Cluster R, single import service) COMPLETE.** Skills run:
  grep-loop-review-workflow (loop), service-layer-architecture (design), source-code-context
  (cited file:line — gifts schema, GIFT_HEADERS ref, validateExcelFile sig, resolveHeaderAliases,
  downloadTemplate headers). Built `import-cascade.ts` SSOT; routed Excel inline + buffer +
  Sheets importers + import preview through it. B1/C1/P1/D1/I1/I2 fixed; +budget-sheets P1 sibling;
  674 dead lines removed. Tests flipped to expect-correct + cross-tenant-import + I1 recalc coverage.
  Gates all green; Cluster-S 25/25 preserved. /code-review surfaced 4 real items (importGift
  destructive update → non-destructive; missing companyId → added; importAllFromSheets double-recalc
  → removed; validateImport preview B1 drift → routed through selectModuleWorksheet) — all fixed.
  /security-review CLEAN. Cluster E/H untouched; Cluster S not re-opened.
- 2026-06-26T~22:42Z — **Prompt 3-H (Cluster H, harness hardening) COMPLETE.** Skills run:
  grep-loop-review-workflow (loop), source-code-context (cited file:line for every touched file:
  validateExcelFile throw msg `excel-parser.ts:326`, BUDGET_HEADERS `sheets-sync.ts:182`,
  getRedisClient `redis-pubsub.ts:205`, INLINE_IMPORT_VALIDATION `import-cascade.ts:81`). H1–H6 all
  fixed STRICTER-or-honesty-only (never weaker): H2 extends Rail-3 fail-closed to the Redis/SRH
  endpoint (assertTestRedis in setup + clearSync); H3 bounded-token DBNAME_RE; H4 specific
  validation-message assertion; H5 absent-column non-destructive proof; H1/H6 honesty (relabel +
  dead-faker removal). Gates all green + UNWEAKENED: tsc 0, eslint 0 err, audit 21/72, Cluster-S
  IDOR 25/25, Cluster-R green, Cluster-E green, integration 58, unit 429/8skip. /code-review: 0
  bugs, 1 DRY nit left per Rail-6. No app/src behavior changed. Resume → Prompt 6 (lock-in).
- 2026-06-26T~23:10Z — **Prompt 6A (re-validation + convergence re-sweep) COMPLETE.** Read-only +
  docs; NO new fixes. Skills: grep-loop-review-workflow, source-code-context (cited file:line).
  Full suite green + unweakened (tsc 0, eslint 0 err, audit 21/72, integration 58, unit 429/8skip);
  per-cluster S/R/E/H zero-regression re-confirmed; perf re-measured (T1 14ms / T2 delivery 310ms /
  T3 22ms P95). **Convergence re-sweep: ZERO new Cluster-R + ZERO new Cluster-S → CONVERGENCE.md
  prediction CONFIRMED, loop CLOSED for R & S** (52 routers + every import/export path; 2 parallel
  read-only sweeps + independent grep spot-checks). 3 observations noted-not-counted (O1 vendors.addReview,
  O2 excel-exporter parallel surface, O3 harmless redundant recalc). Wrote `KNOWN_GAPS.md`. Updated
  CONVERGENCE.md (VERDICT) + FINDINGS.md (6A observations). Resume → Prompt 6B (RLS backstop + CI gate).
- 2026-06-27 — **Prompt 6A.1 (downloadTemplate SSOT-bypass fix + ledger hygiene) COMPLETE.** Skills:
  service-layer-architecture, source-code-context (handbook §G.2/§G.6/§G.8b cited), grep-loop-review.
  Routed downloadTemplate's 6 clean modules through `buildExportSheet`/`MODULE_SHAPES` (killed the
  inline column authoring; guests +Side/+CheckedIn, events +Action/+verbose-Status). Expanded
  `MODULE_SHAPES.events` (§G.8b) + `MODULE_SHAPES.vendors` (§G.6 rich). vendors + gifts kept inline
  as documented data-source exceptions (KNOWN_GAPS §5) — vendors because the combined export feeds
  the global `vendors` table while the template is the per-client `clientVendors` view, and the
  importer's present-blank→unassign (`excel-parser-server.ts:760`) makes the combined export unsafe
  for per-link round-trip. New `downloadtemplate-shape-contract.test.ts` (6/6). Ledger: 21 placeholder
  SHAs → real; per-site IDOR map lines re-verified; INVENTORY/KNOWN_GAPS companyId-less count fixed
  (11 reachable-subset → ~33+ of ~98 tenant tables) for the 6B RLS scope. Gates: tsc 0, eslint 0,
  audit 22 files/78, integration 58, unit 429/8skip. /code-review applied. Resume → Prompt 6B.
- 2026-06-27 — **Prompt 6A.2 (vendors combined-export round-trip data-loss) COMPLETE.** Skills:
  grep-loop-review-workflow (loop), service-layer-architecture (shared-helper design),
  source-code-context (cited handbook §G.6/§G.3 + file:line — export.router:62 bare global vendors,
  buildPresentUpdate excel-parser.ts:198/excel-parser-server.ts:744, downloadTemplate enrichment).
  READ-FIRST verdict: the data loss is the EXPORT emitting blank per-link columns (combined export
  read the global `vendors` table), NOT the importer — whose header-presence non-destructive
  contract is documented (§G.3 absent-header-safe), cross-module-consistent, and IS the explicit
  per-field unassign mechanism, so it was deliberately KEPT (verify-then-don't-change the importer).
  PRIMARY FIX (data-side analogue of Cluster E's shape SSOT): extracted `fetchClientVendorExportRows`
  (`src/lib/export/vendor-export-data.ts`) — per-client `clientVendors`-enriched vendor rows — used
  by BOTH `export.router` (combined export) AND `import.router` downloadTemplate; both routers keep
  their existing client→company tenant verification (helper owns fetch/enrich only; advancePayments
  now scoped via `inArray(budgetItemId, budgetIds)` — net MORE tenant-restrictive than the old
  fetch-all). Stale `MODULE_SHAPES.vendors` comment corrected. Regression
  `excel-roundtrip.vendors-combined.test.ts` (3/3), PROVEN RED with the export fix reverted.
  Gates: tsc 0, eslint 0 err/98 warn, **audit 23 files/81**, Cluster-S IDOR 25/25, downloadTemplate
  contract 6/6, integration 58, unit 429/8skip. /code-review (2 independent finder agents: 0
  correctness bugs; 1 stale-comment fix applied) + /security-review (CLEAN — net more restrictive).
  KNOWN_GAPS §5 vendors → fixed. Cluster S/R/E/H NOT re-opened (all regressions green). Resume → 6B.

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
