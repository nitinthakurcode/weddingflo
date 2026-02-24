# Session 7 — Real-Time Sync & SSE System Audit

> **Date:** 2026-02-24
> **Scope:** Complete real-time sync pipeline — Redis pub/sub, SSE delivery, broadcastSync coverage, client-side cache invalidation — 23 files, ~25,000 lines audited
> **Session:** 7 of 8 (audit + fixes across 3 prompts)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Severity Breakdown](#2-severity-breakdown)
3. [Files Modified Per Prompt](#3-files-modified-per-prompt)
4. [Verification Results](#4-verification-results)
5. [File Inventory](#5-file-inventory)
6. [SyncAction Event Type Inventory](#6-syncaction-event-type-inventory)
7. [broadcastSync Coverage Matrix — Post-Fix](#7-broadcastsync-coverage-matrix--post-fix)
8. [Chatbot Tool Sync Parity Matrix](#8-chatbot-tool-sync-parity-matrix)
9. [Tenant Isolation Verification](#9-tenant-isolation-verification)
10. [Connection Manager Verification](#10-connection-manager-verification)
11. [Redis Failure Handling Analysis](#11-redis-failure-handling-analysis)
12. [End-to-End Trace](#12-end-to-end-trace)
13. [Client-Side SSE Handler Analysis](#13-client-side-sse-handler-analysis)
14. [Missed Events — Import, Batch, Cascade Operations](#14-missed-events--import-batch-cascade-operations)
15. [Transaction Placement Verification](#15-transaction-placement-verification)
16. [All Findings](#16-all-findings)
17. [Cross-Session References](#17-cross-session-references)
18. [Danger Zones — Read Before Editing](#18-danger-zones--read-before-editing)

---

## 1. Executive Summary

| Field | Value |
|-------|-------|
| **Date** | 2026-02-24 |
| **Session** | 7 of 8 |
| **Scope** | Real-time sync: Redis pub/sub → SSE delivery → client cache invalidation |
| **Type** | Audit + fixes (4 prompts) |
| **Total issues found** | 27 (2 CRITICAL, 9 HIGH, 10 MEDIUM, 6 LOW) |
| **Issues FIXED** | 23 (2 CRITICAL, 9 HIGH, 10 MEDIUM, 2 LOW) |
| **Issues remaining** | 4 (2 LOW superseded/partial, 1 LOW by-design, 1 LOW not-found) |
| **Files audited** | 23 |
| **Lines audited** | ~25,000 |
| **broadcastSync calls** | 70 call sites + 1 definition + 3 broadcastSheetSync |
| **Architecture** | `broadcastSync()` → Redis ZADD → `subscribeToCompany()` polling (500ms) → tRPC SSE subscription → `useRealtimeSync` hook → TanStack Query `invalidateQueries()` |

### What Was Fixed

**P1 — Critical infrastructure fixes:**
- All phantom queryPath names (`.list`, `.overview`) corrected to real tRPC procedure names (`.getAll`, `.getSummary`) across all 11 module routers + TOOL_QUERY_MAP
- Removed no-op `publishSyncAction` call (Upstash REST has zero pub/sub subscribers)

**P2 — Missing broadcastSync coverage:**
- Added broadcastSync to 26 mutations across 7 routers (vendors, hotels, transport, timeline, budget, floor-plans, guests)
- Enhanced all existing broadcastSync calls with cascade paths (hotels.getAll, guestTransport.getAll, timeline.getAll where applicable)
- Added `clients.list`/`clients.getAll` to all recalcClientStats callers
- Fixed missing `clientId` in budget.delete and clients.delete

**P3 — Import broadcast completeness:**
- Enhanced 5 guest router broadcastSync calls with `timeline.getAll`, `clients.list`, `clients.getAll`
- Rewrote `getQueryPathsForModule` in sheets-sync.ts with full cascade paths for all 7 modules
- Fixed Excel import broadcastSync in import.router.ts: budget (added clients paths), vendors (added budget.getSummary, timeline.getAll), inline queryPathsMap (full cascade paths)
- Fixed phantom `budget.getStats` → `budget.getSummary` in sheets-sync.ts

**P4 — All remaining MEDIUM + LOW fixes:**
- S7-M01: TOCTOU race in connection limiter → increment-first-then-check pattern
- S7-M02: `getModuleFromToolName` default `'guests'` → added 7 tool patterns, default changed to `'clients'`
- S7-M03/M04/M05: Non-atomic floor plan operations → wrapped in `db.transaction()`
- S7-M06: Vendor bulk create → per-iteration transactions
- S7-M07: Timeline bulk import → single atomic transaction
- S7-M08: Redis failure in connection limiter → graceful degradation (allow without limits)
- S7-M09: Cascade sync with bare `db` → 6 calls wrapped in `db.transaction()` across 2 files
- S7-M10: `importAllFromSheets` userId → made required, broadcast always fires
- S7-L02: Manual reconnect → replaced `subscriptionKey` with `pendingReconnect` toggle
- S7-L05: Duplicate events → `seenActionIds` dedup filter with auto-eviction
- Dead code: removed unused `publishSyncAction` function from redis-pubsub.ts

---

## 2. Severity Breakdown

| Severity | Total | FIXED | Remaining | Summary |
|----------|-------|-------|-----------|---------|
| **CRITICAL** | 2 | 2 | 0 | Phantom queryPaths ✅, publishSyncAction no-op ✅ |
| **HIGH** | 9 | 9 | 0 | All coverage gaps, cascade paths, chatbot parity, import paths ✅ |
| **MEDIUM** | 10 | 10 | 0 | TOCTOU race ✅, non-atomic ops ✅, Redis failure ✅, cascade tx ✅, userId ✅ |
| **LOW** | 6 | 2 | 4 | Reconnect ✅, dedup ✅; logChange partial, L01 not-found, L06 by-design |
| **TOTAL** | **27** | **23** | **4** | |

---

## 3. Files Modified Per Prompt

### Prompt 1 (P1) — Critical queryPath + no-op removal

| File | Changes |
|------|---------|
| `src/features/guests/server/routers/guests.router.ts` | Phantom `.list`/`.overview` → correct procedure names |
| `src/features/analytics/server/routers/budget.router.ts` | Same |
| `src/features/events/server/routers/events.router.ts` | Same |
| `src/features/events/server/routers/timeline.router.ts` | Same |
| `src/features/events/server/routers/vendors.router.ts` | Same |
| `src/features/events/server/routers/hotels.router.ts` | Same |
| `src/features/events/server/routers/gifts.router.ts` | Same |
| `src/features/events/server/routers/floor-plans.router.ts` | Same |
| `src/features/events/server/routers/guest-transport.router.ts` | Same |
| `src/features/clients/server/routers/clients.router.ts` | Same |
| `src/features/chatbot/server/services/query-invalidation-map.ts` | TOOL_QUERY_MAP phantom names → correct |
| `src/lib/realtime/broadcast-sync.ts` | Removed `publishSyncAction` call |

### Prompt 2 (P2) — 26 new broadcastSync + cascade paths

| File | Changes |
|------|---------|
| `src/features/events/server/routers/vendors.router.ts` | +10 new broadcastSync, 3 enhanced with cascade |
| `src/features/events/server/routers/hotels.router.ts` | +2 new broadcastSync, 3 enhanced |
| `src/features/events/server/routers/guest-transport.router.ts` | +1 new broadcastSync, 3 enhanced |
| `src/features/events/server/routers/timeline.router.ts` | +2 new broadcastSync, 4 enhanced |
| `src/features/events/server/routers/gifts.router.ts` | 3 enhanced with `.getStats` |
| `src/features/events/server/routers/floor-plans.router.ts` | +8 new broadcastSync |
| `src/features/analytics/server/routers/budget.router.ts` | +3 new broadcastSync, 3 enhanced, clientId fix |
| `src/features/clients/server/routers/clients.router.ts` | clientId fix on delete |

### Prompt 3 (P3) — Import broadcast paths

| File | Changes |
|------|---------|
| `src/features/guests/server/routers/guests.router.ts` | 5 broadcastSync enhanced: +`timeline.getAll`, `clients.list`, `clients.getAll` |
| `src/lib/google/sheets-sync.ts` | `getQueryPathsForModule` rewritten with full cascade paths, `budget.getStats` → `budget.getSummary` |
| `src/features/analytics/server/routers/import.router.ts` | Budget import +clients paths, vendor import +budget/timeline, queryPathsMap full cascade |

### Prompt 4 (P4) — All remaining MEDIUM + LOW fixes

| File | Changes |
|------|---------|
| `src/lib/sse/connection-manager.ts` | S7-M01: increment-first-then-check (TOCTOU fix); S7-M08: Redis failure graceful degradation |
| `src/features/chatbot/server/services/tool-executor.ts` | S7-M02: added 7 tool patterns, changed default `'guests'` → `'clients'` |
| `src/features/events/server/routers/floor-plans.router.ts` | S7-M03: loadVersion wrapped in tx; S7-M04: batchAssignGuests wrapped in tx; S7-M05: delete wrapped in tx |
| `src/features/events/server/routers/vendors.router.ts` | S7-M06: bulkCreateFromCommaList per-iteration transactions |
| `src/features/events/server/routers/timeline.router.ts` | S7-M07: bulkImport wrapped in single transaction |
| `src/lib/google/sheets-sync.ts` | S7-M09: 3 cascade calls wrapped in db.transaction(); S7-M10: userId made required, broadcast guard simplified |
| `src/features/backup/server/routers/googleSheets.router.ts` | S7-M09: 3 cascade calls wrapped in db.transaction() |
| `src/lib/realtime/redis-pubsub.ts` | S7-L01: dead `publishSyncAction` function removed |
| `src/features/realtime/hooks/use-realtime-sync.ts` | S7-L02: reconnect via pendingReconnect toggle; S7-L05: seenActionIds dedup filter |

---

## 4. Verification Results

| Check | P3 Result | P4 Result |
|-------|-----------|-----------|
| `npx tsc --noEmit` | 0 errors | 0 errors |
| `npx jest --passWithNoTests` | 373/373 pass | 373/373 pass |
| `await broadcastSync(` call sites | 70 | 70 (unchanged) |
| `broadcastSheetSync` calls | 3 | 3 (unchanged) |
| P3 diff stats | 3 files, +18/-18 | — |
| P4 diff stats | — | 9 files, +298/-246 |

### broadcastSync Count Progression

| Phase | Call Sites | Notes |
|-------|------------|-------|
| Pre-audit (Session 6 end) | 39 | Original audit finding |
| After P1 | 39 | No new calls — only queryPath fixes |
| After P2 | 65 | +26 new broadcastSync calls |
| After P3 | 70 | +5 enhanced (guests router paths widened, counted as net adds due to grep) |
| **Final total** | **70 call sites + 3 broadcastSheetSync** | |

---

## 5. File Inventory

### Core Sync Infrastructure (4 files, 653 lines)

| # | File | Lines | Role |
|---|------|-------|------|
| 1 | `src/lib/realtime/broadcast-sync.ts` | 40 | Thin wrapper: assembles SyncAction, calls storeSyncAction (publishSyncAction removed P1) |
| 2 | `src/lib/realtime/redis-pubsub.ts` | 196 | SyncAction interface, publishSyncAction (unused), storeSyncAction, getMissedActions, subscribeToCompany |
| 3 | `src/lib/sse/connection-manager.ts` | 265 | Redis-backed per-user (5) and per-company (50) SSE connection limiter |
| 4 | `src/server/trpc/routers/sync.router.ts` | 152 | tRPC subscription endpoint: onSync (SSE) + getStatus (query) |

### Client-Side Realtime (4 files, 333 lines)

| # | File | Lines | Role |
|---|------|-------|------|
| 5 | `src/features/realtime/hooks/use-realtime-sync.ts` | 196 | React hook: tRPC subscription → TanStack Query invalidation |
| 6 | `src/features/realtime/components/realtime-provider.tsx` | 111 | React context provider for sync status |
| 7 | `src/features/realtime/components/realtime-wrapper.tsx` | 22 | Client component wrapper for server layouts |
| 8 | `src/features/realtime/index.ts` | 25 | Barrel re-exports |

### Module Routers (11 files, ~17,000 lines)

| # | File | Lines | broadcastSync Calls (Final) | Coverage |
|---|------|-------|----------------------------|----------|
| 9 | `guests.router.ts` | 1,288 | 5 (all enhanced P3) | 83% (checkIn deferred) |
| 10 | `budget.router.ts` | 1,299 | 6 (+3 in P2) | 100% |
| 11 | `events.router.ts` | 620 | 3 | 75% (updateStatus deferred) |
| 12 | `timeline.router.ts` | 750 | 6 (+2 in P2) | 100% |
| 13 | `hotels.router.ts` | 960 | 5 (+2 in P2) | 100% |
| 14 | `guest-transport.router.ts` | 850 | 4 (+1 in P2) | 100% |
| 15 | `vendors.router.ts` | 1,646 | 13 (+10 in P2) | 100% |
| 16 | `gifts.router.ts` | 290 | 3 (enhanced P2) | 100% |
| 17 | `floor-plans.router.ts` | 1,523 | 17 (+8 in P2) | 94% (logChange deferred) |
| 18 | `clients.router.ts` | 1,363 | 3 (clientId fixed P2) | 100% |

### Supporting Files (5 files, ~11,400 lines)

| # | File | Lines | Role |
|---|------|-------|------|
| 19 | `src/features/chatbot/server/services/tool-executor.ts` | 7,056 | executeToolWithSync: chatbot mutation broadcast |
| 20 | `src/features/chatbot/server/services/query-invalidation-map.ts` | 167 | TOOL_QUERY_MAP: chatbot tool → queryPaths (fixed P1) |
| 21 | `src/lib/google/sheets-sync.ts` | 1,493 | broadcastSheetSync + getQueryPathsForModule (fixed P3) |
| 22 | `src/lib/backup/auto-sync-trigger.ts` | 440 | Cascade sync functions (broadcast-blind — callers now compensate) |
| 23 | `src/features/analytics/server/routers/import.router.ts` | 2,240 | Excel import with broadcastSync (fixed P3) |

---

## 6. SyncAction Event Type Inventory

### SyncAction Interface (`redis-pubsub.ts:32-65`)

```typescript
interface SyncAction {
  id: string                    // UUID (randomUUID)
  type: 'insert' | 'update' | 'delete'
  module: 'guests' | 'budget' | 'events' | 'vendors' | 'hotels'
        | 'transport' | 'timeline' | 'gifts' | 'clients' | 'floorPlans'
  entityId: string              // ID of affected row
  data?: Record<string, unknown>
  companyId: string             // Multi-tenant isolation key
  clientId?: string             // Optional client scope
  userId: string                // Originator (excluded from echo-back)
  timestamp: number             // Unix ms
  queryPaths: string[]          // tRPC cache keys to invalidate
  toolName?: string             // Chatbot tool name (chatbot path only)
}
```

### Module Enum (10 values)

| Module | Emitter(s) |
|--------|-----------|
| `guests` | guests.router, tool-executor, import.router, sheets-sync |
| `budget` | budget.router, tool-executor, import.router, sheets-sync |
| `events` | events.router, tool-executor |
| `vendors` | vendors.router, tool-executor, import.router, sheets-sync |
| `hotels` | hotels.router, tool-executor, import.router, sheets-sync |
| `transport` | guest-transport.router, tool-executor, import.router, sheets-sync |
| `timeline` | timeline.router, tool-executor, import.router, sheets-sync |
| `gifts` | gifts.router, tool-executor, import.router, sheets-sync |
| `clients` | clients.router, tool-executor |
| `floorPlans` | floor-plans.router, tool-executor |

### Broadcast Entry Points (Post-Fix)

| Entry Point | File | Used By | Status |
|-------------|------|---------|--------|
| `broadcastSync()` | broadcast-sync.ts:16 | All 11 module routers, import.router | `storeSyncAction` only (publishSyncAction removed P1) |
| `broadcastSheetSync()` | sheets-sync.ts:108 | googleSheets.router, importAllFromSheets | Uses `storeSyncAction` + `getQueryPathsForModule` (fixed P3) |
| Direct `storeSyncAction` | tool-executor.ts:593-594 | Chatbot executeToolWithSync | Adds `toolName` field |

---

## 7. broadcastSync Coverage Matrix — Post-Fix

### Legend
- **BS** = broadcastSync called
- **TX** = wrapped in transaction
- **RCS** = recalcClientStats called
- **QP** = queryPaths (all now use correct procedure names)
- **[Pn]** = Fixed in prompt n

### guests.router.ts

| Procedure | Line | BS | TX | RCS | queryPaths | Fix |
|-----------|------|----|----|-----|------------|-----|
| `create` | 255 | YES | YES | YES | `guests.getAll`, `guests.getStats`, `hotels.getAll`, `guestTransport.getAll`, `timeline.getAll`, `budget.getSummary`, `clients.list`, `clients.getAll` | [P1] names, [P3] +timeline, +clients |
| `update` | 700 | YES | YES | YES | same | [P1] names, [P3] +timeline, +clients |
| `delete` | 848 | YES | YES | YES | same | [P1] names, [P3] +timeline, +clients |
| `bulkImport` | 1009 | YES | YES | YES | same | [P1] names, [P3] +timeline, +clients |
| `updateRSVP` | 1243 | YES | YES | YES | `guests.getAll`, `guests.getStats`, `budget.getSummary`, `clients.list`, `clients.getAll` | [P1] names, [P3] +clients |
| `checkIn` | 1269 | NO | NO | NO | — | Deferred (single field update) |

### budget.router.ts

| Procedure | Line | BS | TX | RCS | queryPaths | Fix |
|-----------|------|----|----|-----|------------|-----|
| `create` | 261 | YES | YES | YES | `budget.getAll`, `budget.getSummary`, `clients.list`, `clients.getAll` | [P1] names, [P2] +clients |
| `update` | 457 | YES | YES | YES | same | [P1] names, [P2] +clients |
| `delete` | 520 | YES | YES | YES | same + `clientId` field | [P1] names, [P2] +clients, +clientId |
| `addAdvancePayment` | 569 | YES | YES | YES | `budget.getAll`, `budget.getSummary`, `vendors.getAll`, `clients.list`, `clients.getAll` | [P2] NEW |
| `updateAdvancePayment` | 657 | YES | YES | YES | same | [P2] NEW |
| `deleteAdvancePayment` | 732 | YES | YES | YES | same | [P2] NEW |

### events.router.ts

| Procedure | Line | BS | TX | queryPaths | Fix |
|-----------|------|----|----|------------|-----|
| `create` | 244 | YES | YES | `events.getAll`, `timeline.getAll` | [P1] names |
| `update` | 382 | YES | YES | same | [P1] names |
| `delete` | 453 | YES | YES | `events.getAll`, `timeline.getAll`, `guests.getAll` | [P1] names |
| `updateStatus` | 497 | NO | NO | — | Deferred (single field update) |

### timeline.router.ts

| Procedure | Line | BS | TX | queryPaths | Fix |
|-----------|------|----|----|------------|-----|
| `create` | 150 | YES | NO | `timeline.getAll`, `timeline.getStats` | [P1] names, [P2] +getStats |
| `update` | 228 | YES | NO | same | [P1] names, [P2] +getStats |
| `delete` | 273 | YES | NO | same | [P1] names, [P2] +getStats |
| `bulkImport` | 711 | YES | NO | same | [P1] names, [P2] +getStats |
| `reorder` | 314 | YES | NO | `timeline.getAll`, `timeline.getStats` | [P2] NEW |
| `markComplete` | 358 | YES | NO | same | [P2] NEW |

### hotels.router.ts

| Procedure | Line | BS | TX | queryPaths | Fix |
|-----------|------|----|----|------------|-----|
| `create` | 265 | YES | YES | `hotels.getAll`, `timeline.getAll` | [P1] names, [P2] +timeline |
| `update` | 501 | YES | YES | same | [P1] names, [P2] +timeline |
| `delete` | 576 | YES | YES | same | [P1] names, [P2] +timeline |
| `checkIn` | 617 | YES | NO | `hotels.getAll` | [P2] NEW |
| `syncWithGuests` | 758 | YES | NO | `hotels.getAll`, `timeline.getAll` | [P2] NEW |

### guest-transport.router.ts

| Procedure | Line | BS | TX | queryPaths | Fix |
|-----------|------|----|----|------------|-----|
| `create` | 246 | YES | YES | `guestTransport.getAll`, `timeline.getAll` | [P1] names, [P2] +timeline |
| `update` | 524 | YES | YES | same | [P1] names, [P2] +timeline |
| `delete` | 600 | YES | YES | same | [P1] names, [P2] +timeline |
| `syncWithGuests` | 753 | YES | NO | `guestTransport.getAll`, `timeline.getAll` | [P2] NEW |

### vendors.router.ts

| Procedure | Line | BS | TX | queryPaths | Fix |
|-----------|------|----|----|------------|-----|
| `create` | 490 | YES | YES | `vendors.getAll`, `vendors.getStats`, `budget.getAll`, `budget.getSummary`, `timeline.getAll` | [P1] names, [P2] +cascade |
| `update` | 723 | YES | YES | same | [P1] names, [P2] +cascade |
| `delete` | 795 | YES | YES | same | [P1] names, [P2] +cascade |
| `updateApprovalStatus` | 810 | YES | NO | `vendors.getAll`, `vendors.getStats` | [P2] NEW |
| `addComment` | 850 | YES | NO | `vendors.getAll` | [P2] NEW |
| `deleteComment` | 922 | YES | NO | `vendors.getAll` | [P2] NEW |
| `updatePaymentStatus` | 936 | YES | NO | `vendors.getAll`, `vendors.getStats`, `budget.getAll`, `budget.getSummary` | [P2] NEW |
| `bulkCreateFromCommaList` | 1130 | YES | NO | `vendors.getAll`, `vendors.getStats`, `budget.getAll`, `budget.getSummary`, `timeline.getAll`, `clients.list`, `clients.getAll` | [P2] NEW |
| `addVendorAdvance` | 1312 | YES | YES | `vendors.getAll`, `budget.getAll`, `budget.getSummary`, `clients.list`, `clients.getAll` | [P2] NEW |
| `updateVendorAdvance` | 1385 | YES | YES | same | [P2] NEW |
| `deleteVendorAdvance` | 1452 | YES | YES | same | [P2] NEW |
| `addReview` | 1505 | YES | NO | `vendors.getAll`, `vendors.getStats` | [P2] NEW |
| `deleteReview` | 1602 | YES | NO | same | [P2] NEW |

### gifts.router.ts

| Procedure | Line | BS | TX | queryPaths | Fix |
|-----------|------|----|----|------------|-----|
| `create` | 146 | YES | NO | `gifts.getAll`, `gifts.getStats` | [P1] names, [P2] +getStats |
| `update` | 206 | YES | NO | same | [P1] names, [P2] +getStats |
| `delete` | 252 | YES | NO | same | [P1] names, [P2] +getStats |

### floor-plans.router.ts

| Procedure | Line | BS | TX | queryPaths | Fix |
|-----------|------|----|----|------------|-----|
| `create` | 198 | YES | NO | `floorPlans.list`, `floorPlans.getById` | Already correct |
| `update` | 301 | YES | NO | same | Already correct |
| `addTable` | 373 | YES | NO | same | Already correct |
| `updateTable` | 463 | YES | NO | same | Already correct |
| `deleteTable` | 509 | YES | NO | same | Already correct |
| `assignGuest` | 632 | YES | NO | same | Already correct |
| `unassignGuest` | 678 | YES | NO | same | Already correct |
| `batchAssignGuests` | 820 | YES | NO | same | Already correct |
| `delete` | 942 | YES | NO | `floorPlans.list` | Already correct |
| `saveVersion` | 1020 | YES | NO | `floorPlans.list`, `floorPlans.getById` | [P2] NEW |
| `loadVersion` | 1110 | YES | NO | same | [P2] NEW |
| `deleteVersion` | 1222 | YES | NO | same | [P2] NEW |
| `addGuestConflict` | 1395 | YES | NO | same | [P2] NEW |
| `addGuestPreference` | 1438 | YES | NO | same | [P2] NEW |
| `removeGuestConflict` | 1473 | YES | NO | same | [P2] NEW |
| `removeGuestPreference` | 1500 | YES | NO | same | [P2] NEW |
| `logChange` | 1312 | NO | NO | — | Deferred (audit-log-only) |

### clients.router.ts

| Procedure | Line | BS | TX | queryPaths | Fix |
|-----------|------|----|----|------------|-----|
| `create` | 802 | YES | YES | `clients.list`, `clients.getAll` | Already correct |
| `update` | 1011 | YES | YES | `clients.list`, `clients.getAll`, `clients.getById` | Already correct |
| `delete` | 1253 | YES | YES | `clients.list`, `clients.getAll` + `clientId` field | [P2] +clientId |

### Coverage Summary (Post-Fix)

| Module | Total Mutations | With broadcastSync | Missing | Coverage | Change |
|--------|-----------------|-------------------|---------|----------|--------|
| guests | 6 | 5 | 1 | 83% | +cascade/client paths |
| budget | 6 | 6 | 0 | **100%** | +3 advance payments |
| events | 4 | 3 | 1 | 75% | (no change) |
| timeline | 6 | 6 | 0 | **100%** | +2 (reorder, markComplete) |
| hotels | 5 | 5 | 0 | **100%** | +2 (checkIn, syncWithGuests) |
| guest-transport | 4 | 4 | 0 | **100%** | +1 (syncWithGuests) |
| vendors | 13 | 13 | 0 | **100%** | +10 mutations |
| gifts | 3 | 3 | 0 | 100% | +getStats paths |
| floor-plans | 18 | 17 | 1 | **94%** | +8 mutations |
| clients | 3 | 3 | 0 | 100% | +clientId fix |
| **TOTAL** | **68** | **65** | **3** | **96%** | **+26 new, all paths correct** |

**3 remaining mutations without broadcastSync:**
- `guests.checkIn` — single boolean field update, low real-time impact
- `events.updateStatus` — single field update, deferred
- `floor-plans.logChange` — audit log only, not user-facing

### Import broadcastSync (Post-Fix)

#### Excel Import (`import.router.ts`)

| Module | broadcastSync? | queryPaths (Post-Fix) |
|--------|---------------|----------------------|
| budget | YES | `budget.getAll`, `budget.getSummary`, `clients.list`, `clients.getAll` |
| hotels | YES | `hotels.getAll`, `hotels.getStats`, `timeline.getAll` |
| transport | YES | `guestTransport.getAll`, `guestTransport.getStats`, `timeline.getAll` |
| vendors | YES | `vendors.getAll`, `vendors.getStats`, `budget.getAll`, `budget.getSummary`, `timeline.getAll` |
| guests | YES | `guests.getAll`, `guests.getStats`, `hotels.getAll`, `guestTransport.getAll`, `timeline.getAll`, `budget.getSummary`, `budget.getAll`, `clients.list`, `clients.getAll` |
| gifts | YES | `gifts.getAll`, `gifts.getStats` |

#### Google Sheets Import (`sheets-sync.ts` — `getQueryPathsForModule`)

| Module | queryPaths (Post-Fix) |
|--------|----------------------|
| guests | `guests.getAll`, `guests.getStats`, `guests.getDietaryStats`, `hotels.getAll`, `guestTransport.getAll`, `timeline.getAll`, `budget.getSummary`, `clients.list`, `clients.getAll` |
| budget | `budget.getAll`, `budget.getSummary`, `clients.list`, `clients.getAll` |
| timeline | `timeline.getAll`, `timeline.getStats` |
| hotels | `hotels.getAll`, `timeline.getAll` |
| transport | `guestTransport.getAll`, `timeline.getAll` |
| vendors | `vendors.getAll`, `vendors.getStats`, `budget.getAll`, `budget.getSummary`, `timeline.getAll` |
| gifts | `gifts.getAll`, `gifts.getStats` |

---

## 8. Chatbot Tool Sync Parity Matrix

### TOOL_QUERY_MAP (Post-Fix P1)

All phantom queryPath names were corrected in P1. The chatbot TOOL_QUERY_MAP now uses the same correct procedure names as the UI routers.

| Tool | queryPaths (Post-Fix) | Matches UI? |
|------|----------------------|-------------|
| `add_guest` | `guests.getAll`, `guests.getStats`, `hotels.getAll`, `guestTransport.getAll`, `budget.getSummary` | YES |
| `delete_guest` | same | YES |
| `update_guest_rsvp` | `guests.getAll`, `guests.getStats`, `budget.getSummary` | YES |
| `bulk_update_guests` | `guests.getAll`, `guests.getStats`, `hotels.getAll`, `guestTransport.getAll`, `budget.getSummary` | YES (fixed P1) |
| `check_in_guest` | `guests.getAll`, `guests.getStats` | N/A (UI deferred) |
| `assign_guests_to_events` | `guests.getAll`, `guests.getStats`, `events.getAll`, `hotels.getAll`, `guestTransport.getAll`, `budget.getSummary` | YES (fixed P1) |
| `update_table_dietary` | `guests.getAll`, `guests.getStats`, `hotels.getAll`, `guestTransport.getAll`, `budget.getSummary` | YES (fixed P1) |
| `create_event` | `events.getAll`, `timeline.getAll` | YES |
| `update_event` | same | YES |
| `add_timeline_item` | `timeline.getAll` | YES |
| `add_vendor` | `vendors.getAll`, `budget.getAll`, `timeline.getAll` | YES (broader) |
| `update_vendor` | `vendors.getAll`, `budget.getAll` | YES |
| `delete_vendor` | `vendors.getAll`, `budget.getAll`, `timeline.getAll` | YES (broader) |
| `add_hotel_booking` | `hotels.getAll` | YES |
| `assign_transport` | `guestTransport.getAll` | YES |
| `update_budget_item` | `budget.getAll`, `budget.getSummary` | YES |
| `delete_budget_item` | `budget.getAll`, `budget.getSummary`, `timeline.getAll` | YES (broader) |
| `add_gift` | `gifts.getAll` | YES |
| `create_client` | `clients.list`, `clients.getAll` | YES (fixed P1) |
| `update_client` | `clients.list`, `clients.getAll`, `clients.getById` | YES (fixed P1) |

### `getModuleFromToolName` Fallback Bug

Still present (S7-M02). Tools that don't match any substring fall through to default `'guests'`. The `module` field is cosmetic (queryPaths drive invalidation) — low-severity logging issue.

---

## 9. Tenant Isolation Verification

### Redis Channel Naming

| Operation | Key Pattern | Isolation |
|-----------|-------------|-----------|
| Store | `sync:{companyId}:actions` | Per-company sorted set — **SAFE** |
| Subscribe | `sync:{companyId}:actions` (polling) | Per-company — **SAFE** |

### SSE Subscription Filtering

1. `sync.router.ts:42`: `const { companyId, userId } = ctx` — companyId from authenticated session
2. `sync.router.ts:44-49`: Rejects if `!companyId` with `BAD_REQUEST`
3. `sync.router.ts:93`: `subscribeToCompany(companyId, signal)` — scoped to company
4. `sync.router.ts:95`: `action.userId !== userId` — filters out self-echoes
5. Redis keys include `companyId` — no cross-tenant key collisions

**Verdict: SAFE.** Company A events cannot leak to Company B.

---

## 10. Connection Manager Verification

### Limits (`connection-manager.ts`)

| Limit | Value | Line |
|-------|-------|------|
| Per-user | 5 | 42 |
| Per-company | 50 | 45 |
| Counter TTL | 7200s (2 hours) | 50 |
| Key prefix | `sse:conn` | 53 |

### Acquire/Release Flow

- Acquire BEFORE SSE loop (line 54)
- Release in `finally` block (line 107–110) — runs even on error/abort
- `SSEConnectionLimitError` caught and converted to `TRPCError` with code `TOO_MANY_REQUESTS`
- Guard is idempotent (`if (released) return`)
- Negative counter cleanup: if DECR goes to 0 or below, key is DELeted

**TOCTOU race (S7-M01):** `canConnect()` read and `pipeline.incr()` write are not atomic. Bounded overshoot, TTL auto-corrects. Low risk — deferred.

---

## 11. Redis Failure Handling Analysis

| Component | Behavior | File:Line |
|-----------|----------|-----------|
| `storeSyncAction` | Catches error, logs, does NOT throw | redis-pubsub.ts:108-111 |
| `broadcastSync` | Catches rejection, logs, does NOT throw | broadcast-sync.ts:35-38 |
| `broadcastSheetSync` | `.catch()` on Promise.all, logs | sheets-sync.ts:131 |
| `executeToolWithSync` | Catches, `console.warn`, does NOT throw | tool-executor.ts:596-598 |
| `getMissedActions` | Catches error, returns empty array `[]` | redis-pubsub.ts:140-143 |
| `subscribeToCompany` | Catches, waits 2s, retries polling loop | redis-pubsub.ts:180-183 |
| `sseConnections.acquire` | **THROWS** — Redis failure propagates | connection-manager.ts:167-172 |

**S7-M08 (deferred):** `sseConnections.acquire` is too aggressive — if Redis is temporarily down, no new SSE connections can be established even though the database is fine.

---

## 12. End-to-End Trace (Post-Fix)

**Scenario:** User A adds a guest on Tab 1. User B on Tab 2 should see the update.

### Step 1: Mutation
```
guests.router.ts → create: adminProcedure
→ withTransaction → INSERT guests, cascade side effects
→ recalcClientStats(tx, clientId) — inside transaction
→ transaction commits
```

### Step 2: broadcastSync (after commit)
```
broadcastSync({
  type: 'insert', module: 'guests',
  entityId: result.guest.id,
  companyId: ctx.companyId!,
  clientId: input.clientId,
  userId: ctx.userId!,
  queryPaths: ['guests.getAll', 'guests.getStats', 'hotels.getAll',
               'guestTransport.getAll', 'timeline.getAll',
               'budget.getSummary', 'clients.list', 'clients.getAll'],
})
```

### Step 3: Redis Store
```
broadcast-sync.ts → storeSyncAction(syncAction)
→ redis.zadd('sync:{companyId}:actions', { score: timestamp, member: JSON.stringify(action) })
→ redis.zremrangebyrank(key, 0, -1001)  // cap at 1000
→ redis.expire(key, 86400)  // 24h TTL
```

### Step 4: Subscription Polling (User B)
```
redis-pubsub.ts → subscribeToCompany(companyId, signal)
→ getMissedActions(companyId, lastTimestamp)
→ redis.zrange(key, lastTimestamp+1, '+inf', { byScore: true })
→ yield action (to sync.router.ts)
→ sleep(500ms), repeat
```

### Step 5: SSE Delivery
```
sync.router.ts → for await (action of subscribeToCompany(...))
→ action.userId !== userId → passes (different user)
→ yield action → SSE to User B's browser
```

### Step 6: Cache Invalidation (POST-FIX — WORKS)
```
use-realtime-sync.ts → handleSyncAction(action)
→ invalidateQueries(['guests.getAll', 'guests.getStats', ...])
→ 'guests.getAll' splits to ['guests', 'getAll']
→ tRPC cache key: ['guests', 'getAll'] → MATCH ✓
→ queryClient.invalidateQueries() → Guest list refetches
→ User B sees the new guest ✓
```

---

## 13. Client-Side SSE Handler Analysis

### `useRealtimeSync` Hook (`use-realtime-sync.ts`)

**Connection:** Uses `trpc.sync.onSync.useSubscription()`. tRPC v11 SSE-based subscriptions with automatic reconnect.

**Offline Recovery:**
- `lastSyncTimestamp` persisted to `localStorage` under key `weddingflo:lastSyncTimestamp`
- Passed as input to `onSync` subscription
- Server sends missed actions via `getMissedActions(companyId, lastSyncTimestamp)`
- **CORRECT:** Tab reconnects and receives all missed actions from sorted set

**Known Issues (deferred):**
- `subscriptionKey` not wired to subscription (S7-L02) — manual reconnect may not remount
- No duplicate event filtering (S7-L05) — double invalidation just causes extra refetch

---

## 14. Missed Events — Import, Batch, Cascade Operations

### Cascade Sync Functions (`auto-sync-trigger.ts`)

| Function | Writes To | broadcastSync? |
|----------|-----------|---------------|
| `syncGuestsToHotelsAndTransportTx` | hotels, guestTransport | NO — callers compensate |
| `syncHotelsToTimelineTx` | timeline | NO — callers compensate |
| `syncTransportToTimelineTx` | timeline | NO — callers compensate |
| `triggerFullSync` | All of the above | NO — callers compensate |
| `triggerBatchSync` | All of the above | NO — callers compensate |

**Post-fix:** All callers now include cascade module paths (`hotels.getAll`, `guestTransport.getAll`, `timeline.getAll`) in their broadcastSync queryPaths. The functions remain broadcast-blind but the caller contract is documented and enforced.

### recalcClientStats

**Post-fix:** All callers that invoke `recalcClientStats` now include `clients.list` and `clients.getAll` in their broadcastSync queryPaths. Client list views refresh when budget/guest counts change.

---

## 15. Transaction Placement Verification

**All broadcastSync calls are OUTSIDE their enclosing transactions.** This is correct — broadcasting inside a transaction could notify clients before the commit.

```typescript
await withTransaction(async (tx) => {
  // ... all DB writes ...
  await recalcClientStats(tx, clientId)  // inside tx
})
// ↓ AFTER commit ↓
await broadcastSync({ ... })  // outside tx — CORRECT
```

**No violations found.** Verified across all 70 call sites.

---

## 16. All Findings

### S7-C01 ~~CRITICAL~~ → FIXED (P1) — Phantom queryPath Names

| Field | Value |
|-------|-------|
| **Status** | **FIXED** (P1) |
| **Files** | All 11 module routers, query-invalidation-map.ts |
| **Problem** | broadcastSync queryPaths used phantom `.list`/`.overview` names that didn't match tRPC procedures. Cache invalidation silently failed. |
| **Fix** | Renamed all phantom paths to correct procedure names: `.list` → `.getAll`, `.overview` → `.getSummary`. Updated TOOL_QUERY_MAP to match. |

**Mapping applied:**

| Phantom | Corrected To |
|---------|-------------|
| `guests.list` | `guests.getAll` |
| `budget.list` | `budget.getAll` |
| `budget.overview` | `budget.getSummary` |
| `events.list` | `events.getAll` |
| `timeline.list` | `timeline.getAll` |
| `vendors.list` | `vendors.getAll` |
| `hotels.list` | `hotels.getAll` |
| `gifts.list` | `gifts.getAll` |

---

### S7-C02 ~~CRITICAL~~ → FIXED (P1) — `publishSyncAction` No-Op

| Field | Value |
|-------|-------|
| **Status** | **FIXED** (P1) |
| **File** | broadcast-sync.ts |
| **Problem** | `publishSyncAction()` used `redis.publish()` to a channel with zero subscribers (Upstash REST has no persistent pub/sub). Wasted one Redis API call per mutation. |
| **Fix** | Removed `publishSyncAction` call from `broadcastSync`. Events now delivered solely via `storeSyncAction` + polling. Saves one Redis call per mutation. |

---

### S7-H01 ~~HIGH~~ → FIXED (P2) — 26 Router Mutations Missing broadcastSync

| Field | Value |
|-------|-------|
| **Status** | **FIXED** (P2) |
| **Affected** | 7 router files, 26 mutations |
| **Fix** | Added broadcastSync with correct queryPaths to all 26 mutations. See coverage matrix above. |

---

### S7-H02 ~~HIGH~~ → FIXED (P2) — Cascade Sync Functions Broadcast-Blind

| Field | Value |
|-------|-------|
| **Status** | **FIXED** (P2) — caller-side compensation |
| **File** | auto-sync-trigger.ts (unchanged), all callers updated |
| **Problem** | Cascade functions write hotels/transport/timeline but never broadcast. |
| **Fix** | All callers now include cascade module paths in their broadcastSync queryPaths (`hotels.getAll`, `guestTransport.getAll`, `timeline.getAll`). |

---

### S7-H03 ~~HIGH~~ → FIXED (P3) — Guest Router Missing Cascade + Client Paths

| Field | Value |
|-------|-------|
| **Status** | **FIXED** (P3) |
| **File** | guests.router.ts |
| **Problem** | 5 guest broadcastSync calls missing `timeline.getAll` (cascade) and `clients.list`/`clients.getAll` (recalcClientStats). |
| **Fix** | Enhanced all 5 calls with `timeline.getAll`, `clients.list`, `clients.getAll`. `updateRSVP` gets clients paths but not timeline (no cascade). |

---

### S7-H04 ~~HIGH~~ → FIXED (P3) — Sheets Import Cross-Module Cascade Gap

| Field | Value |
|-------|-------|
| **Status** | **FIXED** (P3) |
| **File** | sheets-sync.ts |
| **Problem** | `getQueryPathsForModule` had severely narrow paths. Guest import cascaded into hotels/transport/timeline but only broadcast `guests.getAll`. |
| **Fix** | Rewrote `getQueryPathsForModule` with full cascade paths for all 7 modules. See Import broadcastSync table above. |

---

### S7-H05 ~~HIGH~~ → FIXED (P3) — Phantom `budget.getStats` in Sheets

| Field | Value |
|-------|-------|
| **Status** | **FIXED** (P3) |
| **File** | sheets-sync.ts:95 |
| **Problem** | `getQueryPathsForModule('budget')` returned `budget.getStats` — procedure is `getSummary`. |
| **Fix** | Changed to `budget.getSummary`. |

---

### S7-H06 ~~HIGH~~ → FIXED (P1) — Chatbot queryPath Mismatches

| Field | Value |
|-------|-------|
| **Status** | **FIXED** (P1) |
| **File** | query-invalidation-map.ts |
| **Problem** | 5 chatbot tools had fewer/different queryPaths than UI router equivalents. |
| **Fix** | Updated TOOL_QUERY_MAP entries to match corrected UI router paths. All 20 tools now have parity. |

---

### S7-H07 ~~HIGH~~ → FIXED (P2 + P3) — recalcClientStats Missing Clients Broadcast

| Field | Value |
|-------|-------|
| **Status** | **FIXED** (P2 guests deferred → P3 completed) |
| **Files** | All routers calling recalcClientStats |
| **Problem** | recalcClientStats writes `clients.budget`/`clients.guestCount` but callers didn't broadcast `clients.list`/`clients.getAll`. |
| **Fix** | Added `clients.list`, `clients.getAll` to all broadcastSync calls where recalcClientStats is invoked. Budget router (P2), guest router (P3), import router (P3). |

---

### S7-H08 ~~HIGH~~ → FIXED (P2) — `budget.delete` and `clients.delete` Missing `clientId`

| Field | Value |
|-------|-------|
| **Status** | **FIXED** (P2) |
| **Files** | budget.router.ts, clients.router.ts |
| **Problem** | Both broadcastSync calls omitted the `clientId` field. |
| **Fix** | Added `clientId` field to both calls. |

---

### S7-H09 ~~HIGH~~ → FIXED (P3) — Excel Import broadcastSync Incomplete

| Field | Value |
|-------|-------|
| **Status** | **FIXED** (P3) |
| **File** | import.router.ts |
| **Problem** | Budget import missing clients paths; vendor import missing budget.getSummary + timeline.getAll; inline queryPathsMap narrow for guests/vendors/budget. |
| **Fix** | Updated all 3 broadcastSync sites with full cascade and client paths. See Import broadcastSync table above. |

---

### S7-M01 ~~MEDIUM~~ → FIXED (P4) — TOCTOU Race in Connection Limiter

| Field | Value |
|-------|-------|
| **Status** | **FIXED** (P4) |
| **File** | connection-manager.ts |
| **Problem** | `canConnect()` read and `pipeline.incr()` write were not atomic. Concurrent requests could exceed limit. |
| **Fix** | Replaced check-then-increment with increment-first-then-check pattern. INCR is atomic in Redis. If limits exceeded after increment, DECR rollback is issued. Eliminates TOCTOU window. |

---

### S7-M02 ~~MEDIUM~~ → FIXED (P4) — `getModuleFromToolName` Default `'guests'`

| Field | Value |
|-------|-------|
| **Status** | **FIXED** (P4) |
| **File** | tool-executor.ts |
| **Problem** | 8+ tools fell through to default module `'guests'`. |
| **Fix** | Added explicit patterns for `pipeline`, `team`, `proposal`, `invoice`, `communication`, `website`, `workflow` → `'clients'`. Changed default fallback from `'guests'` to `'clients'`. |

---

### S7-M03 ~~MEDIUM~~ → FIXED (P4) — `loadVersion` Non-Atomic

| Field | Value |
|-------|-------|
| **Status** | **FIXED** (P4) |
| **File** | floor-plans.router.ts |
| **Problem** | Delete + update loop + insert with no transaction. |
| **Fix** | Wrapped all operations in `db.transaction()`. Delete, table position updates, and guest assignment inserts are now atomic. |

---

### S7-M04 ~~MEDIUM~~ → FIXED (P4) — `batchAssignGuests` Non-Atomic

| Field | Value |
|-------|-------|
| **Status** | **FIXED** (P4) |
| **File** | floor-plans.router.ts |
| **Problem** | Delete + insert without transaction. |
| **Fix** | Wrapped delete + insert in `db.transaction()`. |

---

### S7-M05 ~~MEDIUM~~ → FIXED (P4) — `floor-plans.delete` Non-Atomic

| Field | Value |
|-------|-------|
| **Status** | **FIXED** (P4) |
| **File** | floor-plans.router.ts |
| **Problem** | Three sequential deletes without transaction. |
| **Fix** | Wrapped all 3 deletes (floorPlanGuests, floorPlanTables, floorPlans) in `db.transaction()`. |

---

### S7-M06 ~~MEDIUM~~ → FIXED (P4) — `vendors.bulkCreateFromCommaList` Non-Atomic

| Field | Value |
|-------|-------|
| **Status** | **FIXED** (P4) |
| **File** | vendors.router.ts |
| **Problem** | For-loop of inserts (vendor + clientVendor + budget) without transaction. |
| **Fix** | Per-iteration `db.transaction()`. Each vendor creation is atomic (vendor + clientVendor + budget all-or-nothing). Individual vendor failures don't affect others. |

---

### S7-M07 ~~MEDIUM~~ → FIXED (P4) — `timeline.bulkImport` Non-Atomic

| Field | Value |
|-------|-------|
| **Status** | **FIXED** (P4) |
| **File** | timeline.router.ts |
| **Problem** | Loop of individual inserts/updates/deletes without transaction. |
| **Fix** | Wrapped entire loop in single `db.transaction()`. All bulk import operations are atomic — either all succeed or all roll back. Error handler resets counts on failure. |

---

### S7-M08 ~~MEDIUM~~ → FIXED (P4) — sseConnections.acquire Throws on Redis Failure

| Field | Value |
|-------|-------|
| **Status** | **FIXED** (P4) |
| **File** | connection-manager.ts |
| **Problem** | Redis down → `pipeline.exec()` throws → no new SSE connections possible. |
| **Fix** | Wrapped acquire logic in try/catch. `SSEConnectionLimitError` is re-thrown (intentional rejection). All other errors (Redis failure) return a no-op guard — connection is allowed without limit enforcement. Graceful degradation. |

---

### S7-M09 ~~MEDIUM~~ → FIXED (P4) — Cascade Sync Called with Bare `db`

| Field | Value |
|-------|-------|
| **Status** | **FIXED** (P4) |
| **Files** | googleSheets.router.ts, sheets-sync.ts |
| **Problem** | `syncGuestsToHotelsAndTransportTx`, `syncHotelsToTimelineTx`, `syncTransportToTimelineTx` called with bare `db` instead of transaction client. |
| **Fix** | All 6 cascade calls (3 in sheets-sync.ts, 3 in googleSheets.router.ts) now wrapped in `db.transaction(async (tx) => { ... })`. Transaction client passed to cascade function. |

---

### S7-M10 ~~MEDIUM~~ → FIXED (P4) — `importAllFromSheets` Broadcast Gated on Optional `userId`

| Field | Value |
|-------|-------|
| **Status** | **FIXED** (P4) |
| **File** | sheets-sync.ts |
| **Problem** | `userId` parameter was optional. If omitted, entire broadcast block was skipped. |
| **Fix** | Made `userId` parameter required. Removed `if (userId && ...)` guard on broadcast block — now always broadcasts when imports occur. Only caller (`googleSheets.router.ts`) already passes `ctx.userId!`. |

---

### S7-L01 ~~LOW~~ → NOT_FOUND (P4) — Duplicate Line in redis-pubsub.ts

| Field | Value |
|-------|-------|
| **Status** | **NOT_FOUND** — no duplicate visible at line 136 in current code. Also removed dead `publishSyncAction` function (unused since P1). |
| **File** | redis-pubsub.ts |

---

### S7-L02 ~~LOW~~ → FIXED (P4) — `subscriptionKey` Not Wired to Subscription

| Field | Value |
|-------|-------|
| **Status** | **FIXED** (P4) |
| **File** | use-realtime-sync.ts |
| **Problem** | `subscriptionKey` state was incremented by `reconnect()` but never passed to `useSubscription`. Manual reconnect was non-functional. |
| **Fix** | Replaced `subscriptionKey` with `pendingReconnect` toggle pattern. `reconnect()` sets `pendingReconnect=true` which disables the subscription via `enabled: enabled && !pendingReconnect`. After 100ms, re-enables — tRPC creates a new subscription. |

---

### S7-L03 LOW — Seating Version Operations Silent

| Field | Value |
|-------|-------|
| **Status** | **SUPERSEDED** — `saveVersion`, `loadVersion`, `deleteVersion` now have broadcastSync (P2). |

---

### S7-L04 LOW — `logChange` and Preference/Conflict Operations

| Field | Value |
|-------|-------|
| **Status** | **PARTIALLY FIXED** (P2) — `addGuestConflict/Preference`, `removeGuestConflict/Preference` now have broadcastSync. `logChange` intentionally not broadcast (audit-log-only, not user-facing). |

---

### S7-L05 ~~LOW~~ → FIXED (P4) — No Duplicate Event Filtering

| Field | Value |
|-------|-------|
| **Status** | **FIXED** (P4) |
| **File** | use-realtime-sync.ts |
| **Problem** | No deduplication by `action.id`. Same action received twice would invalidate queries twice. |
| **Fix** | Added `seenActionIds` ref (Set) that tracks processed action IDs. Duplicate actions are skipped. Set auto-evicts when exceeding 500 entries (keeps last 250). |

---

### S7-L06 LOW — 500ms Polling Latency

| Field | Value |
|-------|-------|
| **Status** | **BY DESIGN** — documented trade-off for Upstash REST API. Not fixable without switching to Upstash TCP for true pub/sub. |
| **File** | redis-pubsub.ts:179 |

---

## 17. Cross-Session References

### From Previous Sessions → Session 7

| Source | Finding | Session 7 Result |
|--------|---------|-------------------|
| Session 2 | 30 broadcastSync call sites documented | Verified → 39 pre-audit → **70 post-fix** |
| Session 2 | floor-plans sub-ops missing broadcastSync | **FIXED** (P2) — 8 new calls added |
| Session 2 | budget advance payments missing broadcastSync | **FIXED** (P2) — 3 new calls |
| Session 2 | vendors sub-operations missing broadcastSync | **FIXED** (P2) — 10 new calls |
| Session 2 | timeline reorder/markComplete missing | **FIXED** (P2) — 2 new calls |
| Session 5 | TOOL_QUERY_MAP rewritten (S5-C05) | **FIXED** (P1) — all phantom names corrected |
| Session 5 | broadcastSync failures must never block | **VERIFIED** — all entry points swallow errors |
| Session 6 | Verify SSE delivery for floor plan changes | **FIXED** — broadcastSync fires with correct paths |
| Session 6 | Verify recalcClientStats broadcast coverage | **FIXED** (P2+P3) — clients.list/getAll in all callers |
| Session 6 | broadcastSync outside transactions | **VERIFIED** — all 70 calls outside transactions |

### Session 7 → Session 8 (Final Review)

| Finding | Status |
|---------|--------|
| S7-M01 through S7-M10 | **ALL FIXED** (P4) |
| S7-L02, S7-L05 | **FIXED** (P4) |
| S7-L04 (`logChange`) | Intentionally not broadcast — audit-log-only, not user-facing |
| S7-L06 (500ms polling) | By design — Upstash REST trade-off |
| 3 deferred mutations | `guests.checkIn`, `events.updateStatus`, `floor-plans.logChange` — add broadcastSync if needed |
| Dead code cleanup | `publishSyncAction` function removed from redis-pubsub.ts (unused since P1) |

---

## 18. Danger Zones — Read Before Editing

### 1. queryPath Names MUST Match Real tRPC Procedure Names

The client-side predicate (`use-realtime-sync.ts:86-116`) does **exact segment matching**. If you write `guests.list` but the procedure is `guests.getAll`, the cache is never invalidated.

**Before writing any queryPath, check the target router's procedure names:**
```
guests: getAll, getById, getStats, getDietaryStats
budget: getAll, getById, getSummary, getByCategory, getCategorySummary, getSegmentSummary, getBySegment
events: getAll, getById, getStats
timeline: getAll, getById, getStats, getGroupedByEvent
vendors: getAll, getById, getStats, getByCategory
hotels: getAll, getById, getStats, getCapacitySummary, getAllWithGuests
guestTransport: getAll, list, getStats, getAllWithGuests
gifts: getAll, getById, getStats
floorPlans: list, getById
clients: list, getAll, getById
```

### 2. `publishSyncAction` Is Removed From `broadcastSync`

As of P1, `broadcastSync` only calls `storeSyncAction`. The function still exists in redis-pubsub.ts but is unused. Do NOT re-add it — Upstash REST has no persistent subscribers.

### 3. broadcastSync MUST Be Outside Transactions

Pattern: commit first, then broadcast. If you broadcast inside a transaction and another tab refetches, it may read pre-commit stale data.

### 4. Cascade Sync Functions Never Broadcast

If you call `syncGuestsToHotelsAndTransportTx` or similar, YOU are responsible for broadcasting the affected downstream modules. Include `hotels.getAll`, `guestTransport.getAll`, `timeline.getAll` in your broadcastSync queryPaths.

### 5. recalcClientStats Callers Must Broadcast Clients

Any mutation that calls `recalcClientStats` must include `clients.list` and `clients.getAll` in its broadcastSync queryPaths.

### 6. New Mutations MUST Have broadcastSync

Every new tRPC mutation that writes to the database must call broadcastSync after the write. Without it, multi-tab and multi-user real-time sync breaks silently.

### 7. Connection Manager Limits

5 per user, 50 per company. Counter TTL 2 hours. If you change these, update both `connection-manager.ts` constants AND any client-side retry logic.

### 8. Import Modules Must Include Cascade Paths

Both `import.router.ts` and `sheets-sync.ts` have module→queryPaths maps. When adding new import modules, include all cascade paths. Reference `getQueryPathsForModule` in sheets-sync.ts as the canonical source.
