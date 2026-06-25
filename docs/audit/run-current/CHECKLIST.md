# CHECKLIST — 7 concerns as runnable pass/fail assertions

PASS requires a GREEN test logged in STATE.md (Rail 7). All prior "FIXED" = UNVERIFIED until
a test runs the behavior. Tests assert by RUNNING, not reading.

## Concern 1a — Excel round-trip (exceljs) [maps F1]
For EACH module {guests, budget, hotels, transport, vendors, gifts, timeline, events}, a REAL
.xlsx round-trip (not header-only) must assert:
- [ ] 1a.1 EDIT: change one cell → re-import → that column updates on the matched `ID` record.
- [ ] 1a.2 ADD: new row (no ID) → re-import → inserts a new record scoped to the client.
- [ ] 1a.3 DELETE: row with Action=DELETE/REMOVE → re-import → record removed.
- [ ] 1a.4 NON-DESTRUCTIVE: a column absent from the file is NOT overwritten/nulled.
- [ ] 1a.5 CASCADE fired: assert the module's downstream automation ran (e.g. guest import →
      recalcClientStats + recalcPerGuestBudgetItems; vendor → syncVendorBudgetItem; hotel/
      transport/events → sync*ToTimelineTx) AND broadcastSync emitted the right queryPaths.
- [ ] 1a.6 VALIDATION: confirm inline guests/guestGifts importers call `validateExcelFile()`
      (defect D1) — assert at runtime.

## Concern 1b — Google Sheets round-trip (googleapis) [maps F2]
Via FakeSheetsClient DI seam (deterministic) for the same module matrix:
- [ ] 1b.1-1b.5 EDIT/ADD/DELETE/NON-DESTRUCTIVE/CASCADE as in 1a, through the Sheets path.
- [ ] 1b.6 OAuth refresh path exercised (token expiry → refreshAccessToken).
- [ ] 1b.7 Name-based column mapping holds when column order differs from Excel.
- [ ] 1b.8 LIVE smoke (separate nightly/manual job): real OAuth + throwaway sheet ID round-trip.
      If creds/sheet not supplied → SKIPPED (recorded), seam still gates CI.

## Concern 2 — Chatbot parity [maps F3]
- [ ] 2.1 Each mutation tool fires the SAME automation set as the UI/import path (recalc/sync).
- [ ] 2.2 Each tool's invalidation = the shared `*_MUTATION_PATHS` const (no drift).
- [ ] 2.3 Verified against real DB via the integration harness (add/edit/delete each domain).

## Concern 3 — Informative headers [maps F1/F2]
- [ ] 3.1 Every export header (Excel + Sheets) is a human-readable display name; no raw
      snake_case / DB column name leaks to the client file.
- [ ] 3.2 Hint row / required `*` markers present where the handbook §G specifies.

## Concern 4 — Real-time for NEW and EXISTING entities [maps F4/F5/F6/F8]
- [ ] 4.1 Mutation in tab A invalidates the correct queryPaths in tab B for a NEWLY-created
      client/vendor (T2 propagation).
- [ ] 4.2 Same for a PRE-EXISTING client/vendor.
- [ ] 4.3 broadcastSync never throws (failure is best-effort, mutation still persists).

## Concern 5 — Vendors segregated per event [maps F7/F10]
- [ ] 5.1 getAll(eventId=uuid) → only that event's vendors.
- [ ] 5.2 getAll(eventId='unassigned') → eventId IS NULL only.
- [ ] 5.3 getAll(no eventId) → all client vendors.
- [ ] 5.4 Excel + Sheets `Event` column round-trips to clientVendors.eventId + syncs budget item.

## Concern 6 — Whole-app bulletproof gate
- [ ] 6.1 `npx tsc --noEmit` → 0 errors.
- [ ] 6.2 `npx vitest run` → all green (unit + integration).
- [ ] 6.3 `npm run build` → all routes compile.
- [ ] 6.4 `npx drizzle-kit check` → "Everything's fine".
- [ ] 6.5 E2E smoke (Playwright) green against the running app on the test DB.
- [ ] 6.6 Client soft-delete cascade leaves zero orphans across 23 tables (F9).

## Concern 7 — Performance (TIERED SLO; all P95, MEASURED, recorded in STATE.md; FAIL over budget)
Harness timestamps a mutation and polls until settled — never fixed sleeps. Record P50/P95.
- [ ] 7.1 T1 interactive mutation ack (server-side) P95 < 500ms — primary gate.
- [ ] 7.2 T2 propagation (mutation→broadcast→SSE deliver→other-client invalidate) P95 < 2s
      (target < 1.5s; floor ~1s = 500ms poll). Test on NEW and EXISTING entities.
- [ ] 7.3 T3 23-table client cascade delete — MEASURE first, then classify:
      if blocking → ceiling P95 < 2s + flag async/optimistic-UI candidate;
      if async → ack P95 < 500ms + settled signal P95 < 5s.
      Test on a freshly-seeded AND a legacy back-filled client.
