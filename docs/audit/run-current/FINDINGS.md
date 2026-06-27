# FINDINGS — Bulletproof Re-Audit (Prompt 2 verification phase)

> Defects + risks discovered while CLOSING the Prompt-1 coverage gaps. Clustered by shared
> ROOT CAUSE (this feeds Prompt 3 fixes). Each entry: {severity, module, file:line, repro
> with fixed-seed IDs, expected-per-handbook vs actual}. Prior GREEN counts only where a
> test RAN the behavior. NO fixes applied this phase (incl. D1) — fixes wait for Prompt 3.

Fixed-seed IDs referenced below come from `src/test-support/seed/deterministic-seed.ts`
(`IDS.*`, companyId `…0001`, clientId `…0003`, etc.).

---

## Cluster A — `validateExcelFile()` skipped on inline importers (CLAUDE rule 28)
Root cause: import paths defined INLINE in `import.router.ts` parse the workbook directly,
bypassing the `validateExcelFile()` guard that the dedicated `excel-parser-server.ts`
parsers call first. A malformed/oversized/non-xlsx upload reaches parsing logic unguarded.

| id | sev | module | file:line | expected (handbook/rule) | actual |
|----|-----|--------|-----------|--------------------------|--------|
| D1 | medium | guests, gifts | `import.router.ts` inline `importGuest` (~:1218, read ~:928), `importGuestGift` (~:2240) | Rule 28: "All Excel imports must call `validateExcelFile()` first" (as budget/hotels/transport/vendors/events do in `excel-parser-server.ts`) | inline parse with NO `validateExcelFile()` call. CONFIRMED in Prompt 1 (test `excel-validation.d1.test.ts`, RED). Re-confirmed per-module in Prompt 2 C1. FIX deferred to Prompt 3. |

---

## Cluster H — Harness-quality findings (test-infra, from /code-review of the harness diff)
Root cause: harness was built fast in Prompt 1; a few probes/labels overstate what they
measure or leave a guard incomplete. NONE are false-greens that let an app defect pass
(seam verdict: BEHAVIOR-PRESERVING; probes read real DB/Redis), but they affect audit
fidelity and safety. Recorded here; addressed within Prompt 2 where in-scope (test files
only), else flagged for a later harness-hardening pass.

| id | sev | area | file:line | issue | disposition |
|----|-----|------|-----------|-------|-------------|
| H1 | medium | perf/SLO | `perf.c7.test.ts:60-79` | T2 "propagation P95<2s" measures a LOCAL synchronous Redis read — `broadcastSync` is awaited INSIDE the mutation, so the value is already in Redis before polling starts; assertion essentially cannot fail. It is a PUBLISH latency, not cross-tab DELIVERY. | RESOLVED by P2.3 `perf-t2-crosstab.c7.test.ts`: TRUE delivery via the real `subscribeToCompany` live-stream (client A mutates, client B observes) = **P50 305ms / P95 307ms** (min 58, max 307), vs the 9ms publish baseline. Dominated by the 300ms adaptive poll floor; well under the 2s T2 budget. Full browser-render hop BLOCKED (auth secrets absent — see note). |
| H2 | medium | safety/Rail-3 | `rail3-guard.ts`, `redis-sync-probe.ts` | Rail-3 fail-closed proof inspects only `DATABASE_URL`. `clearSync` (`DEL`) + broadcast (`ZADD`) hit whatever `UPSTASH_REDIS_REST_URL` resolves to; if `.env.test.local` were absent/stale and ambient env pointed at prod Upstash, the DB guard would still pass while tests mutate a prod Redis key. | Currently safe (`.env.test.local` present, points at local SRH @127.0.0.1:8079, verified PING/SET/GET/DEL). Flagged for harness-hardening: extend guard to assert Redis host too. |
| H3 | low→med | safety/Rail-3 | `rail3-guard.ts` `DBNAME_RE=/(dev|test)/` | substring + localhost host regex would also authorize wiping a local `*_dev` DB if `TEST_DB_CONFIRMED=1` lingered in the shell. By user directive (STATE "Rail-3 amendment"), but a data-loss footgun outside the `.env.test.local` flow. | Accepted by directive; noted. |
| H4 | low | D1 tripwire | `excel-validation.d1.test.ts:47` | guests `it.fails()` keys on ANY throw; an unrelated throw (e.g. NOT-NULL insert error on the junk row) would also satisfy `rejects.toThrow()`, falsely signaling "D1 fixed". | Tightened in Prompt 2 C1 guests test to assert the SPECIFIC validation-rejection vs an unguarded-parse symptom. |
| H5 | low | non-destructive proof | `sheets-roundtrip.c1b.test.ts` | asserts `item==='Venue Hire'` which was round-tripped through the sheet → proves round-trip survival, not absent-column preservation (C1a correctly checks `created_at`, a column absent from the sheet). | Per-module Sheets tests in Prompt 2 add an absent-column non-destructive check where the module has one. |
| H6 | low | determinism | `deterministic-seed.ts` | `faker.seed(FIXED_SEED)` set but never used (all seed values are literals); comment overstates its role. | Cosmetic; noted. |

