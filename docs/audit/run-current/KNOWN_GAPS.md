# KNOWN_GAPS — Bulletproof Re-Audit (Prompt 6A, honest coverage map)

> No false 100%. Per concern: what IS proven (by a test that RAN the behavior on the proven
> test DB), the guarding test_id, and the remaining gap. Generated read-only; verified against
> a full green run on `weddingflo_test @ 127.0.0.1:5433` (HEAD `3b83ed8`, branch `audit/bulletproof`).
>
> Full-suite totals this pass: tsc 0 · eslint 0 errors/98 warnings (pre-existing) ·
> **audit 21 files / 72 passed** · **integration 58** · **unit 429 passed / 8 skipped**.
> Convergence re-sweep: **ZERO** new Cluster-R and **ZERO** new Cluster-S instances (prediction CONFIRMED).

---

## Per-concern coverage

| concern | what is PROVEN (behavior actually run) | proving test_id | remaining gap |
|---------|----------------------------------------|-----------------|---------------|
| **C1a** Excel round-trip (exceljs) | Real `.xlsx` export→edit→`importData`→DB for **budget, guests (single+combined), hotels, transport, vendors, events, gifts (single GiftsGiven + registry), guestGifts, timeline**: EDIT + ADD + DELETE + non-destructive + cascade (recalc/syncVendorBudgetItem/syncEventsToTimeline) + broadcast (`*_MUTATION_PATHS`). Combined-export round-trip (B1) + importGift columns (C1) + validate-first (D1) all asserted FIXED. | `excel-roundtrip.{budget,guests,hotels,transport,vendors,events,gifts}.test.ts`, `timeline-bulkimport.test.ts`, `excel-validation.d1.test.ts` | Inline importers still live in `import.router.ts` (vs CLAUDE rule 29 "server imports in excel-parser-server.ts") — pre-existing structural debt, behavior-correct & SSOT-routed, large refactor deferred. `excel-exporter.ts` is a SECOND per-module download surface (export-only, different headers by design) pinned by a separate contract test, not the combined SSOT. |
| **C1b** Google Sheets round-trip (googleapis) | Offline via the FakeSheetsClient DI seam: `syncBudgetToSheet`→edit/add/delete(Action)/reorder→`importBudgetFromSheet`→DB, name-based mapping, non-destructive incl. **absent-column** preservation (H5: `created_at`+`is_per_guest_item`). Per-module Sheets EDIT/DELETE for budget/guests/hotels/vendors/gifts; all 9 `import*FromSheet` recalc correctly (P1/I1 fixed). | `sheets-roundtrip.c1b.test.ts`, `sheets-roundtrip.modules.test.ts` | **Live Sheets smoke** (real OAuth + throwaway spreadsheet) is a SEPARATE nightly job, SKIPPED in CI (no creds). transport/events/timeline Sheets engine shares the proven seam path but is asserted only via budget+4 modules, not each individually. `importEventsFromSheet` reachable only via `module='all'` (I3, info — router enum omits `events`; pairs with E1, UNVERIFIED-intentional). |
| **C2** Chatbot↔Sheet parity (real end-state) | Same guest-confirm op via chatbot vs Sheet on a fresh DB + per-guest item: client-stat recalc parity HOLDS; per-guest budget recalc parity now HOLDS (P1 fixed — Sheet runs `recalcPerGuestBudgetItems`). | `parity-chatbot-vs-sheet.c2.test.ts` | Parity asserted for the guest/budget recalc path; not every chatbot tool is cross-checked against its Sheet/Excel sibling (the recalc SSOT makes drift structurally unlikely, but only guest+budget are asserted end-to-end). |
| **C3** Informative headers (per-module) | Every data sheet has human-readable headers; editable modules (Guests/Hotels/Transport/Vendors/Budget/GiftsGiven/Events) mark required + give examples; no exported header leaks a raw snake_case column. | `headers-per-module.c3.test.ts`, `headers.c3.test.ts` | Timeline + (registry) Gifts remain view-oriented by design (handbook §G.8); not round-trippable from the combined export (acceptable, documented). |
| **C4** Real-time delivery (true cross-tab) | NEW + EXISTING entity: creating a guest / editing the seeded budget delivers the right `*.` queryPaths through the real `broadcastSync→Redis/SRH→subscribeToCompany` live-stream to a SECOND consumer. | `realtime.c4.test.ts`, `perf-t2-crosstab.c7.test.ts` | **Full two-browser SSE hop is NOT exercised** (see "Two-browser limitation" below). The HTTP/SSE transport frame + client-side React-Query invalidate/refetch/render is measured by inference, not by a real browser. |
| **C5** Vendors per event | `eventId=uuid` returns only that event's links; `eventId='unassigned'` returns only NULL-event links; no `eventId` returns all client links. | `vendors-per-event.c5.test.ts` | None known for this concern. |
| **C6** Whole-app bulletproof gate | Full audit suite green (21 files / 72) on the proven test DB; teardown-twice → 0 residual tenant rows (idempotent reset). | full audit suite + `00-foundation.smoke.test.ts` | The audit suite covers the audited surfaces (import/export, realtime, tenant-isolation, parity, headers, perf) — NOT every one of the app's 52 routers. Untested routers are out of audit scope, not proven-correct. |
| **C7** Performance / tiered SLO (measured P50/P95) | **T1** mutation ack P50 7ms / P95 14ms (<500 ✓). **T2 publish** P50 7 / P95 7ms. **T2 true cross-tab delivery** P50 306 / P95 310ms (min 57, max 310) — <2s hard gate ✓, <1.5s target ✓ (dominated by the 300ms adaptive poll floor). **T3** 23-table cascade delete, fresh+legacy = 22ms — SYNCHRONOUS, classified blocking, under the <2s ceiling ✓. | `perf.c7.test.ts` (T1/T2-publish/T3), `perf-t2-crosstab.c7.test.ts` (T2 delivery) | T2 delivery excludes the browser render hop (see below). T3 measured on the seeded tenant volume; very large tenants (10k+ guests) not load-tested. |

