# INVENTORY — WeddingFlo Re-Audit (run-current)

Read-only recon captured in Prompt 0 (verified against code). Counts are live-grep
values that supersede stale figures in older audit docs; to be re-confirmed in the
harness phase. Every entry cites file:line.

## tRPC API layer
- Main router: `src/server/trpc/routers/_app.ts:97-170` — 53 sub-routers.
- Procedure builders: `src/server/trpc/trpc.ts` — `publicProcedure` (:54, none),
  `protectedProcedure` (:77, BetterAuth required), `adminProcedure` (:113, company_admin
  / super_admin), `staffProcedure` (:150, role staff+ with `assertClientAccess` +
  companyId context), `superAdminProcedure` (:202, super_admin only).
- Key routers: clients (clients/server/routers), guests (guests/...), vendors + events +
  timeline + hotels + guestTransport + gifts + floorPlans (events/...), budget
  (analytics/...), import + export (analytics/...), googleSheets (backup/...), chatbot
  (chatbot/server, registered `_app.ts:163`), sync (`src/server/trpc/routers/sync.router.ts`,
  `_app.ts:166`).

## Drizzle schema
- Core auth: `src/lib/db/schema.ts` (BetterAuth `user`/`session`/`account`/`verification`,
  webhookEvents, rateLimitEntries).
- Features: `src/lib/db/schema-features.ts` (+ schema-chatbot/-pipeline/-proposals/
  -workflows/-questionnaires/-invitations/-esignature).
- Soft-delete (`deletedAt`): clients, hotels, events, timeline, messages, weddingWebsites,
  accommodations.
- **Tenant-isolation observation (out-of-6-scope, security)**: many tenant tables lack an
  explicit `companyId` column (scoped only via parent FK). The 11 named here were just the
  IDOR-sweep-**reachable** child subset — vendorComments(:419), floorPlanTables(:660),
  floorPlanGuests(:679), giftItems(:730), websiteBuilderContent(:788), hotelBookings(:866),
  guestPreferences(:902), refunds(:988), seatingChangeLog(:999), seatingVersions(:1010),
  teamClientAssignments(:1054). **COUNT CORRECTION (6A.1):** a full schema scan shows the real
  number is far larger — **~33+ tables in `schema-features.ts` alone (of ~98 tenant tables
  across all schema files) have NO explicit `companyId`**. So the Prompt-6B RLS fail-closed
  backstop must add `companyId` + RLS to the FULL set, not 11 (see KNOWN_GAPS.md §4). Report
  only; do not fix this pass.

## Vendor–event model (concern 6)
- `vendors` (schema-features.ts:361) = company master list, NO eventId (reused across events).
- `clientVendors` (schema-features.ts:384) = join row: `clientId` + `vendorId` + `eventId`
  FK (`event_id … references events.id onDelete set null`) → per-event segregation.
- Server-side filter implemented: `vendors.router.ts:59-66` input
  `eventId: union(uuid, 'unassigned').optional()`; where clause `:135-143` →
  `'unassigned'` ⇒ `isNull(clientVendors.eventId)`, uuid ⇒ `eq(...eventId)`, omit ⇒ all.

## Real-time transport (concern 4/5)
- Mechanism: **Redis sorted-set + tRPC SSE subscription** (NOT persistent pub/sub).
- Publish: `broadcastSync()` `src/lib/realtime/broadcast-sync.ts:16` →
  `storeSyncAction()` `src/lib/realtime/redis-pubsub.ts:85` (ZADD `sync:{companyId}:actions`).
- Consume: `sync.onSync` `src/server/trpc/routers/sync.router.ts:36` →
  client `useRealtimeSync` `src/features/realtime/hooks/use-realtime-sync.ts:61` →
  `invalidateQueryPaths()` `src/lib/realtime/invalidate-query-paths.ts:11`.
- Poll cadence: adaptive ~300ms active → 2s idle (500ms is the design floor for SLO T2).
- Live counts: `broadcastSync(` = **159 invocations / 30 files**; `recalcClientStats(` =
  **38 call sites**; phantom paths (`guests.list`/`budget.getItems`/`vendors.list`) = **0**.