---

## Cluster B — Combined-export round-trip broken for INLINE-import modules
Root cause: the inline importer (guests/gifts/guestGifts) selects its data sheet with
`workbook.worksheets.find(ws => !ws.name.includes('INSTRUCTIONS') && !ws.name.includes('READ FIRST'))`
(`import.router.ts:936`). In the COMBINED client export (`export-utils.ts:36`, first sheet =
`Cover`), that predicate matches `Cover`, so the importer parses the Cover sheet and the
module's real sheet (`Guests`/`Gifts`) is never read. The server-parser modules
(budget/hotels/transport/vendors/events) are immune — they use `getWorksheet('<Name>')`.

| id | sev | module | file:line | expected (handbook) | actual (RUN) |
|----|-----|--------|-----------|---------------------|--------------|
| B1 | high | guests, gifts, guestGifts | sheet-select `import.router.ts:936`; combined first sheet `Cover` `export-utils.ts:36` | export combined → edit module sheet → `importData(module)` applies EDIT/ADD/DELETE | combined-export `importData('guests')` parses `Cover` → Dave NOT deleted, Eve NOT added (silent no-op). PROVEN by `excel-roundtrip.guests.test.ts` "DEFECT: combined-export guests import silently no-ops". The single-sheet upload path (downloadTemplate shape) DOES work + broadcasts GUEST_MUTATION_PATHS (same test file). |

Note: only the combined-export round-trip is broken for these modules; the single-sheet
template upload (the `downloadTemplate('guests')` shape) works. Whether users are expected
to re-import the combined export, or only single-module templates, is a product question —
but the combined export DOES emit per-module editable sheets with ID columns, which implies
the round-trip is intended. Fix candidate (Prompt 3): select the sheet by module name.

## Cluster C — `importGift` reads/writes non-existent columns (gifts table)
Root cause: the inline `importGift` (`import.router.ts:1863`) was written against a gift
shape (`giftName`/`fromName`/`fromEmail`/`deliveryStatus`/`thankYouSent`) that does NOT
match the `gifts` table schema (`name`/`value`/`status`/`guestId`, schema-features.ts:692).
`db: any` + an untyped `giftData` literal hid the mismatch (the "param/column bug class").

| id | sev | module | file:line | expected | actual (RUN) |
|----|-----|--------|-----------|----------|--------------|
| C1 | high | gifts | name-match `import.router.ts:1913` (`g.giftName.toLowerCase()`); write `:1886-1893,1928` | importData('gifts') EDIT/ADD a gift row | EDIT silently no-ops (`.set({giftName,...})` maps no real column but updatedAt → name unchanged); ADD **crashes** `Cannot read properties of undefined (reading 'toLowerCase')` whenever ≥1 gift exists (reads `g.giftName`, column is `name`). PROVEN: `excel-roundtrip.gifts.test.ts` "DEFECT: importGift writes/reads wrong columns". |

CONTRAST (not a defect): the Google **Sheets** gift path (`GIFT_HEADERS` Gift Name/Value/
Status → correct columns; `importGiftsFromSheet`) round-trips correctly — proven by
`sheets-roundtrip.modules.test.ts` "gifts: EDIT + DELETE". So the bug is specific to the
Excel inline `importGift`, not the gifts table or the Sheets engine.

## Cluster E — Export fidelity / coverage gaps (LOW–MED, report)
Root cause: the combined client export (`export-utils.ts` / `export.router.ts`) and a few
parsers have shape mismatches that reduce round-trip fidelity but are not crashes.

