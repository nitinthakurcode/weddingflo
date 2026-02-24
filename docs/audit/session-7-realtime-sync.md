# Session 7 — Real-Time Sync & SSE System Audit

> **Date:** 2026-02-24
> **Scope:** Complete real-time sync pipeline — Redis pub/sub, SSE delivery, broadcastSync coverage, client-side cache invalidation — 18 files, ~25,000 lines audited
> **Session:** 7 of 8 (report only — no code changes)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Severity Breakdown](#2-severity-breakdown)
3. [File Inventory](#3-file-inventory)
4. [SyncAction Event Type Inventory](#4-syncaction-event-type-inventory)
5. [broadcastSync Coverage Matrix — All Modules](#5-broadcastsync-coverage-matrix--all-modules)
6. [Chatbot Tool Sync Parity Matrix](#6-chatbot-tool-sync-parity-matrix)
7. [Tenant Isolation Verification](#7-tenant-isolation-verification)
8. [Connection Manager Verification](#8-connection-manager-verification)
9. [Redis Failure Handling Analysis](#9-redis-failure-handling-analysis)
10. [End-to-End Trace](#10-end-to-end-trace)
11. [Client-Side SSE Handler Analysis](#11-client-side-sse-handler-analysis)
12. [Missed Events — Import, Batch, Cascade Operations](#12-missed-events--import-batch-cascade-operations)
13. [Transaction Placement Verification](#13-transaction-placement-verification)
14. [All Findings](#14-all-findings)
15. [Cross-Session References](#15-cross-session-references)
16. [Danger Zones — Read Before Editing](#16-danger-zones--read-before-editing)

---

## 1. Executive Summary

| Field | Value |
|-------|-------|
| **Date** | 2026-02-24 |
| **Session** | 7 of 8 |
| **Scope** | Real-time sync: Redis pub/sub → SSE delivery → client cache invalidation |
| **Type** | Audit only — NO code changes |
| **Total issues found** | 27 (2 CRITICAL, 9 HIGH, 10 MEDIUM, 6 LOW) |
| **Files audited** | 18 |
| **Lines audited** | ~25,000 |
| **Architecture** | `broadcastSync()` → Redis PUBLISH + ZADD → `subscribeToCompany()` polling (500ms) → tRPC SSE subscription → `useRealtimeSync` hook → TanStack Query `invalidateQueries()` |

### Top-Line Findings

1. **CRITICAL: queryPath naming mismatch (S7-C01).** broadcastSync calls from 8 of 11 module routers use phantom `.list` / `.overview` queryPath names that do not match any actual tRPC procedure. Client-side cache invalidation silently fails for guests, budget, events, timeline, vendors, hotels, gifts. Real-time sync is non-functional for most modules.

2. **CRITICAL: Upstash REST API cannot do true pub/sub (S7-C02).** `subscribeToCompany()` polls Redis sorted sets every 500ms. The `publishSyncAction()` call publishes to a Redis channel that has zero subscribers — the subscription uses polling, not channel subscriptions. Events are only delivered via the stored sorted set, making `publishSyncAction` a no-op.

---

## 2. Severity Breakdown

| Severity | Count | Summary |
|----------|-------|---------|
| **CRITICAL** | 2 | Phantom queryPaths break cache invalidation for 8/11 modules; publishSyncAction is a no-op |
| **HIGH** | 9 | 26 mutations across 7 routers missing broadcastSync entirely; chatbot queryPath mismatches; cascade sync functions broadcast-blind; sheets import cross-module gaps |
| **MEDIUM** | 10 | Missing transactions on multi-write mutations; getModuleFromToolName fallback bug; budget.delete/clients.delete missing clientId; broadcastSheetSync `.getAll` vs `.getStats` naming; reconnect key not used |
| **LOW** | 6 | Line 136 duplicate in redis-pubsub.ts; subscriptionKey not wired to subscription; seating version operations silent; log-only procedures; `userId` optionality on importAllFromSheets |

---

## 3. File Inventory

### Core Sync Infrastructure (4 files, 653 lines)

| # | File | Lines | Role |
|---|------|-------|------|
| 1 | `src/lib/realtime/broadcast-sync.ts` | 40 | Thin wrapper: assembles SyncAction, calls publish + store in parallel |
| 2 | `src/lib/realtime/redis-pubsub.ts` | 196 | SyncAction interface, publishSyncAction, storeSyncAction, getMissedActions, subscribeToCompany |
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

| # | File | Lines | broadcastSync Calls | Missing Mutations |
|---|------|-------|--------------------|--------------------|
| 9 | `src/features/guests/server/routers/guests.router.ts` | 1,288 | 5 | 1 (checkIn) |
| 10 | `src/features/analytics/server/routers/budget.router.ts` | 1,299 | 3 | 3 (advance payments) |
| 11 | `src/features/events/server/routers/events.router.ts` | 620 | 3 | 1 (updateStatus) |
| 12 | `src/features/events/server/routers/timeline.router.ts` | 750 | 4 | 2 (reorder, markComplete) |
| 13 | `src/features/events/server/routers/hotels.router.ts` | 960 | 3 | 2 (checkIn, syncWithGuests) |
| 14 | `src/features/events/server/routers/guest-transport.router.ts` | 850 | 3 | 1 (syncWithGuests) |
| 15 | `src/features/events/server/routers/vendors.router.ts` | 1,646 | 3 | 10 |
| 16 | `src/features/events/server/routers/gifts.router.ts` | 290 | 3 | 0 |
| 17 | `src/features/events/server/routers/floor-plans.router.ts` | 1,523 | 9 | 9 |
| 18 | `src/features/clients/server/routers/clients.router.ts` | 1,363 | 3 | 0 |

### Supporting Files (3 files, ~2,800 lines)

| # | File | Lines | Role |
|---|------|-------|------|
| 19 | `src/features/chatbot/server/services/tool-executor.ts` | 7,056 | executeToolWithSync: chatbot mutation broadcast |
| 20 | `src/features/chatbot/server/services/query-invalidation-map.ts` | 167 | TOOL_QUERY_MAP: chatbot tool → queryPaths |
| 21 | `src/lib/google/sheets-sync.ts` | 1,493 | broadcastSheetSync + getQueryPathsForModule |
| 22 | `src/lib/backup/auto-sync-trigger.ts` | 440 | Cascade sync functions (broadcast-blind) |
| 23 | `src/features/analytics/server/routers/import.router.ts` | 2,240 | Excel import with broadcastSync |

---

## 4. SyncAction Event Type Inventory

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

### Three Broadcast Entry Points

| Entry Point | File | Line | Used By |
|-------------|------|------|---------|
| `broadcastSync()` | broadcast-sync.ts:16 | All 11 module routers, import.router | Wraps publishSyncAction + storeSyncAction |
| `broadcastSheetSync()` | sheets-sync.ts:108 | googleSheets.router, importAllFromSheets | Same as above but for Google Sheets imports |
| Direct `publishSyncAction` + `storeSyncAction` | tool-executor.ts:593-594 | Chatbot executeToolWithSync | Adds `toolName` field |

---

## 5. broadcastSync Coverage Matrix — All Modules

### Legend
- **BS** = broadcastSync called
- **TX** = wrapped in transaction
- **RCS** = recalcClientStats called
- **QP** = queryPaths

### guests.router.ts (1,288 lines)

| Procedure | Line | BS | TX | RCS | queryPaths | Notes |
|-----------|------|----|----|-----|------------|-------|
| `create` | 255 | YES | YES (withTx) | YES:247 | `guests.list`, `guests.getStats`, `hotels.list`, `guestTransport.list`, `budget.overview` | |
| `update` | 700 | YES | YES (withTx) | YES:692 | same | |
| `delete` | 848 | YES | YES (withTx) | YES:841 | same | |
| `bulkImport` | 1009 | YES | YES (withTx) | YES:998 | same (guarded: `result.data.length > 0`) | |
| `updateRSVP` | 1243 | YES | YES (withTx) | YES:1235 | `guests.list`, `guests.getStats`, `budget.overview` | Narrower — no hotels/transport |
| **`checkIn`** | **1269** | **NO** | **NO** | **NO** | — | **MISSING: writes checkedIn, checkedInAt, updatedAt** |

### budget.router.ts (1,299 lines)

| Procedure | Line | BS | TX | RCS | queryPaths | Notes |
|-----------|------|----|----|-----|------------|-------|
| `create` | 261 | YES | YES (withTx) | YES:255 | `budget.list`, `budget.overview` | |
| `update` | 457 | YES | YES (withTx) | YES:451 | `budget.list`, `budget.overview` | |
| `delete` | 520 | YES | YES (ctx.db.tx) | YES:514 | `budget.list`, `budget.overview` | **Missing `clientId` field** |
| **`addAdvancePayment`** | **569** | **NO** | YES (withTx) | YES:622 | — | **MISSING: writes advancePayments, budget.paidAmount, clientVendors** |
| **`updateAdvancePayment`** | **657** | **NO** | YES (withTx) | YES:703 (conditional) | — | **MISSING** |
| **`deleteAdvancePayment`** | **732** | **NO** | YES (withTx) | YES:769 (conditional) | — | **MISSING** |

### events.router.ts (~620 lines)

| Procedure | Line | BS | TX | queryPaths | Notes |
|-----------|------|----|----|------------|-------|
| `create` | 244 | YES | YES (ctx.db.tx) | `events.list`, `timeline.list` | |
| `update` | 382 | YES | YES (ctx.db.tx) | `events.list`, `timeline.list` | |
| `delete` | 453 | YES | YES (ctx.db.tx) | `events.list`, `timeline.list`, `guests.list` | |
| **`updateStatus`** | **497** | **NO** | **NO** | — | **MISSING: writes events.status, events.updatedAt** |

### timeline.router.ts (~750 lines)

| Procedure | Line | BS | TX | queryPaths | Notes |
|-----------|------|----|----|------------|-------|
| `create` | 150 | YES | NO | `timeline.list` | Direct ctx.db insert |
| `update` | 228 | YES | NO | `timeline.list` | |
| `delete` | 273 | YES | NO | `timeline.list` | |
| `bulkImport` | 711 | YES | NO | `timeline.list` | Loop of individual inserts, single broadcast |
| **`reorder`** | **314** | **NO** | **NO** | — | **MISSING: updates sortOrder for N rows via Promise.all** |
| **`markComplete`** | **358** | **NO** | **NO** | — | **MISSING: updates completed, updatedAt** |

### hotels.router.ts (~960 lines)

| Procedure | Line | BS | TX | queryPaths | Notes |
|-----------|------|----|----|------------|-------|
| `create` | 265 | YES | YES (withTx) | `hotels.list` | |
| `update` | 501 | YES | YES (withTx) | `hotels.list` | |
| `delete` | 576 | YES | YES (withTx) | `hotels.list` | |
| **`checkIn`** | **617** | **NO** | **NO** | — | **MISSING: writes checkedIn: true** |
| **`syncWithGuests`** | **758** | **NO** | **NO** | — | **MISSING: batch-inserts hotel rows from guest data** |

### guest-transport.router.ts (~850 lines)

| Procedure | Line | BS | TX | queryPaths | Notes |
|-----------|------|----|----|------------|-------|
| `create` | 246 | YES | YES (withTx) | `guestTransport.list` | |
| `update` | 524 | YES | YES (withTx) | `guestTransport.list` | |
| `delete` | 600 | YES | YES (withTx) | `guestTransport.list` | |
| **`syncWithGuests`** | **753** | **NO** | **NO** | — | **MISSING: batch-inserts transport rows** |

### vendors.router.ts (1,646 lines)

| Procedure | Line | BS | TX | queryPaths | Notes |
|-----------|------|----|----|------------|-------|
| `create` | 490 | YES | YES (withTx) | `vendors.list` | |
| `update` | 723 | YES | YES (withTx) | `vendors.list` | |
| `delete` | 795 | YES | YES (withTx) | `vendors.list` | Guarded: `if (result.clientId)` |
| **`updateApprovalStatus`** | **810** | **NO** | **NO** | — | **MISSING: writes clientVendors** |
| **`addComment`** | **850** | **NO** | **NO** | — | **MISSING: inserts vendorComments** |
| **`deleteComment`** | **922** | **NO** | **NO** | — | **MISSING** |
| **`updatePaymentStatus`** | **936** | **NO** | **NO** | — | **MISSING: writes clientVendors** |
| **`bulkCreateFromCommaList`** | **1130** | **NO** | **NO** | — | **MISSING: loop inserts vendors, clientVendors, budget** |
| **`addVendorAdvance`** | **1312** | **NO** | **NO** | — | **MISSING: inserts advancePayments, updates budget** |
| **`updateVendorAdvance`** | **1385** | **NO** | **NO** | — | **MISSING** |
| **`deleteVendorAdvance`** | **1452** | **NO** | **NO** | — | **MISSING** |
| **`addReview`** | **1505** | **NO** | **NO** | — | **MISSING: inserts vendorReviews, updates vendors.rating** |
| **`deleteReview`** | **1602** | **NO** | **NO** | — | **MISSING** |

### gifts.router.ts (290 lines)

| Procedure | Line | BS | TX | queryPaths | Notes |
|-----------|------|----|----|------------|-------|
| `create` | 146 | YES | NO | `gifts.list` | Full coverage |
| `update` | 206 | YES | NO | `gifts.list` | |
| `delete` | 252 | YES | NO | `gifts.list` | |

### floor-plans.router.ts (1,523 lines)

| Procedure | Line | BS | TX | queryPaths | Notes |
|-----------|------|----|----|------------|-------|
| `create` | 198 | YES | NO | `floorPlans.list` | |
| `update` | 301 | YES | NO | `floorPlans.list` | |
| `addTable` | 373 | YES | NO | `floorPlans.list`, `floorPlans.getById` | |
| `updateTable` | 463 | YES | NO | `floorPlans.list`, `floorPlans.getById` | |
| `deleteTable` | 509 | YES | NO | `floorPlans.list`, `floorPlans.getById` | |
| `assignGuest` | 632 | YES | NO | `floorPlans.list`, `floorPlans.getById` | |
| `unassignGuest` | 678 | YES | NO | `floorPlans.list`, `floorPlans.getById` | |
| `batchAssignGuests` | 820 | YES | NO | `floorPlans.list`, `floorPlans.getById` | **No transaction around delete+insert** |
| `delete` | 942 | YES | NO | `floorPlans.list` | **No transaction around 3 sequential deletes** |
| **`saveVersion`** | **1020** | **NO** | **NO** | — | **MISSING: inserts seatingVersions** |
| **`loadVersion`** | **1110** | **NO** | **NO** | — | **MISSING: deletes+updates+inserts (no tx either)** |
| **`deleteVersion`** | **1222** | **NO** | **NO** | — | **MISSING: deletes seatingVersions** |
| **`logChange`** | **1312** | **NO** | **NO** | — | MISSING: inserts seatingChangeLog (log-only, low severity) |
| **`addGuestConflict`** | **1395** | **NO** | **NO** | — | **MISSING: inserts guestConflicts** |
| **`addGuestPreference`** | **1438** | **NO** | **NO** | — | **MISSING** |
| **`removeGuestConflict`** | **1473** | **NO** | **NO** | — | **MISSING** |
| **`removeGuestPreference`** | **1500** | **NO** | **NO** | — | **MISSING** |
| `updateGuestSeatingRules` | — | N/A | N/A | — | No-op (schema not implemented) |

### clients.router.ts (1,363 lines)

| Procedure | Line | BS | TX | queryPaths | Notes |
|-----------|------|----|----|------------|-------|
| `create` | 802 | YES | YES (ctx.db.tx) | `clients.list`, `clients.getAll` | |
| `update` | 1011 | YES | YES (ctx.db.tx) | `clients.list`, `clients.getAll`, `clients.getById` | |
| `delete` | 1253 | YES | YES (withTx) | `clients.list`, `clients.getAll` | **Missing `clientId` field** |

### Coverage Summary

| Module | Total Mutations | With broadcastSync | Missing | Coverage |
|--------|-----------------|-------------------|---------|----------|
| guests | 6 | 5 | 1 | 83% |
| budget | 6 | 3 | 3 | 50% |
| events | 4 | 3 | 1 | 75% |
| timeline | 6 | 4 | 2 | 67% |
| hotels | 5 | 3 | 2 | 60% |
| guest-transport | 4 | 3 | 1 | 75% |
| vendors | 13 | 3 | 10 | 23% |
| gifts | 3 | 3 | 0 | 100% |
| floor-plans | 18 | 9 | 9 | 50% |
| clients | 3 | 3 | 0 | 100% |
| **TOTAL** | **68** | **39** | **29** | **57%** |

**29 mutations write to the DB without broadcasting.** Even the 39 that DO broadcast mostly use phantom queryPaths (see S7-C01).

---

## 6. Chatbot Tool Sync Parity Matrix

### How Chatbot Broadcasts

`executeToolWithSync()` (`tool-executor.ts:555`):
1. Calls `executeTool()` (switch dispatcher)
2. If success AND not query-only tool:
   - Gets queryPaths from `TOOL_QUERY_MAP` (`query-invalidation-map.ts:18`)
   - Builds SyncAction with `getModuleFromToolName()` and `getActionType()`
   - Calls `publishSyncAction` + `storeSyncAction` directly (not via `broadcastSync`)
   - Errors swallowed (`console.warn`)

### Chatbot vs UI Router queryPath Comparison

| Tool | UI Router queryPaths | Chatbot TOOL_QUERY_MAP | Match? |
|------|---------------------|------------------------|--------|
| **add_guest** | `guests.list`, `guests.getStats`, `hotels.list`, `guestTransport.list`, `budget.overview` | Same | MATCH |
| **delete_guest** | Same as above | Same | MATCH |
| **update_guest_rsvp** | `guests.list`, `guests.getStats`, `budget.overview` | Same | MATCH |
| **bulk_update_guests** | `guests.list`, `guests.getStats`, `hotels.list`, `guestTransport.list`, `budget.overview` | `guests.list`, `guests.getStats` | **MISMATCH — chatbot missing 3 paths** |
| **check_in_guest** | No broadcastSync in UI | `guests.list`, `guests.getStats` | N/A — UI is missing |
| **assign_guests_to_events** | `guests.list`, `guests.getStats`, ... | `guests.list`, `events.list` | **MISMATCH — chatbot missing 4 paths** |
| **update_table_dietary** | Full guest queryPaths | `guests.list` | **MISMATCH — chatbot missing 4 paths** |
| **create_event** | `events.list`, `timeline.list` | Same | MATCH |
| **update_event** | `events.list`, `timeline.list` | Same | MATCH |
| **add_timeline_item** | `timeline.list` | Same | MATCH |
| **add_vendor** | `vendors.list` | `vendors.list`, `budget.list`, `timeline.list` | **MISMATCH — chatbot has MORE (correct: chatbot cascades)** |
| **update_vendor** | `vendors.list` | `vendors.list`, `budget.list` | **MISMATCH — chatbot broader** |
| **delete_vendor** | `vendors.list` | `vendors.list`, `budget.list`, `timeline.list` | **MISMATCH — chatbot broader (correct)** |
| **add_hotel_booking** | `hotels.list` | Same | MATCH |
| **assign_transport** | `guestTransport.list` | Same | MATCH |
| **update_budget_item** | `budget.list`, `budget.overview` | Same | MATCH |
| **delete_budget_item** | `budget.list`, `budget.overview` | `budget.list`, `budget.overview`, `timeline.list` | **MISMATCH — chatbot broader (correct: deletes timeline)** |
| **add_gift** | `gifts.list` | Same | MATCH |
| **create_client** | `clients.list`, `clients.getAll` | `clients.list` | **MISMATCH — chatbot missing `clients.getAll`** |
| **update_client** | `clients.list`, `clients.getAll`, `clients.getById` | `clients.list` | **MISMATCH — chatbot missing 2 paths** |

**Note:** All phantom `.list`/`.overview` names are consistently used by both UI routers and TOOL_QUERY_MAP — they are equally broken on both sides (see S7-C01). The vendor mutations are the exception: the chatbot sends broader queryPaths than the UI router. The chatbot is arguably more correct because its executor cascades into budget and timeline tables.

### `getModuleFromToolName` Fallback Bug (`tool-executor.ts:618-630`)

Tools that don't match any substring check fall through to default `'guests'`:
- `assign_team_member` → module: `'guests'` (wrong)
- `send_communication` → module: `'guests'` (wrong)
- `update_pipeline` → module: `'guests'` (wrong)
- `create_proposal`, `create_invoice`, `update_website`, `create_workflow` → all `'guests'` (wrong)

The `module` field in SyncAction is cosmetic (queryPaths drive invalidation), but it corrupts logging and debugging.

---

## 7. Tenant Isolation Verification

### Redis Channel Naming

| Operation | Key Pattern | Isolation |
|-----------|-------------|-----------|
| Publish | `company:{companyId}:sync` | Per-company channel — **SAFE** |
| Store | `sync:{companyId}:actions` | Per-company sorted set — **SAFE** |
| Subscribe | `sync:{companyId}:actions` (polling) | Per-company — **SAFE** |

### SSE Subscription Filtering

1. `sync.router.ts:42`: `const { companyId, userId } = ctx` — companyId from authenticated session
2. `sync.router.ts:44-49`: Rejects if `!companyId` with `BAD_REQUEST`
3. `sync.router.ts:93`: `subscribeToCompany(companyId, signal)` — scoped to company
4. `sync.router.ts:95`: `action.userId !== userId` — filters out self-echoes
5. Redis keys include `companyId` — no cross-tenant key collisions

**Verdict: SAFE.** Company A events cannot leak to Company B. The companyId is extracted from the authenticated session (BetterAuth cookie), not from user input. Redis keys are namespaced per company.

### Edge Case: `companyId = null`

If a user somehow has a session without a companyId:
- `sync.router.ts:44-49` throws `BAD_REQUEST` — subscription rejected
- `broadcastSync` at caller sites: `companyId: ctx.companyId!` (non-null assertion) — if null, Redis key would be `company:null:sync`. This would create a single shared channel for all null-company users.
- **Risk: LOW.** The onboarding flow (`/api/user/sync/route.ts`) ensures companyId is set before dashboard access.

---

## 8. Connection Manager Verification

### Limits (`connection-manager.ts`)

| Limit | Value | Line |
|-------|-------|------|
| Per-user | 5 | 42 |
| Per-company | 50 | 45 |
| Counter TTL | 7200s (2 hours) | 50 |
| Key prefix | `sse:conn` | 53 |

### Acquire/Release Flow in sync.router.ts

```
sync.router.ts:54  → guard = await sseConnections.acquire(userId, companyId)
sync.router.ts:56  → catch SSEConnectionLimitError → throw TRPCError TOO_MANY_REQUESTS
sync.router.ts:66  → try { ... SSE loop ... }
sync.router.ts:107 → finally { await guard.release() }
```

**Verified:**
- Acquire BEFORE SSE loop (line 54)
- Release in `finally` block (line 107–110) — runs even on error/abort
- `SSEConnectionLimitError` caught and converted to `TRPCError` with code `TOO_MANY_REQUESTS` (line 56-63)
- Guard is idempotent (`if (released) return` at `connection-manager.ts:178`)
- Negative counter cleanup: if DECR goes to 0 or below, key is DELeted (lines 190-193)

### Race Condition in Acquire

`connection-manager.ts:151-172`:
1. `canConnect()` — reads current counts (GET + GET)
2. If allowed, `pipeline.incr()` + `pipeline.expire()` — increments (INCR + EXPIRE + INCR + EXPIRE)

**Gap:** Between step 1 (check) and step 2 (increment), another request could also pass the check. Two concurrent requests both see count=4 (limit=5), both increment to 6, exceeding the limit. This is a TOCTOU (time-of-check/time-of-use) race.

**Severity: MEDIUM.** The TTL safety net prevents permanent leaks. The overshoot is bounded (at most +N concurrent requests). For 5 max per user, briefly allowing 6-7 is not harmful.

---

## 9. Redis Failure Handling Analysis

### What Happens When Redis Is Down

| Component | Behavior | File:Line |
|-----------|----------|-----------|
| `publishSyncAction` | Catches error, logs, does NOT throw | redis-pubsub.ts:78-81 |
| `storeSyncAction` | Catches error, logs, does NOT throw | redis-pubsub.ts:108-111 |
| `broadcastSync` | Catches Promise.all rejection, logs, does NOT throw | broadcast-sync.ts:35-38 |
| `broadcastSheetSync` | `.catch()` on Promise.all, logs | sheets-sync.ts:131 |
| `executeToolWithSync` | Catches, `console.warn`, does NOT throw | tool-executor.ts:596-598 |
| `getMissedActions` | Catches error, returns empty array `[]` | redis-pubsub.ts:140-143 |
| `subscribeToCompany` | Catches, waits 2s, retries polling loop | redis-pubsub.ts:180-183 |
| `sseConnections.acquire` | **THROWS** — Redis failure propagates | connection-manager.ts:167-172 |
| `sseConnections.release` | Catches implicit — `pipeline.exec()` could fail silently | connection-manager.ts:181-184 |

### Failure Modes

**Redis down during mutation:**
- Mutation succeeds (DB write committed)
- broadcastSync fails silently (logged)
- Other tabs never receive the update
- Data is NOT lost, just not broadcast

**Redis down during SSE subscription:**
- `sseConnections.acquire` → Redis GET fails → exception propagates → `TRPCError` thrown → SSE connection rejected
- **This is too aggressive.** If Redis is temporarily down, NO new SSE connections can be established, even though the database is fine. Should degrade gracefully.

**Redis down during ongoing subscription:**
- `subscribeToCompany` polling fails → catches error → waits 2s → retries
- SSE connection stays alive, just receives no events
- **This is correct** — graceful degradation with retry.

**Redis counter leak:**
- If server crashes without calling `release()`, the INCR'd counter stays in Redis
- TTL of 7200s (2 hours) is the safety net — counter expires and resets
- Correct design.

---

## 10. End-to-End Trace

**Scenario:** User A adds a guest on Tab 1. User B on Tab 2 should see the update.

### Step 1: Mutation (User A, Tab 1)

```
File: src/features/guests/server/routers/guests.router.ts
Line 87: create: adminProcedure → handler executes
Line 130-250: withTransaction → INSERT into guests, cascade side effects
Line 247: recalcClientStats(tx, clientId) — inside transaction
Line 250: transaction commits
```

### Step 2: broadcastSync (server-side, after commit)

```
File: src/features/guests/server/routers/guests.router.ts
Line 255-263: broadcastSync({
  type: 'insert',
  module: 'guests',
  entityId: result.guest.id,
  companyId: ctx.companyId!,
  clientId: input.clientId,
  userId: ctx.userId!,
  queryPaths: ['guests.list', 'guests.getStats', 'hotels.list',
               'guestTransport.list', 'budget.overview'],
})
```

### Step 3: Redis Operations (parallel)

```
File: src/lib/realtime/broadcast-sync.ts
Line 31-34: Promise.all([
  publishSyncAction(syncAction),   // → redis-pubsub.ts:73
  storeSyncAction(syncAction),     // → redis-pubsub.ts:92
])
```

**publishSyncAction** (`redis-pubsub.ts:73-82`):
```
Line 74: channel = `company:${companyId}:sync`
Line 77: redis.publish(channel, JSON.stringify(action))
→ NOTE: This PUBLISH has zero subscribers (see S7-C02). No-op.
```

**storeSyncAction** (`redis-pubsub.ts:92-112`):
```
Line 93: key = `sync:${companyId}:actions`
Line 97-100: redis.zadd(key, { score: timestamp, member: JSON.stringify(action) })
Line 104: redis.zremrangebyrank(key, 0, -1001) // cap at 1000
Line 107: redis.expire(key, 86400) // 24h TTL
```

### Step 4: Subscription Polling (User B's SSE connection)

```
File: src/lib/realtime/redis-pubsub.ts
Line 158-185: subscribeToCompany(companyId, signal) — async generator
Line 171: getMissedActions(companyId, lastTimestamp)
  → Line 131: redis.zrange(key, lastTimestamp+1, '+inf', { byScore: true })
  → Returns the SyncAction stored in step 3
Line 174: lastTimestamp = action.timestamp
Line 175: yield action  ← yielded to sync.router.ts
Line 179: await sleep(500ms)  ← polls every 500ms
```

### Step 5: SSE Delivery (sync.router.ts)

```
File: src/server/trpc/routers/sync.router.ts
Line 93: for await (const action of subscribeToCompany(companyId, signal))
Line 95-96: if (action.userId !== userId) → User A's action, User B's subscription → passes
Line 97: yield action  ← sent via SSE to User B's browser
```

### Step 6: Client-Side Handling (User B, Tab 2)

```
File: src/features/realtime/hooks/use-realtime-sync.ts
Line 147: trpc.sync.onSync.useSubscription(...)
Line 156: onData(action) → handleSyncAction(action)
Line 122-143: handleSyncAction:
  Line 124: setLastSync(action.timestamp) — updates localStorage
  Line 131: invalidateQueries(action.queryPaths)
```

### Step 7: Cache Invalidation (THE BROKEN STEP)

```
File: src/features/realtime/hooks/use-realtime-sync.ts
Line 86-116: invalidateQueries(['guests.list', 'guests.getStats', ...])

For each path, splits on '.' and matches against TanStack Query cache keys:
  path 'guests.list' → parts = ['guests', 'list']
  → predicate checks: trpcKey[0] === 'guests' ✓, trpcKey[1] === 'list' ✗
  → Actual tRPC key: [['guests', 'getAll'], { input: {...} }]
  → trpcKey[1] is 'getAll', not 'list' → NO MATCH
  → Cache NOT invalidated ← BUG (S7-C01)

  path 'guests.getStats' → parts = ['guests', 'getStats']
  → trpcKey = ['guests', 'getStats'] → MATCH ✓
  → Cache invalidated → stats UI refreshes

  path 'hotels.list' → NO MATCH (hotels procedure is 'getAll')
  path 'guestTransport.list' → MATCH ✓ (guestTransport has 'list' at line 767)
  path 'budget.overview' → NO MATCH (no 'overview' procedure)
```

**Result:** Of the 5 queryPaths broadcast for a guest create, only 2 match actual cache keys:
- `guests.getStats` ✓
- `guestTransport.list` ✓ (has a `list` procedure at line 767)

The guest list itself (`guests.getAll`) is never invalidated. User B does NOT see the new guest.

---

## 11. Client-Side SSE Handler Analysis

### `useRealtimeSync` Hook (`use-realtime-sync.ts`)

**Connection:** Uses `trpc.sync.onSync.useSubscription()` (line 147). tRPC v11 SSE-based subscriptions with automatic reconnect on error.

**Reconnection:**
- `onError` callback (line 159): sets `isConnected = false`
- Comment at line 163: "tRPC will automatically attempt to reconnect"
- Manual `reconnect()` function (line 171): increments `subscriptionKey` to force remount

**Issue:** `subscriptionKey` (line 66) is never passed to `useSubscription`. The manual reconnect sets `setSubscriptionKey(k+1)` but the subscription doesn't use this key as a dependency. The `useEffect` cleanup at line 178 triggers on `subscriptionKey` change, but the subscription itself doesn't remount. Manual reconnect may be non-functional.

**Offline Recovery:**
- `lastSyncTimestamp` persisted to `localStorage` under key `weddingflo:lastSyncTimestamp` (line 22, 79, 126)
- Passed as input to `onSync` subscription (line 148): `{ lastSyncTimestamp: lastSync || undefined }`
- Server sends missed actions (sync.router.ts:72-88) via `getMissedActions(companyId, lastSyncTimestamp)`
- **CORRECT:** If Tab 2 was offline for 5 minutes, on reconnect it receives all missed actions from the sorted set

**Duplicate Event Handling:**
- **NONE.** There is no deduplication logic. If the same SyncAction is received twice (e.g., from both publish and store paths, or on reconnect), it will invalidate queries twice.
- Impact: LOW — double invalidation just causes an extra refetch

**Cache Invalidation Predicate:**
- `invalidateQueries` (line 86-116): splits queryPath on `.`, matches each segment against TanStack Query's tRPC key array
- Uses `queryClient.invalidateQueries({ predicate })` — marks matching queries as stale, triggering refetch on next render
- **BUG:** Matching is strict segment comparison — `.list` ≠ `.getAll` (see S7-C01)

### Integration Point

- `RealtimeWrapper` in dashboard layout (`src/app/[locale]/(dashboard)/layout.tsx:139-183`)
- All dashboard pages are wrapped → all pages can receive sync events
- Status indicator via `useRealtimeStatus()` context hook

---

## 12. Missed Events — Import, Batch, Cascade Operations

### Excel Import (`import.router.ts`)

| Module | broadcastSync? | queryPaths | Cascade Coverage |
|--------|---------------|------------|------------------|
| budget | YES (line 752) | `budget.list`, `budget.overview` | N/A |
| hotels | YES (line 777) | `hotels.list`, `hotels.getStats`, `timeline.list` | Timeline ✓ |
| transport | YES (line 802) | `guestTransport.list`, `guestTransport.getStats`, `timeline.list` | Timeline ✓ |
| vendors | YES (line 818) | `vendors.list`, `vendors.getStats`, `budget.list` | Budget ✓ |
| guests | YES (line 1082) | `guests.list`, `guests.getStats`, `hotels.list`, `guestTransport.list`, `budget.overview`, `budget.list` | **Missing `timeline.list`** — guest import cascades into hotels/transport → timeline, but timeline.list is not in queryPaths |
| gifts | YES (line 1082) | `gifts.list`, `gifts.getStats` | N/A |

### Google Sheets Import (`sheets-sync.ts` + `googleSheets.router.ts`)

`broadcastSheetSync` uses `getQueryPathsForModule()` (sheets-sync.ts:92-103):

| Module | queryPaths | Correct Names? |
|--------|------------|----------------|
| guests | `guests.getAll`, `guests.getStats`, `guests.getDietaryStats` | ✓ All match real procedures |
| budget | `budget.getAll`, `budget.getStats` | **`budget.getStats` is PHANTOM** — procedure is `getSummary` |
| timeline | `timeline.getAll` | ✓ |
| hotels | `hotels.getAll` | ✓ |
| transport | `guestTransport.getAll` | ✓ |
| vendors | `vendors.getAll` | ✓ |
| gifts | `gifts.getAll` | ✓ |

**Cross-module cascade gap:** When `importFromSheet` imports guests (single module), cascade sync runs (`syncGuestsToHotelsAndTransportTx`, `syncHotelsToTimelineTx`, `syncTransportToTimelineTx` at googleSheets.router.ts:449-475). But `broadcastSheetSync` only fires for the imported module (`guests.getAll`). Hotels, transport, and timeline panels don't refresh.

### Cascade Sync Functions (`auto-sync-trigger.ts`)

| Function | Lines | Writes To | broadcastSync? |
|----------|-------|-----------|---------------|
| `syncGuestsToHotelsAndTransportTx` | 116-264 | hotels, guestTransport | **NO** |
| `syncHotelsToTimelineTx` | 282-330 | timeline | **NO** |
| `syncTransportToTimelineTx` | 348-402 | timeline | **NO** |
| `triggerFullSync` | 409-439 | All of the above | **NO** |
| `triggerBatchSync` | 48-98 | All of the above | **NO** |

**These functions are broadcast-blind.** They write rows to hotels, transport, and timeline but never broadcast. Callers are expected to broadcast — but callers often don't include the cascaded modules in their queryPaths.

### recalcClientStats (Session 6)

`recalcClientStats` writes to `clients.budget` and `clients.guestCount` (client-stats-sync.ts:50-58). This updates the clients table, but no broadcastSync fires for the clients module from recalcClientStats itself. The calling router broadcasts for its own module (e.g., `guests.list`), not for `clients.getAll`.

**Impact:** If a user has the client list page open (showing budget/guestCount), and another tab creates budget items, the client list won't refresh to show the updated cached totals — because no broadcastSync fires with `clients.getAll` or `clients.list` from budget mutations.

---

## 13. Transaction Placement Verification

**All 39 broadcastSync calls are OUTSIDE their enclosing transactions.** This is correct — broadcasting inside a transaction could notify clients before the commit, causing them to read stale data.

Verified pattern across all files:
```typescript
await withTransaction(async (tx) => {
  // ... all DB writes ...
  await recalcClientStats(tx, clientId)  // inside tx
})
// ↓ AFTER commit ↓
await broadcastSync({ ... })  // outside tx — CORRECT
```

**No violations found.** Every broadcastSync, broadcastSheetSync, and `publishSyncAction`+`storeSyncAction` call is after the transaction boundary.

---

## 14. All Findings

### S7-C01 CRITICAL — Phantom queryPath Names Break Cache Invalidation

| Field | Value |
|-------|-------|
| **Status** | OPEN |
| **Files** | All 11 module routers, query-invalidation-map.ts |
| **Problem** | broadcastSync queryPaths use `.list` and `.overview` names that don't exist as tRPC procedures. The client-side `invalidateQueries` predicate (`use-realtime-sync.ts:86-116`) does exact segment matching. `guests.list` splits to `['guests', 'list']` but the actual tRPC query key is `['guests', 'getAll']`. Result: cache invalidation silently fails. |

**Phantom queryPath → Correct procedure name mapping:**

| Phantom queryPath | Procedure Name | Exists? | Used In |
|-------------------|---------------|---------|---------|
| `guests.list` | `guests.getAll` | ✗ no `list` | guests, events, budget, import routers + TOOL_QUERY_MAP |
| `budget.list` | `budget.getAll` | ✗ no `list` | budget, vendors, import routers + TOOL_QUERY_MAP |
| `budget.overview` | `budget.getSummary` | ✗ no `overview` | guests, budget routers + TOOL_QUERY_MAP |
| `events.list` | `events.getAll` | ✗ no `list` | events router + TOOL_QUERY_MAP |
| `timeline.list` | `timeline.getAll` | ✗ no `list` | events, timeline, vendors, import routers + TOOL_QUERY_MAP |
| `vendors.list` | `vendors.getAll` | ✗ no `list` | vendors, import routers + TOOL_QUERY_MAP |
| `hotels.list` | `hotels.getAll` | ✗ no `list` | guests, hotels, import routers + TOOL_QUERY_MAP |
| `gifts.list` | `gifts.getAll` | ✗ no `list` | gifts router + TOOL_QUERY_MAP |

**Valid queryPaths (these DO match real procedures):**

| queryPath | Procedure | Why Valid |
|-----------|-----------|-----------|
| `guests.getStats` | `guests.getStats` | ✓ Exact match |
| `guestTransport.list` | `guestTransport.list` | ✓ Has `list` at line 767 |
| `floorPlans.list` | `floorPlans.list` | ✓ Has `list` at line 24 |
| `floorPlans.getById` | `floorPlans.getById` | ✓ Exact match |
| `clients.list` | `clients.list` | ✓ Has `list` at line 288 |
| `clients.getAll` | `clients.getAll` | ✓ Exact match |
| `clients.getById` | `clients.getById` | ✓ Exact match |

**Impact:** The primary list query for 8 of 11 modules (guests, budget, events, timeline, vendors, hotels, gifts, and partially hotels) is never invalidated by broadcastSync. Real-time sync is effectively non-functional for most module list views.

**Fix:** Rename all `.list` → `.getAll` and `.overview` → `.getSummary` (or the correct procedure name) in every broadcastSync call site and in TOOL_QUERY_MAP. Alternatively, make the predicate do prefix-only matching (match just `['guests']` for `guests.list`), but this over-invalidates.

---

### S7-C02 CRITICAL — `publishSyncAction` Is a No-Op

| Field | Value |
|-------|-------|
| **Status** | OPEN |
| **File** | redis-pubsub.ts:73-82, redis-pubsub.ts:158-185 |
| **Problem** | `publishSyncAction()` uses `redis.publish()` to send to channel `company:{companyId}:sync`. But `subscribeToCompany()` does NOT use `redis.subscribe()` — it polls the sorted set via `getMissedActions()`. The Upstash REST API does not support persistent pub/sub subscriptions (noted in comment at line 150-153). Result: every `redis.publish()` call publishes to a channel with zero subscribers. The event is only delivered via the sorted set (storeSyncAction). |
| **Impact** | `publishSyncAction` wastes one Redis REST API call per mutation (adds latency). No functional impact since `storeSyncAction` + polling delivers the event. But the architecture documentation and code comments suggest pub/sub is active when it is not. |
| **Fix** | Either: (a) Remove `publishSyncAction` call entirely (save API calls), or (b) switch to Upstash Redis TCP client for true pub/sub (reduces 500ms polling latency to near-instant). |

---

### S7-H01 HIGH — 26 Router Mutations Missing broadcastSync

| Field | Value |
|-------|-------|
| **Status** | OPEN |
| **Affected** | 7 router files, 26 mutations |

**Full list:**

| Router | Mutation | Line | Tables Written |
|--------|----------|------|---------------|
| guests | `checkIn` | 1269 | guests |
| budget | `addAdvancePayment` | 569 | advancePayments, budget, clientVendors |
| budget | `updateAdvancePayment` | 657 | advancePayments, budget, clientVendors |
| budget | `deleteAdvancePayment` | 732 | advancePayments, budget, clientVendors |
| events | `updateStatus` | 497 | events |
| timeline | `reorder` | 314 | timeline (N rows) |
| timeline | `markComplete` | 358 | timeline |
| hotels | `checkIn` | 617 | hotels |
| hotels | `syncWithGuests` | 758 | hotels (batch) |
| transport | `syncWithGuests` | 753 | guestTransport (batch) |
| vendors | `updateApprovalStatus` | 810 | clientVendors |
| vendors | `addComment` | 850 | vendorComments |
| vendors | `deleteComment` | 922 | vendorComments |
| vendors | `updatePaymentStatus` | 936 | clientVendors |
| vendors | `bulkCreateFromCommaList` | 1130 | vendors, clientVendors, budget |
| vendors | `addVendorAdvance` | 1312 | advancePayments, budget |
| vendors | `updateVendorAdvance` | 1385 | advancePayments, budget |
| vendors | `deleteVendorAdvance` | 1452 | advancePayments, budget |
| vendors | `addReview` | 1505 | vendorReviews, vendors |
| vendors | `deleteReview` | 1602 | vendorReviews, vendors |
| floor-plans | `saveVersion` | 1020 | seatingVersions |
| floor-plans | `loadVersion` | 1110 | floorPlanGuests, floorPlanTables |
| floor-plans | `deleteVersion` | 1222 | seatingVersions |
| floor-plans | `addGuestConflict` | 1395 | guestConflicts |
| floor-plans | `addGuestPreference` | 1438 | guestPreferences |
| floor-plans | `removeGuestConflict` | 1473 | guestConflicts |
| floor-plans | `removeGuestPreference` | 1500 | guestPreferences |

---

### S7-H02 HIGH — Cascade Sync Functions Are Broadcast-Blind

| Field | Value |
|-------|-------|
| **Status** | OPEN |
| **File** | `src/lib/backup/auto-sync-trigger.ts` (all functions) |
| **Problem** | `syncGuestsToHotelsAndTransportTx`, `syncHotelsToTimelineTx`, `syncTransportToTimelineTx`, `triggerFullSync`, `triggerBatchSync` all write to hotels/transport/timeline but never call broadcastSync. Callers must broadcast — but callers often omit the cascaded module paths. |
| **Impact** | When guest import triggers hotel/transport/timeline cascades, those modules' UI doesn't refresh. |

---

### S7-H03 HIGH — Guest Import Missing `timeline.list` in queryPaths

| Field | Value |
|-------|-------|
| **Status** | OPEN |
| **File** | import.router.ts:1073 |
| **Problem** | Guest import runs `syncHotelsToTimelineTx` + `syncTransportToTimelineTx` (lines 1033, 1042) but broadcastSync at line 1082 uses queryPaths `['guests.list', 'guests.getStats', 'hotels.list', 'guestTransport.list', 'budget.overview', 'budget.list']` — `timeline.list` is absent. |

---

### S7-H04 HIGH — Sheets Import Cross-Module Cascade Gap

| Field | Value |
|-------|-------|
| **Status** | OPEN |
| **File** | googleSheets.router.ts:483-489, sheets-sync.ts:92-103 |
| **Problem** | Single-module guest import cascades into hotels/transport/timeline (lines 449-475) but `broadcastSheetSync` only fires for `guests.getAll`. Hotels, transport, timeline panels don't refresh. |

---

### S7-H05 HIGH — `broadcastSheetSync` Uses Phantom `budget.getStats`

| Field | Value |
|-------|-------|
| **Status** | OPEN |
| **File** | sheets-sync.ts:95 |
| **Problem** | `getQueryPathsForModule('budget')` returns `['budget.getAll', 'budget.getStats']`. Budget router has `getSummary` (line 793), not `getStats`. The `budget.getStats` path is phantom. |

---

### S7-H06 HIGH — Chatbot queryPath Mismatches (Under-Broadcasting)

| Field | Value |
|-------|-------|
| **Status** | OPEN |
| **File** | query-invalidation-map.ts |
| **Problem** | Several chatbot tools broadcast fewer queryPaths than their UI router equivalents: |

| Tool | Missing Paths |
|------|---------------|
| `bulk_update_guests` (line 26) | `hotels.list`, `guestTransport.list`, `budget.overview` |
| `assign_guests_to_events` (line 28) | `guests.getStats`, `hotels.list`, `guestTransport.list`, `budget.overview` |
| `update_table_dietary` (line 29) | `guests.getStats`, `hotels.list`, `guestTransport.list`, `budget.overview` |
| `create_client` (line 20) | `clients.getAll` |
| `update_client` (line 21) | `clients.getAll`, `clients.getById` |

---

### S7-H07 HIGH — recalcClientStats Does Not Broadcast Clients Module

| Field | Value |
|-------|-------|
| **Status** | OPEN |
| **Files** | All 23 recalcClientStats call sites (Session 6) |
| **Problem** | `recalcClientStats` writes to `clients.budget` and `clients.guestCount`. But the calling router's broadcastSync only targets its own module (e.g., `budget.list`), not `clients.list`/`clients.getAll`. If a user has the client list open, budget/guest count changes won't appear until manual refresh. |

---

### S7-H08 HIGH — `budget.delete` and `clients.delete` Missing `clientId`

| Field | Value |
|-------|-------|
| **Status** | OPEN |
| **Files** | budget.router.ts:520-527, clients.router.ts:1253-1260 |
| **Problem** | Both broadcastSync calls omit the `clientId` field. While `clientId` is optional in SyncAction, its absence means client-scoped filtering (if implemented) won't work for these events. |

---

### S7-H09 HIGH — Vendor broadcastSync Under-Invalidates Cascaded Modules

| Field | Value |
|-------|-------|
| **Status** | OPEN |
| **File** | vendors.router.ts:490, 723, 795 |
| **Problem** | Vendor create/update/delete cascade into `budget` and `timeline` tables (inside withTransaction), but broadcastSync only sends `['vendors.list']`. Budget and timeline panels don't refresh after vendor mutations. The chatbot's TOOL_QUERY_MAP correctly includes `budget.list` and `timeline.list` for vendors — the UI router is wrong. |

---

### S7-M01 MEDIUM — TOCTOU Race in Connection Limiter

| Field | Value |
|-------|-------|
| **File** | connection-manager.ts:151-172 |
| **Problem** | `canConnect()` (read) and `pipeline.incr()` (write) are not atomic. Concurrent requests can both pass the check and exceed the limit. |
| **Impact** | Bounded overshoot (at most +N concurrent requests). TTL auto-corrects. Low practical risk. |

---

### S7-M02 MEDIUM — `getModuleFromToolName` Default `'guests'`

| Field | Value |
|-------|-------|
| **File** | tool-executor.ts:618-630 |
| **Problem** | 8+ tools fall through to default module `'guests'` (assign_team_member, send_communication, update_pipeline, create_proposal, create_invoice, update_website, create_workflow). Corrupts SyncAction.module for logging/debugging. |

---

### S7-M03 MEDIUM — `loadVersion` Non-Atomic

| Field | Value |
|-------|-------|
| **File** | floor-plans.router.ts:1110 |
| **Problem** | Deletes all floorPlanGuests, updates floorPlanTables, inserts new floorPlanGuests — 3+ sequential ctx.db calls with no transaction. Partial failure leaves inconsistent state. Also missing broadcastSync. |

---

### S7-M04 MEDIUM — `batchAssignGuests` Non-Atomic

| Field | Value |
|-------|-------|
| **File** | floor-plans.router.ts:800-828 |
| **Problem** | Delete + insert without transaction. If insert fails, guests are deleted but not re-assigned. |

---

### S7-M05 MEDIUM — `floor-plans.delete` Non-Atomic

| Field | Value |
|-------|-------|
| **File** | floor-plans.router.ts:929-950 |
| **Problem** | Three sequential deletes (floorPlanGuests, floorPlanTables, floorPlans) without transaction. |

---

### S7-M06 MEDIUM — `vendors.bulkCreateFromCommaList` Non-Atomic

| Field | Value |
|-------|-------|
| **File** | vendors.router.ts:1130 |
| **Problem** | For-loop of inserts (vendors, clientVendors, budget) on ctx.db without transaction. Mid-loop failure leaves partial vendor set. |

---

### S7-M07 MEDIUM — `timeline.bulkImport` Non-Atomic

| Field | Value |
|-------|-------|
| **File** | timeline.router.ts:568-719 |
| **Problem** | Loop of individual ctx.db insert/update/delete calls without transaction, single broadcastSync after the loop. |

---

### S7-M08 MEDIUM — sseConnections.acquire Throws on Redis Failure

| Field | Value |
|-------|-------|
| **File** | connection-manager.ts:167-172 |
| **Problem** | If Redis is temporarily down, `pipeline.exec()` throws, preventing any new SSE connections. Should degrade gracefully (allow connection without limit enforcement). |

---

### S7-M09 MEDIUM — Cascade Sync Functions Called with Bare `db` Instead of Transaction

| Field | Value |
|-------|-------|
| **Files** | googleSheets.router.ts:449-475, sheets-sync.ts:1415-1453 |
| **Problem** | `syncGuestsToHotelsAndTransportTx`, `syncHotelsToTimelineTx`, `syncTransportToTimelineTx` are designed to receive a transaction client (`tx`) but are called with bare `db` pool connection. The `Tx` suffix implies transactional use. Non-atomic with the preceding import. |

---

### S7-M10 MEDIUM — `importAllFromSheets` Broadcast Gated on Optional `userId`

| Field | Value |
|-------|-------|
| **File** | sheets-sync.ts:1389, 1472 |
| **Problem** | `userId` parameter is optional. If omitted, the entire broadcast block at line 1472 is skipped. Future callers that forget to pass `userId` will silently skip all broadcasts. |

---

### S7-L01 LOW — Duplicate Line Number in redis-pubsub.ts

| Field | Value |
|-------|-------|
| **File** | redis-pubsub.ts:136 |
| **Problem** | Line 136 appears twice (duplicate). Cosmetic — no functional impact. |

---

### S7-L02 LOW — `subscriptionKey` Not Wired to Subscription

| Field | Value |
|-------|-------|
| **File** | use-realtime-sync.ts:66, 171 |
| **Problem** | `subscriptionKey` state is incremented by `reconnect()` but never passed to `useSubscription`. Manual reconnect via `reconnect()` may not actually remount the subscription. |

---

### S7-L03 LOW — Seating Version Operations Silent

| Field | Value |
|-------|-------|
| **File** | floor-plans.router.ts:1020, 1110, 1222 |
| **Problem** | `saveVersion`, `loadVersion`, `deleteVersion` — seating versioning is an internal feature. No broadcastSync means other tabs won't see version changes. Low user impact since versioning is typically single-user. |

---

### S7-L04 LOW — `logChange` and Preference/Conflict Operations Silent

| Field | Value |
|-------|-------|
| **File** | floor-plans.router.ts:1312, 1395-1500 |
| **Problem** | `logChange` is audit-log-only. `addGuestConflict/Preference`, `removeGuestConflict/Preference` are constraint metadata. Low user-facing impact. |

---

### S7-L05 LOW — No Duplicate Event Filtering

| Field | Value |
|-------|-------|
| **File** | use-realtime-sync.ts |
| **Problem** | No deduplication by `action.id`. If the same action is received twice (e.g., on reconnect if lastTimestamp hasn't updated), queries are invalidated twice. Impact: extra refetch (minor perf). |

---

### S7-L06 LOW — 500ms Polling Latency

| Field | Value |
|-------|-------|
| **File** | redis-pubsub.ts:179 |
| **Problem** | Events are delivered with up to 500ms delay (polling interval). Not a bug — documented design trade-off for Upstash REST API. True pub/sub via Upstash TCP would reduce to near-instant. |

---

## 15. Cross-Session References

### From Previous Sessions → Session 7

| Source | Finding | Session 7 Result |
|--------|---------|-------------------|
| Session 2 | 30 broadcastSync call sites documented | Verified 39 total (9 added in Sessions 4-6). 29 mutations still missing. |
| Session 2 | floor-plans sub-ops missing broadcastSync | **Partially fixed in Session 6** (9 calls added). 9 more still missing (versions, conflicts, preferences). |
| Session 2 | budget advance payments missing broadcastSync | **STILL OPEN** (S7-H01) |
| Session 2 | vendors sub-operations missing broadcastSync | **STILL OPEN** (S7-H01) — 10 vendor mutations unbroadcast |
| Session 2 | timeline reorder/markComplete missing | **STILL OPEN** (S7-H01) |
| Session 5 | TOOL_QUERY_MAP rewritten (S5-C05) | Verified parity matrix — 5 chatbot tools under-broadcast vs UI (S7-H06) |
| Session 5 | broadcastSync failures must never block | **VERIFIED** — all 3 entry points swallow errors |
| Session 6 | Verify SSE delivery for floor plan changes | Verified broadcastSync fires, but queryPaths use phantom names (S7-C01) |
| Session 6 | Verify recalcClientStats broadcast coverage | **GAP FOUND** (S7-H07) — no clients module broadcast after stats recalc |
| Session 6 | broadcastSync outside transactions | **VERIFIED** — all 39 calls are outside transactions |

### Session 7 → Session 8 (Final Review)

| Finding | Action for Session 8 |
|---------|---------------------|
| S7-C01 | After fixing queryPath names, re-verify all 39 broadcastSync + TOOL_QUERY_MAP entries match real procedure names |
| S7-C02 | Decide: remove publishSyncAction (save API calls) or upgrade to Upstash TCP |
| S7-H01 | After adding broadcastSync to 26 missing mutations, re-audit coverage matrix |
| S7-H02 | After cascade functions get broadcastSync, verify no double-broadcast with caller |
| S7-H07 | After adding clients module broadcast to recalcClientStats callers, verify client list page refreshes |
| S7-M03/M04/M05/M06 | After wrapping non-atomic operations in transactions, verify broadcastSync is still outside |

---

## 16. Danger Zones — Read Before Editing

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

### 2. `publishSyncAction` Is Currently a No-Op

Do NOT rely on `redis.publish()` for real-time delivery. The subscription uses polling. If you add a new broadcast path, ensure `storeSyncAction()` is called — that's the actual delivery mechanism.

### 3. broadcastSync MUST Be Outside Transactions

Pattern: commit first, then broadcast. If you broadcast inside a transaction and another tab refetches, it may read pre-commit stale data.

### 4. Cascade Sync Functions Never Broadcast

If you call `syncGuestsToHotelsAndTransportTx` or similar, YOU are responsible for broadcasting the affected downstream modules. Include `hotels.getAll`, `guestTransport.getAll`, `timeline.getAll` in your broadcastSync queryPaths.

### 5. New Mutations MUST Have broadcastSync

Every new tRPC mutation that writes to the database must call broadcastSync after the write. Without it, multi-tab and multi-user real-time sync breaks silently.

### 6. Connection Manager Limits

5 per user, 50 per company. If you change these, update both `connection-manager.ts` constants AND any client-side retry logic. The TTL (2 hours) must be >= max SSE connection duration.

### 7. `broadcastSheetSync` and Router `broadcastSync` Use Different Naming

Sheets-sync uses `.getAll` (correct). Router broadcastSync uses `.list` (mostly phantom). When fixing S7-C01, ensure BOTH paths use the same correct names.