---

## Explicit known gaps (carried forward — NOT regressions)

### 1. Within-tenant residuals (Cluster S — OUT OF SCOPE; Cluster S = cross-TENANT only)
None is a cross-tenant breach (all confirmed by the convergence sweep + prior security-review). Candidates for a future **intra-tenant authorization pass**:
- **sms aggregates** (`getSmsLogs`/`getSmsStats`) scope by **company**, not by staff↔client assignment — a staff member sees company-wide SMS aggregates, not only their assigned clients.
- **`payment.createPaymentIntent`** allows own-clientId + a same-company invoiceId (no per-staff-assignment check).
- **`floorPlans.addGuestConflict`** does not verify the supplied guestIds belong to the (own) client.
- **NEW this sweep (noted, not counted): `vendors.addReview`** (`vendors.router.ts:1807-1842`) — `company_admin` path scopes the vendor to `ctx.companyId` (`:23`) but does not re-verify the top-level `input.clientId`. The review attaches to an **in-company** vendor; a cross-tenant breach is NOT possible (it can at worst tag a foreign clientId onto an own-tenant review row — a within-tenant integrity quirk). Add to the intra-tenant pass.

### 2. Deferred gifts `guestId` → foreign-guest-name observation (intra-tenant)
`gifts.router` read-join (`gifts ⋈ guests` on `guestId`) and `gifts.create/update` do not verify the supplied `guestId` belongs to the gift's own client, so a gift could surface/attach a same-tenant-but-different-client guest's name. INTRA-tenant only (no cross-company exposure). Candidate for the Cluster-S intra-tenant follow-up; not introduced by this audit.

### 3. Two-browser SSE limitation (T2 / C4)
T2 propagation is measured END-TO-END across the real `broadcastSync → Redis/SRH (ZADD) → subscribeToCompany live-stream` chain (client A mutates, client B — the same async generator every SSE subscriber consumes — observes), P50 306 / P95 310ms. The **full two-browser Playwright variant** (live HTTP/SSE frame + client-side React-Query invalidate/refetch/render) is **BLOCKED**: the auth secrets needed to boot an authenticated dev server against the test DB are absent from `.env.local` + `.env.test.local` (`BETTER_AUTH_SECRET`, `TOKEN_ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_APP_URL`, the SUPABASE key). The server-side delivery measurement is faithful for everything up to the browser render hop; the render hop itself is unmeasured.