| id | sev | area | file:line | issue |
|----|-----|------|-----------|-------|
| E1 | med | events export | `export-utils.ts` (no Events sheet); `export.router.ts:42-114` | Events are NOT in the combined client export, so "export my data → edit events → re-import" is impossible via the combined file; events round-trip only via `downloadTemplate('events')`. Proven indirectly (events test uses the template). |
| E2 | low→med | transport export | `export.router.ts:87-94` | Transport "Guest Name" is DERIVED from the linked guest and BLANKED when `guestId` is null; on re-import the row is SKIPPED (Guest Name required, `excel-parser-server.ts:490`). A manually-entered transport entry with no guest link silently drops on round-trip. Found via DIAG (transport1 skipped until `guestId` linked). |
| E3 | low | headers (C3) | `export-utils.ts` Gifts (`:188`), Timeline (`:375`) | Gifts + Timeline export sheets are view-oriented: no `*` required markers / no ID column (Gifts uses Serial #). Acceptable for read-only views, but they cannot round-trip from the combined export. Editable modules (Guests/Hotels/Transport/Vendors/Budget) DO mark required + give examples (C3 per-module test GREEN). |

## Cluster T — Tenant isolation (D4): cross-tenant IDOR in floor-plans reads
Root cause: two `protectedProcedure` reads filter ONLY by a caller-supplied id (floorPlanId /
clientId) and never verify that id belongs to `ctx.companyId`. Any authenticated user of ANY
company can read another tenant's rows by supplying the target id (broken object-level authz /
IDOR). PROVEN by `tenant-isolation.d4.test.ts` (company-A caller reads company-B rows).

| id | sev | path | file:line | actual (RUN) |
|----|-----|------|-----------|--------------|
| T1 | **high** | `floorPlans.getChangeHistory({floorPlanId})` | `floor-plans.router.ts:1463` (`where: eq(seatingChangeLog.floorPlanId, input.floorPlanId)`, no company check) | A caller retrieved B's `seating_change_log` row (incl. `previousData`/`newData` JSON). CONFIRMED leak. |
| T2 | **high** | `floorPlans.getGuestPreferences({clientId})` | `floor-plans.router.ts:1591` (`.where(eq(guests.clientId, input.clientId))`, no company check) | A caller retrieved B's `guest_preferences` (incl. private preference JSON). CONFIRMED leak. |

Properly scoped (no leak, verified): `floorPlans.getById` (rejects cross-tenant floorPlanId).

### SIBLING SWEEP (P2.5 item 2) — the 2 IDORs were NOT the only ones
Swept all 53 routers. `protectedProcedure` only checks `userId`; `staffProcedure` auto-runs
`assertClientAccess` ONLY when `role==='staff'` AND input has a top-level `clientId` — so a
`company_admin` (or any read keyed on a non-`clientId` id) is unscoped unless the resolver
filters by `ctx.companyId` itself (`trpc.ts:54,77-87,113-121,150-178`; `client-access.ts:21-75`).

**Unscoped cross-tenant READS (IDOR)** — `*` = directly code-verified this pass; others swept by-inspection (verify before fix):

| id | sev | procedure | builder | trusted id | table | file:line |
|----|-----|-----------|---------|-----------|-------|-----------|
| T1* | high | floorPlans.getChangeHistory | protected | floorPlanId | seatingChangeLog | floor-plans.router.ts:1464 |
| T2* | high | floorPlans.getGuestPreferences | protected | clientId | guestPreferences⋈guests | floor-plans.router.ts:1591 |
| T3 | high | analyticsExport.getCompanyAnalytics* | protected | none (no WHERE) | guests, budget (GLOBAL totals) | analyticsExport.ts:64,79 |
| T4 | high | sms.getSmsLogs* | protected | clientId (optional, unverified) | sms_logs (bodies+phones; empty input ⇒ ALL tenants) | sms.router.ts:569-591 |
| T5 | med | sms.getSmsStats* | protected | none | sms_logs (cross-tenant aggregates) | sms.router.ts:624-631 |
| T6 | high | budget.getAdvancePayments* | staff | budgetItemId | advancePayments (financial) | budget.router.ts:879 |
| T7 | high | floorPlans.getUnassignedGuests | protected | floorPlanId | guests (PII+dietary) | floor-plans.router.ts:982-1000 |
| T8 | med | floorPlans.getGuestConflicts | protected | clientId | guestConflicts | floor-plans.router.ts:1559 |
| T9 | med | floorPlans.checkConflicts | protected | guestId/tableId | guestConflicts,floorPlanGuests,guestPreferences | floor-plans.router.ts:571-592 |
| T10 | med | vendors.getClientEvents | protected | clientId | events | vendors.router.ts:1319 |
| T11 | low-med | guestTransport.getStats | staff | clientId | guest_transport | guest-transport.router.ts:85 |