## Excel path (concern 1a, exceljs)
- Export: `src/lib/export/excel-exporter.ts` — exportGuestListExcel(:355),
  exportBudgetExcel(:655), exportHotelListExcel(:754), exportVendorListExcel(:1002),
  exportGuestGiftListExcel(:1186), exportGuestTransportExcel(:1674), exportTimelineExcel(:2291).
  Each emits leading `ID` + trailing `Action`.
- LIVE import paths:
  - Server parsers `src/lib/import/excel-parser-server.ts` — importBudgetExcel(:82),
    importHotelsExcel(:261), importTransportExcel(:407), importVendorsExcel(:555),
    importEventsExcel(:834). All call `validateExcelFile()` first.
  - Inline in `import.router.ts` — importGuest(~:1218), importGuestGift(~:1109).
    **UNVERIFIED defect D1**: inline path may NOT call `validateExcelFile()` (rule 28).
  - Client parser `excel-parser.ts` — importTimelineExcel(:1071) feeds timeline bulkImport.
- DEAD code: `excel-parser.ts::importGuestListExcel`, `::importGiftsExcel` (never called).
- Cascades fired on import: recalcClientStats / recalcPerGuestBudgetItems / syncVendorBudgetItem
  / cascadeVendorLinkDelete / syncHotelsToTimelineTx / syncTransportToTimelineTx /
  syncEventsToTimelineTx / broadcastSync (per module, see FLOWS).
- Existing test: `src/lib/import/__tests__/excel-roundtrip-contract.test.ts` — header-only
  (in-memory maps). **No real .xlsx / no DB upsert/delete/cascade assertion** (defect D3).

## Google Sheets path (concern 1b, googleapis)
- OAuth: `src/lib/google/sheets-client.ts` — getAuthUrl(:40), getTokensFromCode(:52),
  refreshAccessToken(:66); scopes :13-16.
- Token crypto: `src/lib/crypto/token-encryption.ts` — AES-256-GCM(:43), 12-byte IV(:46),
  16-byte tag(:49), key from `TOKEN_ENCRYPTION_KEY`(:67-87), encryptToken(:106)/decryptToken(:153).
- Sync engine: `src/lib/google/sheets-sync.ts` — *_HEADERS(:173-222), per-module
  sync*ToSheet + import*FromSheet fns, applySheetRowDelete(:832), broadcastSheetSync(:227),
  importAllFromSheets(:1914). Reads by column NAME (`getValue`/`headers.indexOf`). Write
  mode USER_ENTERED (reformats phones/dates — accepted risk).
- Router: `src/features/backup/server/routers/googleSheets.router.ts` — getAuthUrl(:44),
  handleOAuthCallback(:54), syncNow(:139), importFromSheet(:343), importAllFromSheets(:400);
  all `protectedProcedure`.
- **Defect D2**: no mock/DI seam → not testable offline. Harness adds FakeSheetsClient seam
  (single authorized src/ change).

## Chatbot path (concern 2/3, openai)
- Executor: `tool-executor.ts` — executeTool(:353), executeToolWithSync(:571); per-tool fns
  e.g. executeAddGuest(:1417), executeUpdateGuestRsvp(:1565), executeCreateEvent(:1805),
  executeUpdateEvent(:1975), executeAddVendor(:2287), executeUpdateVendor(:2468),
  executeAddHotelBooking(:2660), executeUpdateBudgetItem(:2881), executeDeleteGuest(:6623),
  executeDeleteVendor(:6856). All wrap `withTransaction`.
- Parity: `query-invalidation-map.ts:30` TOOL_QUERY_MAP imports the SAME shared
  `*_MUTATION_PATHS` consts from `src/lib/sync/cascade-query-paths.ts` used by UI routers
  + import router → cannot drift.
- Integration harness: `vitest.integration.config.ts` + `_harness.ts` (seeds isolated
  tenant in real Postgres) + tests under
  `src/features/chatbot/server/services/__tests__/integration/` (00-smoke, 10-guests,
  20-vendors-budget, 30-events-timeline, 40-clients-hotels-transport-gifts).

## Test infra
- Unit: vitest 4.1 (`vitest.config.*`), ~24 `*.test.ts` under `src`.
- Integration: `vitest.integration.config.ts` (node env, serial, real Postgres).
- E2E: @playwright/test 1.59, `e2e/` (auth.setup.ts, 8 specs, global-setup, helpers),
  `tests/security/`. Playwright MCP tools available in-session.
- node v24.9.0, npm 11.6.1.