### 4. RLS fail-closed DB backstop — PENDING (Prompt 6B)
Cluster S is fixed at the **application** layer (every site routes through `assertClientAccess`/`assertEntityAccess`/`withinCompanyClients`). The **DB-level RLS fail-closed backstop** — `app.current_company_id` + RLS policies on the tenant tables that lack an explicit `companyId` (so a future missing app-level check FAILS CLOSED instead of leaking) — is **NOT yet landed**. SCOPE CORRECTION: the "11 child tables" cited earlier (INVENTORY.md) was only the IDOR-sweep-**reachable** child subset; a full schema scan shows **~33+ tables in `schema-features.ts` alone (of ~98 tenant tables total) lack an explicit `companyId`** (parent-FK scoped only). So the 6B RLS backstop must cover the full set, not 11. The test DB role is superuser (RLS bypassed), so this phase proves the app-level scope, which is the prod reality for these tRPC paths today; RLS is defense-in-depth scheduled for **Prompt 6B**. Until then, a NEW unscoped resolver would not be caught by the DB (only by the app-level convergence sweep + the contract test planned for 6B).

### 5. downloadTemplate single-sourcing — vendor DATA drift FIXED (6A.2); gifts = 1 by-design exception
[6A.1] `import.router.ts downloadTemplate` renders its 6 "clean" modules (guests, budget,
hotels, transport, guestGifts, events) from `MODULE_SHAPES` via `buildExportSheet` — so the
import-template headers ARE the combined-export SSOT headers (guarded by
`downloadtemplate-shape-contract.test.ts`, 6/6).

- **vendors — FIXED [6A.2].** The combined-export → re-import per-link **data loss** is resolved.
  Root cause: the combined export read the **bare global `vendors` table** (`export.router.ts:62`),
  so the §G.6 per-link columns (Event, Contract Amount, Service Date, Deposit, Approval, On-Site
  POC, Deliverables…) rendered **blank** — and because the importer is non-destructive on
  HEADER-presence (`buildPresentUpdate`/`excel-parser-server.ts:744`; a present-but-blank column
  overwrites), a full-workbook re-import silently CLEARED those fields on un-edited vendors. Fix
  (data-side analogue of Cluster E's shape SSOT): a shared `fetchClientVendorExportRows`
  (`src/lib/export/vendor-export-data.ts`) fetches per-client `clientVendors`-enriched rows and is
  used by **BOTH** the combined export (`export.router.ts`) **AND** `downloadTemplate('vendors')`
  (`import.router.ts`), so the combined export now populates the per-link columns and round-trips
  them faithfully. The importer's header-presence semantics is **deliberately kept** (verified
  against handbook §G.3 "non-destructive = a narrower file never nulls *absent* columns", and it is
  consistent across budget/hotels/transport/vendors/events): clearing a cell remains the intended
  **explicit per-field unassign**, so blank≠no-change is correct — the bug was the export emitting
  blanks, not the importer. Regression test:
  `excel-roundtrip.vendors-combined.test.ts` (combined export POPULATES per-link cols · un-edited
  re-import KEEPS every per-link field · explicit cell-clear STILL unassigns, others preserved) —
  proven RED without the export fix. NOTE: the `vendors` column SHAPE stays inline in
  downloadTemplate (snake_case template vs `MODULE_SHAPES` camelCase) — a cosmetic shape-SSOT
  follow-up, not data-affecting; the DATA source is now single-sourced.
- **gifts** — `downloadTemplate('gifts')` is the gift-**REGISTRY** single sheet (the `gifts`
  table: name/value/status/guestId), a different feature/table from the combined export's gift-
  **DELIVERY** sheet (`guest_gifts` → `GiftsGiven`, which IS single-sourced as `guestGifts`).
  Per handbook §G.7 "two-table split" these are intentionally distinct and must not be merged.

### 6. Audit-scope boundary
The audit proves the **audited surfaces** (spreadsheet import/export, realtime sync, tenant isolation across all 52 routers, chatbot↔sheet parity, headers, tiered perf). It does NOT claim every feature of the app is bug-free — untested routers/flows are out of scope, not certified. Dependency currency (12 vulns, 0 high/critical; firebase-admin/googleapis major-lag) is REPORT-ONLY, no upgrade this audit.