**Unscoped cross-tenant WRITES (more severe — write/delete by trusted id)** — swept by-inspection:

| id | sev | mutation | builder | trusted id | effect | file:line |
|----|-----|----------|---------|-----------|--------|-----------|
| W1 | high | googleSheets.importFromSheet | protected | clientId (unverified, unlike syncNow) | overwrite/DELETE another tenant's timeline & gifts | googleSheets.router.ts:343-440 (helpers called w/o companyId :436/:439) |
| W2 | high | payment.createInvoice | protected | clientId (unverified) | attach invoice to foreign client | payment.router.ts:239-248 |
| W3 | high | payment.createPaymentIntent | protected | clientId (invoiceId checked, clientId not) | payment + Stripe metadata on foreign client | payment.router.ts:428-437 |
| W4 | med-high | guests.checkIn | staff | guestId (non-clientId ⇒ auto-check skipped) | check in another tenant's guest | guests.router.ts:1305 |
| W5 | med-high | accommodations.setDefault | staff | id (+own clientId) | flip another tenant's accommodation default | accommodations.router.ts:343-349 |
| W6 | med | floorPlans.addGuestConflict | staff | clientId | write to foreign client | floor-plans.router.ts:1616-1625 |
| W7 | med | guestTransport.create | staff | clientId | create rows on foreign client | guest-transport.router.ts:97-262 |
| W8 | low | timeline.reorder | staff | itemIds[] | reorder foreign timeline (sortOrder only) | timeline.router.ts:324-329 |

PII-copy-into-own-row (read-into-write): contracts.create (contracts.router.ts:434-438),
proposals.create (proposals.router.ts:456-479). Public counter bump: websites.trackVisit:817.

Verdict: cross-tenant authorization is enforced PER-RESOLVER and many resolvers omit it — a
systemic broken-object-level-authorization class, not 2 isolated bugs. See ROOTCAUSE.md
Cluster S. Sibling proof: `budget.getAdvancePayments` (unscoped) sits right above
`budget.getSummary` which DOES verify client→company (budget.router.ts:888+).

Other tables in the 11-list:
- giftItems — `export.exportClientData:42` does an UNSCOPED `select().from(giftItems)`, BUT the
  result (`giftItemsRaw`) is **never used** in the export output (dead fetch). Severity LOW
  (wasteful unscoped query, not an exfiltration path). Fix: scope or remove the fetch.
- vendorComments (`vendors.getComments`), seatingVersions (`listVersions`), floorPlanTables/
  floorPlanGuests (`getById`) — scoped via parent-ownership checks (not re-run individually
  this pass; getById's parent check is verified). teamClientAssignments (`team.*`) — recon
  flagged a possible missing company check on returned clientIds; UNVERIFIED, candidate.
- websiteBuilderContent, hotelBookings, refunds — NO reachable tRPC read path (isolated by
  non-exposure; only touched by cascade delete).

Fix candidates (Prompt 3): add a parent→company ownership guard to getChangeHistory +
getGuestPreferences (and audit teamClientAssignments); consider giving these hot child tables
an explicit companyId + RLS so a missing app-level check fails closed.

---

## Cluster P — Chatbot↔Sheet parity gap: Sheet guest import skips per-guest budget recalc
Root cause: the canonical guest-confirm automation is `recalcClientStats` + `recalcPerGuestBudgetItems`
(per-guest-recalc.ts header lists guests.router, tool-executor, guest-cascade as callers). The
Google Sheets `importGuestsFromSheet` calls `recalcClientStats` only (sheets-sync.ts:~983) and
NOT `recalcPerGuestBudgetItems`. So confirming/adding a guest via Sheets leaves per-guest budget
items (e.g. per-plate catering) STALE, while the same op via chatbot/Excel/UI recalculates them.

| id | sev | path | file:line | actual (RUN, parity-chatbot-vs-sheet.c2.test.ts) |
|----|-----|------|-----------|--------------------------------------------------|
| P1 | medium | guest add/confirm via Sheets | chatbot recalc `tool-executor.ts:1541,1650`; Sheets omits in `sheets-sync.ts importGuestsFromSheet (~857-998)` | Same op both paths on fresh DB + per-guest item (perGuestCost 100, confirmed partySize 2): clients.guestCount PARITY HOLDS (both recalcClientStats); per-guest budget estimatedCost = chatbot **>0**, Sheet **0** → DIVERGENCE. |

Fix candidate (Prompt 3): call `recalcPerGuestBudgetItems(db, clientId)` after the client-stat
recalc in `importGuestsFromSheet` (and audit other Sheets importers that change guest/RSVP state).

## Cluster I — Importer matrix divergences (P2.5 sibling sweep, Part B)
The 5 canonical buffer importers in `excel-parser-server.ts` route through
`validateExcelFile` + the right cascades. Every divergence is an inline/ad-hoc
reimplementation OR a Sheets path missing a cascade — same root as B1/C1/P1/D1.

| id | sev | importer | file:line | divergence |
|----|-----|----------|-----------|------------|
| I1 | med | importVendorsFromSheet (single-module path) | sheets-sync.ts:1110 (recalc only at :1970 `all` path) | drops `recalcClientStats` in the single-module sync → client stats stale after a vendor-sheet sync (sibling of P1). |
| I2 | low | dead inline reimplementations | import.router.ts importVendor :1491 / importBudget :1751 / importHotel :1938 / importTransport :2126 | unreachable (buffer block returns early :804-897) ad-hoc reimplementations of the canonical parsers — dead code that drifts; remove or route through the service. |
| I3 | info | importEventsFromSheet reachable only via module='all' | sheets-sync.ts:1784; router enum omits `events` | events single-module sheet import not wired (UNVERIFIED if intentional; pairs with E1). |

(Confirmed harmless: client parsers `excel-parser.ts` importGuestListExcel/importGiftsExcel/
parseExcelFile + csv-parser.ts have NO DB-writing callers — dead/unused.)

## New defects discovered in Prompt 2 C1 per-module round-trips
See Clusters A/B/C/E/I/T above. D1 re-confirmed; B1 sheet-select; C1 importGift columns;
E1–E3 export fidelity; I1–I3 importer divergences; T1–T11/W1–W8 IDOR inventory.

---

## Prompt 6A re-sweep observations (NOT counted as new Cluster-R/S instances)
The convergence re-sweep (all 52 routers + every import/export path) found **ZERO** new
cross-tenant (S) and **ZERO** new bypass (R) instances — prediction CONFIRMED (CONVERGENCE.md
VERDICT). Two items surfaced that are NOT new instances of either class; logged here for honesty
and as candidates for a later (non-audit) pass — per the prompt, NOT fixed now:

| id | class | summary | file:line | why NOT counted |
|----|-------|---------|-----------|-----------------|
| O1 | within-tenant (not cross-tenant) | `vendors.addReview` (`staffProcedure`) scopes the vendor to `ctx.companyId` but the `company_admin` path does not re-verify the top-level `input.clientId`. | `vendors.router.ts:1807-1842` (vendor scope `:23`, write `:35-36`) | Review attaches to an IN-COMPANY vendor; can at worst tag a foreign clientId onto an own-tenant review row → within-tenant integrity quirk, NOT a cross-tenant read/write. Staff path is auto-scoped on the top-level clientId. Belongs to the intra-tenant residual set (with sms/payment/addGuestConflict). |
| O2 | export surface (by design) | `excel-exporter.ts` is a SECOND per-module Excel download surface (per-module buttons, master-planning, timeline) parallel to the combined-export SSOT (`module-shape.ts`). Its headers (e.g. budget `Expense Name`/`Budgeted Amount`) intentionally differ from `MODULE_SHAPES` (`Item`/`Estimated Cost`). | `src/lib/export/excel-exporter.ts` | Export-only (no recalc obligation); its round-trip contract is pinned by `src/lib/import/__tests__/excel-roundtrip-contract.test.ts` ("must mirror excel-exporter.ts"), not the combined SSOT. Two distinct, contract-tested surfaces — not drift introduced by the Cluster-E/R centralization. (Future tidy-up candidate: fold both onto one SSOT.) |
| O3 | harmless redundancy (R-adjacent) | Sheets `all`-import + `googleSheets.router` run `recalcClientStats` after hotels/transport, which the Excel path skips per the SSOT (no client-stat coupling for those modules). | `googleSheets.router.ts:483,497`; `sheets-sync.ts importAllFromSheets:1992,2011` | An EXTRA no-op read (recalcClientStats only reads budget+guests), not a MISSING recalc or a mis-map — does not break round-trip or stats. Not a bypass; folding hotels/transport recalc decisions through `runImportRecalcCascade` would tidy it. |
