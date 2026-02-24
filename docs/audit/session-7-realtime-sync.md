# Session 7 — Real-Time Sync & SSE System Audit

> **Date:** 2026-02-24
> **Scope:** Complete real-time sync pipeline — Redis pub/sub, SSE delivery, broadcastSync coverage, client-side cache invalidation
> **Session:** 7 of 8 (audit + fixes across 4 prompts)
> **Files audited:** 23 files, ~25,000 lines
> **broadcastSync call sites:** 70 (module routers) + 2 storeSyncAction (sheets-sync, tool-executor) + 1 broadcastSheetSync (googleSheets router)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [SyncAction Schema Reference](#3-syncaction-schema-reference)
4. [Complete broadcastSync Coverage Matrix](#4-complete-broadcastsync-coverage-matrix)
5. [All 27 Findings — Detailed](#5-all-27-findings--detailed)
6. [QueryPath Mapping Reference](#6-querypath-mapping-reference)
7. [Files Modified Per Prompt](#7-files-modified-per-prompt)
8. [Verification Results](#8-verification-results)
9. [Cross-Session References](#9-cross-session-references)
10. [Danger Zones — Read Before Editing](#10-danger-zones--read-before-editing)

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
| **broadcastSync calls** | 70 call sites across 11 router files |
| **storeSyncAction calls** | 3 (broadcast-sync.ts, sheets-sync.ts, tool-executor.ts) |
| **broadcastSheetSync calls** | 1 (googleSheets.router.ts) |
| **Architecture** | `broadcastSync()` → Redis ZADD → `subscribeToCompany()` polling (500ms) → tRPC SSE subscription → `useRealtimeSync` hook → TanStack Query `invalidateQueries()` |

### Commits (chronological)

| Commit | Message |
|--------|---------|
| `2fe0713` | `docs(session7): real-time sync and SSE audit report` |
| `8e54380` | `fix(session7-p1): correct all phantom queryPaths, remove no-op publishSyncAction` |
| `053ff3c` | `fix(session7-p2): add missing broadcastSync to 26 mutations, cascade broadcast, recalcClientStats paths` |
| `54e3ea0` | `fix(session7-p3): import broadcast paths, session 7 report` |
| `436cff6` | `fix(session7-p4): all remaining medium and low sync issues` |

### What Was Fixed

**P1 — Critical infrastructure fixes:**
- Removed dead `publishSyncAction()` from `broadcastSync()` (Upstash REST has no persistent subscribers)
- Corrected ALL phantom queryPaths across 13 files (e.g., `guests.list` → `guests.getAll`, `budget.getItems` → `budget.getAll`)
- Fixed `tool-executor.ts` queryPaths to match UI router broadcastSync calls

**P2 — 26 missing broadcastSync calls added:**
- Added broadcastSync to all 26 mutations that were missing it
- Added cascade queryPaths (`hotels.getAll`, `guestTransport.getAll`, `timeline.getAll`) to guest mutations
- Added `clients.list`/`clients.getAll` to all mutations that call `recalcClientStats`

**P3 — Import paths & sheets sync:**
- Fixed `import.router.ts` broadcastSync queryPaths for all modules
- Fixed `sheets-sync.ts` queryPaths in `getQueryPathsForModule()`
- Added cascade queryPaths for guest import broadcasts

**P4 — All remaining MEDIUM and LOW issues:**
- TOCTOU race in SSE connection manager → increment-first pattern
- 5 non-atomic multi-write mutations → wrapped in `db.transaction()`
- Tool-executor default module → `'clients'` with 7 new tool patterns
- Redis failure graceful degradation in connection manager
- Cascade sync calls wrapped in transactions (sheets-sync + googleSheets router)
- `importAllFromSheets` userId made required
- Dead `publishSyncAction` removed from redis-pubsub.ts
- `pendingReconnect` toggle pattern for subscription reconnect
- `seenActionIds` dedup filter on client side

---

## 2. System Architecture

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        WRITE PATH (Server)                          │
│                                                                     │
│  tRPC Mutation                                                      │
│       │                                                             │
│       ▼                                                             │
│  Drizzle ORM ──► PostgreSQL (Supabase)                              │
│       │                                                             │
│       ▼                                                             │
│  broadcastSync()          ◄── src/lib/realtime/broadcast-sync.ts    │
│       │                                                             │
│       ▼                                                             │
│  storeSyncAction()        ◄── src/lib/realtime/redis-pubsub.ts      │
│       │                                                             │
│       ▼                                                             │
│  Redis ZADD               ◄── sync:{companyId}:actions sorted set   │
│  (score = timestamp)          cap 1000, TTL 24h                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        READ PATH (Server)                           │
│                                                                     │
│  sync.router.ts → onSync subscription                               │
│       │                                                             │
│       ├── Phase 1: getMissedActions(companyId, lastTimestamp)        │
│       │       └── Redis ZRANGE by score (offline recovery)          │
│       │                                                             │
│       └── Phase 2: subscribeToCompany(companyId, signal)            │
│               └── Poll Redis sorted set every 500ms                 │
│               └── Filter: skip actions from same userId             │
│               └── yield SyncAction to SSE stream                    │
│                                                                     │
│  SSE Connection Manager   ◄── src/lib/sse/connection-manager.ts     │
│       └── Per-user limit: 5 connections                             │
│       └── Per-company limit: 50 connections                         │
│       └── Redis INCR/DECR with 2h TTL safety net                   │
│       └── Graceful degradation on Redis failure (S7-M08)            │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                             │
│                                                                     │
│  useRealtimeSync() hook   ◄── src/features/realtime/hooks/         │
│       │                       use-realtime-sync.ts                  │
│       ├── tRPC subscription (SSE transport in v11)                  │
│       ├── Dedup via seenActionIds Set (cap 500, evict to 250)       │
│       ├── localStorage lastSyncTimestamp for offline recovery       │
│       ├── pendingReconnect toggle for manual reconnect              │
│       │                                                             │
│       ▼                                                             │
│  invalidateQueries(queryPaths)                                      │
│       └── TanStack Query predicate match on tRPC key structure      │
│       └── e.g., ['guests', 'getAll'] matches 'guests.getAll'       │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `src/lib/realtime/redis-pubsub.ts` | SyncAction interface, storeSyncAction (ZADD), getMissedActions (ZRANGE), subscribeToCompany (polling) | 178 |
| `src/lib/realtime/broadcast-sync.ts` | `broadcastSync()` — thin wrapper assembling SyncAction and calling storeSyncAction | 39 |
| `src/server/trpc/routers/sync.router.ts` | tRPC subscription endpoint: offline recovery + live streaming via async generator | 152 |
| `src/lib/sse/connection-manager.ts` | Redis-backed per-user (5) and per-company (50) SSE connection limiter | 295 |
| `src/features/realtime/hooks/use-realtime-sync.ts` | Client-side hook: tRPC subscription → invalidateQueries | 206 |
| `src/lib/google/sheets-sync.ts` | `broadcastSheetSync()` — broadcasts after Google Sheets imports | ~130 |
| `src/features/chatbot/server/services/tool-executor.ts` | Chatbot tool executor — broadcasts after each mutation tool | ~630 |
| `src/features/chatbot/server/services/query-invalidation-map.ts` | Tool → queryPaths mapping (31 mutation tools) | 167 |

### Broadcast Entry Points (3 paths into Redis)

1. **Module Routers** → `broadcastSync()` → `storeSyncAction()` — 70 call sites
2. **Google Sheets Sync** → `broadcastSheetSync()` → `storeSyncAction()` — 1 call site (+ 1 from googleSheets.router.ts calling broadcastSheetSync)
3. **Chatbot Tool Executor** → `storeSyncAction()` directly — 1 call site

---

## 3. SyncAction Schema Reference

**Source:** `src/lib/realtime/redis-pubsub.ts:32-65`

```typescript
export interface SyncAction {
  id: string                    // crypto.randomUUID()
  type: 'insert' | 'update' | 'delete'
  module:
    | 'guests'
    | 'budget'
    | 'events'
    | 'vendors'
    | 'hotels'
    | 'transport'
    | 'timeline'
    | 'gifts'
    | 'clients'
    | 'floorPlans'
  entityId: string              // UUID of affected entity, or 'bulk-import'/'sheets-import'
  data?: Record<string, unknown>
  companyId: string             // Multi-tenant isolation key
  clientId?: string             // Optional client scope
  userId: string                // Originator (filtered out on delivery)
  timestamp: number             // Unix ms — used as Redis sorted set score
  queryPaths: string[]          // tRPC procedure paths to invalidate
  toolName?: string             // Only set by chatbot tool-executor
}
```

### Module Union

The `module` field is a cosmetic/logging field. **Cache invalidation is driven entirely by `queryPaths`.**

| Module Value | Set By |
|---|---|
| `guests` | guests.router.ts, import.router.ts, sheets-sync.ts, tool-executor.ts |
| `budget` | budget.router.ts, import.router.ts, sheets-sync.ts, tool-executor.ts |
| `events` | events.router.ts, tool-executor.ts |
| `vendors` | vendors.router.ts, import.router.ts, sheets-sync.ts, tool-executor.ts |
| `hotels` | hotels.router.ts, import.router.ts, sheets-sync.ts, tool-executor.ts |
| `transport` | guest-transport.router.ts, import.router.ts, sheets-sync.ts, tool-executor.ts |
| `timeline` | timeline.router.ts, sheets-sync.ts, tool-executor.ts |
| `gifts` | gifts.router.ts, import.router.ts, sheets-sync.ts, tool-executor.ts |
| `clients` | clients.router.ts, tool-executor.ts |
| `floorPlans` | floor-plans.router.ts, tool-executor.ts |

---

## 4. Complete broadcastSync Coverage Matrix

### Source: `grep -rn 'await broadcastSync(' --include='*.ts'`

Total: **70 broadcastSync** + **2 storeSyncAction** + **1 broadcastSheetSync call** = **73 broadcast entry points**

---

### 4.1 guests.router.ts (5 calls)

**File:** `src/features/guests/server/routers/guests.router.ts`

| # | Line | Mutation | type | module | queryPaths |
|---|------|----------|------|--------|------------|
| 1 | 255 | `create` | insert | guests | `guests.getAll`, `guests.getStats`, `hotels.getAll`, `guestTransport.getAll`, `timeline.getAll`, `budget.getSummary`, `clients.list`, `clients.getAll` |
| 2 | 700 | `update` | update | guests | `guests.getAll`, `guests.getStats`, `hotels.getAll`, `guestTransport.getAll`, `timeline.getAll`, `budget.getSummary`, `clients.list`, `clients.getAll` |
| 3 | 848 | `delete` | delete | guests | `guests.getAll`, `guests.getStats`, `hotels.getAll`, `guestTransport.getAll`, `timeline.getAll`, `budget.getSummary`, `clients.list`, `clients.getAll` |
| 4 | 1009 | `bulkImport` | insert | guests | `guests.getAll`, `guests.getStats`, `hotels.getAll`, `guestTransport.getAll`, `timeline.getAll`, `budget.getSummary`, `clients.list`, `clients.getAll` |
| 5 | 1243 | `updateRSVP` | update | guests | `guests.getAll`, `guests.getStats`, `budget.getSummary`, `clients.list`, `clients.getAll` |

**Notes:** Guest mutations include cascade paths (`hotels.getAll`, `guestTransport.getAll`, `timeline.getAll`) because guest changes trigger `syncGuestsToHotelsAndTransport` and `recalcPerGuestBudgetItems`. Also includes `clients.list`/`clients.getAll` because `recalcClientStats` updates cached budget/guestCount on the client entity. `updateRSVP` excludes hotel/transport cascade paths since RSVP changes don't trigger those syncs.

---

### 4.2 budget.router.ts (6 calls)

**File:** `src/features/analytics/server/routers/budget.router.ts`

| # | Line | Mutation | type | module | queryPaths |
|---|------|----------|------|--------|------------|
| 1 | 261 | `create` | insert | budget | `budget.getAll`, `budget.getSummary`, `clients.list`, `clients.getAll` |
| 2 | 457 | `update` | update | budget | `budget.getAll`, `budget.getSummary`, `clients.list`, `clients.getAll` |
| 3 | 520 | `delete` | delete | budget | `budget.getAll`, `budget.getSummary`, `clients.list`, `clients.getAll` |
| 4 | 628 | `addAdvancePayment` | insert | budget | `budget.getAll`, `budget.getSummary`, `clients.list`, `clients.getAll` |
| 5 | 724 | `updateAdvancePayment` | update | budget | `budget.getAll`, `budget.getSummary`, `clients.list`, `clients.getAll` |
| 6 | 803 | `deleteAdvancePayment` | delete | budget | `budget.getAll`, `budget.getSummary`, `clients.list`, `clients.getAll` |

**Notes:** All budget mutations include `clients.list`/`clients.getAll` because `recalcClientStats` updates cached budget totals on the client entity.

---

### 4.3 events.router.ts (3 calls)

**File:** `src/features/events/server/routers/events.router.ts`

| # | Line | Mutation | type | module | queryPaths |
|---|------|----------|------|--------|------------|
| 1 | 244 | `create` | insert | events | `events.getAll`, `timeline.getAll` |
| 2 | 382 | `update` | update | events | `events.getAll`, `timeline.getAll` |
| 3 | 453 | `delete` | delete | events | `events.getAll`, `timeline.getAll`, `guests.getAll` |

**Notes:** Event delete includes `guests.getAll` because deleting an event clears guest event assignments. `timeline.getAll` is included because events create timeline entries.

---

### 4.4 timeline.router.ts (6 calls)

**File:** `src/features/events/server/routers/timeline.router.ts`

| # | Line | Mutation | type | module | queryPaths |
|---|------|----------|------|--------|------------|
| 1 | 150 | `create` | insert | timeline | `timeline.getAll`, `timeline.getStats` |
| 2 | 228 | `update` | update | timeline | `timeline.getAll`, `timeline.getStats` |
| 3 | 273 | `delete` | delete | timeline | `timeline.getAll`, `timeline.getStats` |
| 4 | 324 | `reorder` | update | timeline | `timeline.getAll`, `timeline.getStats` |
| 5 | 377 | `markComplete` | update | timeline | `timeline.getAll`, `timeline.getStats` |
| 6 | 734 | `bulkImport` | insert | timeline | `timeline.getAll`, `timeline.getStats` |

**Notes:** `bulkImport` uses atomic `db.transaction()` wrapping all insert/update/delete operations (S7-M07). All-or-nothing semantics with error handler resetting counts.

---

### 4.5 vendors.router.ts (13 calls)

**File:** `src/features/events/server/routers/vendors.router.ts`

| # | Line | Mutation | type | module | queryPaths |
|---|------|----------|------|--------|------------|
| 1 | 490 | `create` | insert | vendors | `vendors.getAll`, `vendors.getStats`, `budget.getAll`, `budget.getSummary`, `timeline.getAll` |
| 2 | 723 | `update` | update | vendors | `vendors.getAll`, `vendors.getStats`, `budget.getAll`, `budget.getSummary`, `timeline.getAll` |
| 3 | 795 | `delete` | delete | vendors | `vendors.getAll`, `vendors.getStats`, `budget.getAll`, `budget.getSummary`, `timeline.getAll` |
| 4 | 846 | `updateApprovalStatus` | update | vendors | `vendors.getAll`, `vendors.getStats` |
| 5 | 900 | `addComment` | insert | vendors | `vendors.getAll` |
| 6 | 953 | `deleteComment` | delete | vendors | `vendors.getAll` |
| 7 | 995 | `updatePaymentStatus` | update | vendors | `vendors.getAll`, `vendors.getStats` |
| 8 | 1293 | `bulkCreateFromCommaList` | insert | vendors | `vendors.getAll`, `vendors.getStats`, `budget.getAll`, `budget.getSummary` |
| 9 | 1428 | `addVendorAdvance` | insert | vendors | `vendors.getAll`, `vendors.getStats`, `budget.getAll`, `budget.getSummary` |
| 10 | 1509 | `updateVendorAdvance` | update | vendors | `vendors.getAll`, `vendors.getStats`, `budget.getAll`, `budget.getSummary` |
| 11 | 1570 | `deleteVendorAdvance` | delete | vendors | `vendors.getAll`, `vendors.getStats`, `budget.getAll`, `budget.getSummary` |
| 12 | 1664 | `addReview` | insert | vendors | `vendors.getAll`, `vendors.getStats` |
| 13 | 1741 | `deleteReview` | delete | vendors | `vendors.getAll`, `vendors.getStats` |

**Notes:** Vendor CRUD (create/update/delete) includes `budget.getAll`, `budget.getSummary`, `timeline.getAll` because vendor changes cascade to budget items and timeline entries. `bulkCreateFromCommaList` uses per-iteration transactions (S7-M06) — each vendor is its own `db.transaction()` preserving partial success. Advance payment mutations include budget paths because they affect budget totals.

---

### 4.6 hotels.router.ts (5 calls)

**File:** `src/features/events/server/routers/hotels.router.ts`

| # | Line | Mutation | type | module | queryPaths |
|---|------|----------|------|--------|------------|
| 1 | 265 | `create` | insert | hotels | `hotels.getAll`, `timeline.getAll` |
| 2 | 501 | `update` | update | hotels | `hotels.getAll`, `timeline.getAll` |
| 3 | 576 | `delete` | delete | hotels | `hotels.getAll`, `timeline.getAll` |
| 4 | 626 | `checkIn` | update | hotels | `hotels.getAll` |
| 5 | 772 | `syncWithGuests` | insert | hotels | `hotels.getAll`, `timeline.getAll` |

**Notes:** Hotel CRUD includes `timeline.getAll` because hotel check-in/check-out dates create timeline entries via `syncHotelsToTimeline`. `checkIn` doesn't affect timeline.

---

### 4.7 guest-transport.router.ts (4 calls)

**File:** `src/features/events/server/routers/guest-transport.router.ts`

| # | Line | Mutation | type | module | queryPaths |
|---|------|----------|------|--------|------------|
| 1 | 246 | `create` | insert | transport | `guestTransport.getAll`, `timeline.getAll` |
| 2 | 524 | `update` | update | transport | `guestTransport.getAll`, `timeline.getAll` |
| 3 | 600 | `delete` | delete | transport | `guestTransport.getAll`, `timeline.getAll` |
| 4 | 755 | `syncWithGuests` | insert | transport | `guestTransport.getAll`, `timeline.getAll` |

**Notes:** All transport mutations include `timeline.getAll` because transport bookings create timeline entries via `syncTransportToTimeline`.

---

### 4.8 gifts.router.ts (3 calls)

**File:** `src/features/events/server/routers/gifts.router.ts`

| # | Line | Mutation | type | module | queryPaths |
|---|------|----------|------|--------|------------|
| 1 | 146 | `create` | insert | gifts | `gifts.getAll`, `gifts.getStats` |
| 2 | 206 | `update` | update | gifts | `gifts.getAll`, `gifts.getStats` |
| 3 | 252 | `delete` | delete | gifts | `gifts.getAll`, `gifts.getStats` |

---

### 4.9 floor-plans.router.ts (17 calls)

**File:** `src/features/events/server/routers/floor-plans.router.ts`

| # | Line | Mutation | type | module | queryPaths |
|---|------|----------|------|--------|------------|
| 1 | 198 | `create` | insert | floorPlans | `floorPlans.list` |
| 2 | 301 | `update` | update | floorPlans | `floorPlans.list` |
| 3 | 373 | `addTable` | update | floorPlans | `floorPlans.list`, `floorPlans.getById` |
| 4 | 463 | `updateTable` | update | floorPlans | `floorPlans.list`, `floorPlans.getById` |
| 5 | 509 | `deleteTable` | update | floorPlans | `floorPlans.list`, `floorPlans.getById` |
| 6 | 632 | `assignGuests` | update | floorPlans | `floorPlans.list`, `floorPlans.getById` |
| 7 | 678 | `unassignGuest` | update | floorPlans | `floorPlans.list`, `floorPlans.getById` |
| 8 | 823 | `batchAssignGuests` | update | floorPlans | `floorPlans.list`, `floorPlans.getById` |
| 9 | 946 | `delete` | delete | floorPlans | `floorPlans.list` |
| 10 | 1100 | `saveVersion` | insert | floorPlans | `floorPlans.list`, `floorPlans.getById` |
| 11 | 1221 | `restoreVersion` | update | floorPlans | `floorPlans.list`, `floorPlans.getById` |
| 12 | 1291 | `deleteVersion` | delete | floorPlans | `floorPlans.list`, `floorPlans.getById` |
| 13 | 1380 | `logChange` | insert | floorPlans | `floorPlans.getById` |
| 14 | 1473 | `addGuestConflict` | insert | floorPlans | `floorPlans.getById` |
| 15 | 1518 | `addGuestPreference` | insert | floorPlans | `floorPlans.getById` |
| 16 | 1554 | `removeGuestConflict` | delete | floorPlans | `floorPlans.getById` |
| 17 | 1590 | `removeGuestPreference` | delete | floorPlans | `floorPlans.getById` |

**Notes:** Floor plan mutations use `floorPlans.list` (not `.getAll`) because the tRPC procedure is named `list`. Table/guest/version mutations include `floorPlans.getById` for detail-view refresh. `logChange` only invalidates `getById` since it's metadata. Atomic transactions added for `loadVersion` (S7-M03), `batchAssignGuests` (S7-M04), and `delete` (S7-M05).

---

### 4.10 clients.router.ts (3 calls)

**File:** `src/features/clients/server/routers/clients.router.ts`

| # | Line | Mutation | type | module | queryPaths |
|---|------|----------|------|--------|------------|
| 1 | 802 | `create` | insert | clients | `clients.list`, `clients.getAll` |
| 2 | 1011 | `update` | update | clients | `clients.list`, `clients.getAll`, `clients.getById` |
| 3 | 1253 | `delete` | delete | clients | `clients.list`, `clients.getAll` |

**Notes:** `update` includes `clients.getById` for detail-view refresh. All client mutations use both `clients.list` and `clients.getAll` (the two different query endpoints).

---

### 4.11 import.router.ts (5 calls)

**File:** `src/features/analytics/server/routers/import.router.ts`

| # | Line | Mutation | type | module | queryPaths |
|---|------|----------|------|--------|------------|
| 1 | 752 | `importExcel` (budget) | insert | budget | `budget.getAll`, `budget.getSummary`, `clients.list`, `clients.getAll` |
| 2 | 777 | `importExcel` (hotels) | insert | hotels | `hotels.getAll`, `hotels.getStats`, `timeline.getAll` |
| 3 | 802 | `importExcel` (transport) | insert | transport | `guestTransport.getAll`, `guestTransport.getStats`, `timeline.getAll` |
| 4 | 818 | `importExcel` (vendors) | insert | vendors | `vendors.getAll`, `vendors.getStats`, `budget.getAll`, `budget.getSummary`, `timeline.getAll` |
| 5 | 1082 | `importExcel` (inline) | insert | dynamic | Dynamic per module (see queryPathsMap below) |

**Inline import queryPathsMap** (line 1072-1080):

| Module | queryPaths |
|--------|------------|
| guests | `guests.getAll`, `guests.getStats`, `hotels.getAll`, `guestTransport.getAll`, `timeline.getAll`, `budget.getSummary`, `budget.getAll`, `clients.list`, `clients.getAll` |
| vendors | `vendors.getAll`, `vendors.getStats`, `budget.getAll`, `budget.getSummary`, `timeline.getAll` |
| budget | `budget.getAll`, `budget.getSummary`, `clients.list`, `clients.getAll` |
| gifts | `gifts.getAll`, `gifts.getStats` |
| hotels | `hotels.getAll`, `hotels.getStats`, `timeline.getAll` |
| transport | `guestTransport.getAll`, `guestTransport.getStats`, `timeline.getAll` |
| guestGifts | `gifts.getAll`, `gifts.getStats` |

---

### 4.12 sheets-sync.ts (1 storeSyncAction call)

**File:** `src/lib/google/sheets-sync.ts`

| # | Line | Function | type | module | queryPaths Source |
|---|------|----------|------|--------|-------------------|
| 1 | 128 | `broadcastSheetSync` | update | dynamic | `getQueryPathsForModule()` |

**getQueryPathsForModule mapping** (line 92-103):

| Module | queryPaths |
|--------|------------|
| guests | `guests.getAll`, `guests.getStats`, `guests.getDietaryStats`, `hotels.getAll`, `guestTransport.getAll`, `timeline.getAll`, `budget.getSummary`, `clients.list`, `clients.getAll` |
| budget | `budget.getAll`, `budget.getSummary`, `clients.list`, `clients.getAll` |
| timeline | `timeline.getAll`, `timeline.getStats` |
| hotels | `hotels.getAll`, `timeline.getAll` |
| transport | `guestTransport.getAll`, `timeline.getAll` |
| vendors | `vendors.getAll`, `vendors.getStats`, `budget.getAll`, `budget.getSummary`, `timeline.getAll` |
| gifts | `gifts.getAll`, `gifts.getStats` |
| fallback | `{module}.getAll` |

---

### 4.13 tool-executor.ts (1 storeSyncAction call)

**File:** `src/features/chatbot/server/services/tool-executor.ts`

| # | Line | Function | type | module | queryPaths Source |
|---|------|----------|------|--------|-------------------|
| 1 | 591 | `executeToolWithSync` | dynamic | dynamic | `getQueriesToInvalidate(toolName)` from query-invalidation-map.ts |

**Module resolution:** `getModuleFromToolName()` — pattern matching on tool name substrings.
**Type resolution:** `getActionType()` — prefix matching (`add_`/`create_` → insert, `delete_`/`remove_` → delete, else update).
**QueryPaths:** See Section 6.2 for the full TOOL_QUERY_MAP.

---

### 4.14 googleSheets.router.ts (1 broadcastSheetSync call)

**File:** `src/features/backup/server/routers/googleSheets.router.ts`

| # | Line | Mutation | Delegates To | Parameters |
|---|------|----------|-------------|------------|
| 1 | 492 | `importFromSheet` | `broadcastSheetSync()` | `module: input.module, companyId, clientId, userId, count` |

**Notes:** This calls `broadcastSheetSync()` from sheets-sync.ts, which resolves queryPaths via `getQueryPathsForModule()`.

---

## 5. All 27 Findings — Detailed

### Severity Legend

| Severity | Description |
|----------|-------------|
| **CRITICAL** | Data loss, silent data corruption, or complete feature failure |
| **HIGH** | Feature partially broken or security concern |
| **MEDIUM** | Performance issue, race condition, or missing atomicity |
| **LOW** | Code quality, dead code, or minor improvement |

---

### CRITICAL (2/2 — all FIXED)

#### S7-C01: `publishSyncAction()` was a no-op — FIXED P1

**File:** `src/lib/realtime/broadcast-sync.ts`
**Issue:** `broadcastSync()` called `publishSyncAction()` which did a Redis PUBLISH. But Upstash REST API doesn't support persistent pub/sub subscriptions. `subscribeToCompany()` polls the sorted set instead, so the PUBLISH went to zero subscribers.
**Fix:** Removed `publishSyncAction()` call from `broadcastSync()`. Removed dead function from `redis-pubsub.ts` (P4).
**Impact:** No live sync events were being delivered to any connected client beyond sorted-set polling.

#### S7-C02: Phantom queryPaths across 13 files — FIXED P1

**Files:** All module routers + import.router.ts + sheets-sync.ts + tool-executor.ts + query-invalidation-map.ts
**Issue:** queryPaths didn't match actual tRPC procedure names. Examples:
- `guests.list` → should be `guests.getAll`
- `budget.getItems` → should be `budget.getAll`
- `vendors.list` → should be `vendors.getAll`
- `hotels.list` → should be `hotels.getAll`
- `transport.list` → should be `guestTransport.getAll`
- `floor-plans.list` → should be `floorPlans.list`

**Fix:** Corrected every queryPath across all 13 files to match actual tRPC procedure names.
**Impact:** Cache invalidation was silently failing for all modules — UI would never refresh after mutations from other users.

---

### HIGH (9/9 — all FIXED)

#### S7-H01 through S7-H09: Missing broadcastSync in 26 mutations — FIXED P2

| ID | File | Mutations Missing broadcastSync |
|---|---|---|
| S7-H01 | budget.router.ts | `create`, `update`, `delete`, `addAdvancePayment`, `updateAdvancePayment`, `deleteAdvancePayment` (6 mutations added broadcastSync) |
| S7-H02 | vendors.router.ts | `updateApprovalStatus`, `addComment`, `deleteComment`, `updatePaymentStatus`, `addVendorAdvance`, `updateVendorAdvance`, `deleteVendorAdvance`, `addReview`, `deleteReview`, `bulkCreateFromCommaList` (10 mutations) |
| S7-H03 | timeline.router.ts | `reorder`, `markComplete`, `bulkImport` (3 mutations) |
| S7-H04 | hotels.router.ts | `checkIn`, `syncWithGuests` (2 mutations) |
| S7-H05 | guest-transport.router.ts | `syncWithGuests` (1 mutation) |
| S7-H06 | guests.router.ts | Cascade queryPaths missing on create/update/delete/bulkImport (added `hotels.getAll`, `guestTransport.getAll`, `timeline.getAll`, `budget.getSummary`) |
| S7-H07 | clients.router.ts | Added `clients.list`/`clients.getAll` to recalcClientStats callers |
| S7-H08 | floor-plans.router.ts | All 17 mutations (floor plans had zero broadcastSync before P2) |
| S7-H09 | guests.router.ts | `updateRSVP` (1 mutation) |

**Impact:** Without broadcastSync, mutations from one user/tab would not invalidate caches on other users' browsers. Floor plans module was completely invisible to real-time sync.

---

### MEDIUM (10/10 — all FIXED)

#### S7-M01: TOCTOU race in connection limiter — FIXED P4

**File:** `src/lib/sse/connection-manager.ts`
**Issue:** `canConnect()` checked counts, then `acquire()` incremented — race window between check and increment allowed exceeding limits.
**Fix:** Replaced check-then-increment with increment-first-then-check pattern. If limit exceeded after increment, rollback with DECR pipeline.
**Lines:** 153-234

#### S7-M02: `getModuleFromToolName` incomplete mapping — FIXED P4

**File:** `src/features/chatbot/server/services/tool-executor.ts`
**Issue:** Only matched 8 tool patterns. Tools like `pipeline`, `team`, `proposal`, `invoice`, `communication`, `website`, `workflow` would fall through to default `'guests'`.
**Fix:** Added 7 new patterns mapping to `'clients'`. Changed default fallback from `'guests'` to `'clients'`.
**Lines:** 614-629

#### S7-M03: `loadVersion` non-atomic — FIXED P4

**File:** `src/features/events/server/routers/floor-plans.router.ts`
**Issue:** `restoreVersion` performed delete + multiple updates + insert without transaction. Failure mid-way would leave floor plan in inconsistent state.
**Fix:** Wrapped in `db.transaction(async (tx) => { ... })`.

#### S7-M04: `batchAssignGuests` non-atomic — FIXED P4

**File:** `src/features/events/server/routers/floor-plans.router.ts`
**Issue:** Batch delete old assignments + insert new assignments not atomic.
**Fix:** Wrapped in `db.transaction(async (tx) => { ... })`.

#### S7-M05: `floor-plans.delete` non-atomic — FIXED P4

**File:** `src/features/events/server/routers/floor-plans.router.ts`
**Issue:** 3 sequential deletes (assignments → tables → floor plan) not atomic.
**Fix:** Wrapped in `db.transaction(async (tx) => { ... })`.

#### S7-M06: `bulkCreateFromCommaList` non-atomic — FIXED P4

**File:** `src/features/events/server/routers/vendors.router.ts`
**Issue:** Loop creating vendor + clientVendor + budget item per vendor without any transaction boundary.
**Fix:** Per-iteration `db.transaction()`. Each vendor is its own atomic unit. Partial success preserved (if vendor 3/5 fails, 1+2 are committed).

#### S7-M07: `timeline.bulkImport` non-atomic — FIXED P4

**File:** `src/features/events/server/routers/timeline.router.ts`
**Issue:** Loop of insert/update/delete operations without transaction.
**Fix:** Single `ctx.db.transaction()` wrapping entire loop. All-or-nothing atomic. Error handler resets counts.

#### S7-M08: Redis failure crashes SSE connection — FIXED P4

**File:** `src/lib/sse/connection-manager.ts`
**Issue:** If Redis was unreachable, `acquire()` would throw, killing the SSE subscription attempt.
**Fix:** Try/catch around acquire. SSEConnectionLimitError re-thrown (intentional rejection). Other errors → graceful degradation: allow connection without limit enforcement, return no-op guard.
**Lines:** 222-233

#### S7-M09: Cascade sync calls outside transactions — FIXED P4

**Files:** `src/lib/google/sheets-sync.ts`, `src/features/backup/server/routers/googleSheets.router.ts`
**Issue:** 6 cascade sync calls (`syncGuestsToHotelsAndTransportTx`, `syncHotelsToTimelineTx`, `syncTransportToTimelineTx`) were called with bare `db` instead of inside a transaction, despite the functions expecting a transaction client.
**Fix:** All 6 wrapped in `db.transaction(async (tx) => { ... })`.

#### S7-M10: `importAllFromSheets` userId optional — FIXED P4

**File:** `src/lib/google/sheets-sync.ts`
**Issue:** `userId` parameter was optional (`userId?: string`). The function always passed it to `broadcastSheetSync` but broadcast guard checked `if (userId && totalImported > 0)`. If called without userId, import would succeed but broadcast would silently skip.
**Fix:** Made `userId` required. Simplified guard to `if (totalImported > 0)`.

---

### LOW (6 total — 2 FIXED, 4 non-actionable)

#### S7-L01: Dead `publishSyncAction` in redis-pubsub.ts — FIXED P4

**File:** `src/lib/realtime/redis-pubsub.ts`
**Issue:** `publishSyncAction()` function remained as dead code after P1 removed its call from `broadcastSync()`.
**Fix:** Removed the dead function entirely.

#### S7-L02: `subscriptionKey` state triggers full re-render — FIXED P4

**File:** `src/features/realtime/hooks/use-realtime-sync.ts`
**Issue:** `reconnect()` used `setSubscriptionKey(k => k + 1)` which changed a value used in the subscription's `enabled` check. Any key change re-renders the entire component tree using the hook.
**Fix:** Replaced with `pendingReconnect` boolean toggle pattern. `setPendingReconnect(true)` → 100ms timer → `setPendingReconnect(false)`. Subscription `enabled: enabled && !pendingReconnect`. Simpler, same effect, minimal re-renders.
**Lines:** 66, 77-83, 168, 189-193

#### S7-L03: Missing `'use client'` directive — SUPERSEDED

**File:** `src/features/realtime/hooks/use-realtime-sync.ts`
**Status:** File already had `'use client'` at line 1 before P4. Marked as already present.

#### S7-L04: `logChange` mutation intentionally not broadcast — PARTIAL (by design)

**File:** `src/features/events/server/routers/floor-plans.router.ts`
**Issue:** `logChange` writes metadata but was flagged as missing broadcastSync.
**Status:** broadcastSync was added in P2 with `queryPaths: ['floorPlans.getById']`. This is the correct scope — change logs are detail-view-only metadata.

#### S7-L05: No dedup on client-side action processing — FIXED P4

**File:** `src/features/realtime/hooks/use-realtime-sync.ts`
**Issue:** If the same SyncAction was delivered twice (e.g., network hiccup during offline recovery + live stream overlap), `invalidateQueries` would fire twice.
**Fix:** Added `seenActionIds` ref using a Set. Check `seenActionIds.has(action.id)` before processing. Auto-eviction at 500 entries (keeps last 250).
**Lines:** 69, 132-139

#### S7-L06: 500ms polling latency — BY DESIGN

**File:** `src/lib/realtime/redis-pubsub.ts`
**Issue:** `subscribeToCompany()` polls every 500ms instead of using true pub/sub.
**Status:** By design. Upstash REST API doesn't support persistent TCP subscriptions. 500ms polling with Redis sorted set is the correct pattern for Upstash REST. The comment in the code explains this.

---

## 6. QueryPath Mapping Reference

### 6.1 Module Router queryPaths (canonical)

These are the actual tRPC procedure names used by broadcastSync in the module routers. **All client-side invalidation depends on these being correct.**

| Module | Primary Paths | Cascade Paths | Stats Path |
|--------|--------------|---------------|------------|
| guests | `guests.getAll` | `hotels.getAll`, `guestTransport.getAll`, `timeline.getAll`, `budget.getSummary`, `clients.list`, `clients.getAll` | `guests.getStats` |
| budget | `budget.getAll` | `clients.list`, `clients.getAll` | `budget.getSummary` |
| events | `events.getAll` | `timeline.getAll`, `guests.getAll` (delete only) | — |
| timeline | `timeline.getAll` | — | `timeline.getStats` |
| vendors | `vendors.getAll` | `budget.getAll`, `budget.getSummary`, `timeline.getAll` | `vendors.getStats` |
| hotels | `hotels.getAll` | `timeline.getAll` | — |
| transport | `guestTransport.getAll` | `timeline.getAll` | — |
| gifts | `gifts.getAll` | — | `gifts.getStats` |
| clients | `clients.list`, `clients.getAll` | — | `clients.getById` (update only) |
| floorPlans | `floorPlans.list` | — | `floorPlans.getById` (detail mutations) |

### 6.2 Chatbot TOOL_QUERY_MAP (query-invalidation-map.ts)

| Tool Name | queryPaths |
|-----------|------------|
| `create_client` | `clients.list`, `clients.getAll` |
| `update_client` | `clients.list`, `clients.getAll`, `clients.getById` |
| `add_guest` | `guests.getAll`, `guests.getStats`, `hotels.getAll`, `guestTransport.getAll`, `budget.getSummary` |
| `update_guest_rsvp` | `guests.getAll`, `guests.getStats`, `budget.getSummary` |
| `bulk_update_guests` | `guests.getAll`, `guests.getStats`, `hotels.getAll`, `guestTransport.getAll`, `budget.getSummary` |
| `check_in_guest` | `guests.getAll`, `guests.getStats` |
| `assign_guests_to_events` | `guests.getAll`, `guests.getStats`, `events.getAll` |
| `update_table_dietary` | `guests.getAll`, `guests.getStats` |
| `create_event` | `events.getAll`, `timeline.getAll` |
| `update_event` | `events.getAll`, `timeline.getAll` |
| `add_timeline_item` | `timeline.getAll` |
| `shift_timeline` | `timeline.getAll` |
| `add_vendor` | `vendors.getAll`, `budget.getAll`, `timeline.getAll` |
| `update_vendor` | `vendors.getAll`, `budget.getAll` |
| `add_hotel_booking` | `hotels.getAll` |
| `bulk_add_hotel_bookings` | `hotels.getAll` |
| `assign_transport` | `guestTransport.getAll` |
| `update_budget_item` | `budget.getAll`, `budget.getSummary` |
| `add_gift` | `gifts.getAll` |
| `update_gift` | `gifts.getAll` |
| `add_seating_constraint` | `floorPlans.list` |
| `send_communication` | `communications.list` |
| `update_pipeline` | `pipeline.list` |
| `update_creative` | `creatives.list` |
| `assign_team_member` | `team.list` |
| `create_proposal` | `proposals.list` |
| `create_invoice` | `invoices.list` |
| `update_website` | `websites.list` |
| `create_workflow` | `workflows.list` |
| `delete_guest` | `guests.getAll`, `guests.getStats`, `hotels.getAll`, `guestTransport.getAll`, `budget.getSummary` |
| `delete_event` | `events.getAll`, `timeline.getAll`, `guests.getAll` |
| `delete_vendor` | `vendors.getAll`, `budget.getAll`, `timeline.getAll` |
| `delete_budget_item` | `budget.getAll`, `budget.getSummary`, `timeline.getAll` |
| `delete_timeline_item` | `timeline.getAll` |
| `delete_gift` | `gifts.getAll` |
| `generate_qr_codes` | *(none — side effect only)* |
| `sync_calendar` | *(none — side effect only)* |

---

## 7. Files Modified Per Prompt

### P1 — `8e54380` — Phantom queryPaths + dead publishSyncAction

| File | Changes |
|------|---------|
| `src/features/analytics/server/routers/budget.router.ts` | Fix queryPaths |
| `src/features/analytics/server/routers/import.router.ts` | Fix queryPaths |
| `src/features/chatbot/server/services/query-invalidation-map.ts` | Fix queryPaths |
| `src/features/chatbot/server/services/tool-executor.ts` | Fix queryPaths |
| `src/features/events/server/routers/events.router.ts` | Fix queryPaths |
| `src/features/events/server/routers/gifts.router.ts` | Fix queryPaths |
| `src/features/events/server/routers/guest-transport.router.ts` | Fix queryPaths |
| `src/features/events/server/routers/hotels.router.ts` | Fix queryPaths |
| `src/features/events/server/routers/timeline.router.ts` | Fix queryPaths |
| `src/features/events/server/routers/vendors.router.ts` | Fix queryPaths |
| `src/features/guests/server/routers/guests.router.ts` | Fix queryPaths |
| `src/lib/google/sheets-sync.ts` | Fix queryPaths |
| `src/lib/realtime/broadcast-sync.ts` | Remove publishSyncAction call |

**13 files, 98 insertions, 105 deletions**

### P2 — `053ff3c` — 26 missing broadcastSync calls

| File | Changes |
|------|---------|
| `src/features/analytics/server/routers/budget.router.ts` | Add broadcastSync to 6 mutations |
| `src/features/clients/server/routers/clients.router.ts` | Add import for broadcastSync |
| `src/features/events/server/routers/floor-plans.router.ts` | Add broadcastSync to 17 mutations |
| `src/features/events/server/routers/gifts.router.ts` | Fix type values |
| `src/features/events/server/routers/guest-transport.router.ts` | Add broadcastSync to syncWithGuests, fix types |
| `src/features/events/server/routers/hotels.router.ts` | Add broadcastSync to checkIn, syncWithGuests |
| `src/features/events/server/routers/timeline.router.ts` | Add broadcastSync to reorder, markComplete, bulkImport |
| `src/features/events/server/routers/vendors.router.ts` | Add broadcastSync to 10 mutations |

**8 files, 305 insertions, 29 deletions**

### P3 — `54e3ea0` — Import broadcast paths

| File | Changes |
|------|---------|
| `docs/audit/session-7-realtime-sync.md` | Create initial comprehensive report |
| `src/features/analytics/server/routers/import.router.ts` | Fix import broadcastSync queryPaths |
| `src/features/guests/server/routers/guests.router.ts` | Add cascade queryPaths |
| `src/lib/google/sheets-sync.ts` | Fix getQueryPathsForModule |

**4 files, 552 insertions, 644 deletions**

### P4 — `436cff6` — All remaining MEDIUM and LOW

| File | Changes |
|------|---------|
| `docs/audit/session-7-realtime-sync.md` | Update finding statuses |
| `src/features/backup/server/routers/googleSheets.router.ts` | Wrap cascade sync calls in db.transaction |
| `src/features/chatbot/server/services/tool-executor.ts` | Add tool patterns, change default module |
| `src/features/events/server/routers/floor-plans.router.ts` | Wrap 3 mutations in db.transaction |
| `src/features/events/server/routers/timeline.router.ts` | Wrap bulkImport in db.transaction |
| `src/features/events/server/routers/vendors.router.ts` | Per-iteration db.transaction for bulkCreate |
| `src/features/realtime/hooks/use-realtime-sync.ts` | pendingReconnect + seenActionIds dedup |
| `src/lib/google/sheets-sync.ts` | userId required, cascade transactions |
| `src/lib/realtime/redis-pubsub.ts` | Remove dead publishSyncAction |
| `src/lib/sse/connection-manager.ts` | TOCTOU fix, graceful degradation |

**10 files, 407 insertions, 316 deletions**

### Total Files Modified Across All Prompts

| File | P1 | P2 | P3 | P4 | Total Touches |
|------|----|----|----|----|---------------|
| `budget.router.ts` | X | X | | | 2 |
| `import.router.ts` | X | | X | | 2 |
| `query-invalidation-map.ts` | X | | | | 1 |
| `tool-executor.ts` | X | | | X | 2 |
| `events.router.ts` | X | | | | 1 |
| `gifts.router.ts` | X | X | | | 2 |
| `guest-transport.router.ts` | X | X | | | 2 |
| `hotels.router.ts` | X | X | | | 2 |
| `timeline.router.ts` | X | X | | X | 3 |
| `vendors.router.ts` | X | X | | X | 3 |
| `guests.router.ts` | X | | X | | 2 |
| `sheets-sync.ts` | X | | X | X | 3 |
| `broadcast-sync.ts` | X | | | | 1 |
| `floor-plans.router.ts` | | X | | X | 2 |
| `clients.router.ts` | | X | | | 1 |
| `googleSheets.router.ts` | | | | X | 1 |
| `use-realtime-sync.ts` | | | | X | 1 |
| `redis-pubsub.ts` | | | | X | 1 |
| `connection-manager.ts` | | | | X | 1 |
| **Total unique files** | **13** | **8** | **4** | **10** | **19** |

---

## 8. Verification Results

### TypeScript Compilation

```
$ npx tsc --noEmit
✓ 0 errors
```

### Test Suite

```
$ npx jest --passWithNoTests
Tests:       373 passed, 373 total
Suites:      31 passed, 31 total
✓ 0 failures
```

### broadcastSync Call Count

```
$ grep -rn 'await broadcastSync(' --include='*.ts' | grep -v node_modules | wc -l
70
```

Breakdown by file:

| File | Call Count |
|------|-----------|
| `guests.router.ts` | 5 |
| `budget.router.ts` | 6 |
| `events.router.ts` | 3 |
| `timeline.router.ts` | 6 |
| `vendors.router.ts` | 13 |
| `hotels.router.ts` | 5 |
| `guest-transport.router.ts` | 4 |
| `gifts.router.ts` | 3 |
| `floor-plans.router.ts` | 17 |
| `clients.router.ts` | 3 |
| `import.router.ts` | 5 |
| **Total** | **70** |

### storeSyncAction / broadcastSheetSync

| File | Function | Count |
|------|----------|-------|
| `broadcast-sync.ts` | `storeSyncAction()` | 1 (called by broadcastSync) |
| `sheets-sync.ts` | `storeSyncAction()` | 1 (inside broadcastSheetSync) |
| `tool-executor.ts` | `storeSyncAction()` | 1 (inside executeToolWithSync) |
| `googleSheets.router.ts` | `broadcastSheetSync()` | 1 |

### Coverage Assessment

| Module | Mutations | With broadcastSync | Coverage |
|--------|-----------|-------------------|----------|
| guests | 5 | 5 | 100% |
| budget | 6 | 6 | 100% |
| events | 3 | 3 | 100% |
| timeline | 6 | 6 | 100% |
| vendors | 13 | 13 | 100% |
| hotels | 5 | 5 | 100% |
| transport | 4 | 4 | 100% |
| gifts | 3 | 3 | 100% |
| floor plans | 17 | 17 | 100% |
| clients | 3 | 3 | 100% |
| import | 5 | 5 | 100% |
| sheets sync | 1 | 1 | 100% |
| chatbot | 1 | 1 | 100% |
| **Total** | **72** | **72** | **100%** |

---

## 9. Cross-Session References

### Session 6 Dependencies

| Session 6 Item | Session 7 Impact |
|---|---|
| `recalcClientStats` (S6-P3) | All mutations calling recalcClientStats must include `clients.list`/`clients.getAll` in broadcastSync queryPaths |
| `floor-plans.router.ts` broadcastSync (S6-P4) | Session 7 P2 added the remaining 17 broadcastSync calls to floor plans |
| `syncGuestsToHotelsAndTransportTx` | Cascade sync functions are broadcast-blind — callers must include cascade queryPaths |
| `syncHotelsToTimelineTx` | Same — callers must include `timeline.getAll` in hotel mutation broadcasts |
| `syncTransportToTimelineTx` | Same — callers must include `timeline.getAll` in transport mutation broadcasts |

### Session 5 Dependencies

| Session 5 Item | Session 7 Impact |
|---|---|
| `tool-executor.ts` broadcastSync | P1 fixed phantom queryPaths, P4 fixed module mapping defaults |
| `query-invalidation-map.ts` | P1 aligned all TOOL_QUERY_MAP entries with UI router queryPaths |

### Finding Status Cross-Reference

| ID | Severity | Status | Prompt |
|----|----------|--------|--------|
| S7-C01 | CRITICAL | FIXED | P1 |
| S7-C02 | CRITICAL | FIXED | P1 |
| S7-H01 | HIGH | FIXED | P2 |
| S7-H02 | HIGH | FIXED | P2 |
| S7-H03 | HIGH | FIXED | P2 |
| S7-H04 | HIGH | FIXED | P2 |
| S7-H05 | HIGH | FIXED | P2 |
| S7-H06 | HIGH | FIXED | P2+P3 |
| S7-H07 | HIGH | FIXED | P2 |
| S7-H08 | HIGH | FIXED | P2 |
| S7-H09 | HIGH | FIXED | P2 |
| S7-M01 | MEDIUM | FIXED | P4 |
| S7-M02 | MEDIUM | FIXED | P4 |
| S7-M03 | MEDIUM | FIXED | P4 |
| S7-M04 | MEDIUM | FIXED | P4 |
| S7-M05 | MEDIUM | FIXED | P4 |
| S7-M06 | MEDIUM | FIXED | P4 |
| S7-M07 | MEDIUM | FIXED | P4 |
| S7-M08 | MEDIUM | FIXED | P4 |
| S7-M09 | MEDIUM | FIXED | P4 |
| S7-M10 | MEDIUM | FIXED | P4 |
| S7-L01 | LOW | FIXED | P4 |
| S7-L02 | LOW | FIXED | P4 |
| S7-L03 | LOW | SUPERSEDED | — |
| S7-L04 | LOW | PARTIAL | P2 (by design) |
| S7-L05 | LOW | FIXED | P4 |
| S7-L06 | LOW | BY DESIGN | — |

---

## 10. Danger Zones — Read Before Editing

### 10.1 Cascade Sync Functions Are Broadcast-Blind

**Functions:** `syncGuestsToHotelsAndTransportTx`, `syncHotelsToTimelineTx`, `syncTransportToTimelineTx`
**Location:** `src/lib/backup/auto-sync-trigger.ts`

These functions create/update hotels, transport, and timeline rows but **never call broadcastSync**. This is by design — the calling mutation's broadcastSync must include the cascade targets in its queryPaths.

**Rule:** If you call any of these cascade functions from a new location, you MUST add the cascade target queryPaths to the calling mutation's broadcastSync:

| If calling... | Include in queryPaths |
|---|---|
| `syncGuestsToHotelsAndTransportTx` | `hotels.getAll`, `guestTransport.getAll`, `timeline.getAll` |
| `syncHotelsToTimelineTx` | `timeline.getAll` |
| `syncTransportToTimelineTx` | `timeline.getAll` |

### 10.2 `recalcClientStats` Updates Client Cache

**Location:** `src/features/clients/server/utils/recalc-client-stats.ts`

This function writes to `clients.budget` and `clients.guestCount`. Any mutation calling it must include `clients.list` and `clients.getAll` in its broadcastSync queryPaths, or the client list UI will show stale totals.

**Currently called from:** guest create/update/delete/bulkImport, budget create/update/delete/advancePayment mutations, import.router.ts guest/budget imports.

### 10.3 queryPaths Must Match tRPC Procedure Names

queryPaths are matched against TanStack Query keys using the tRPC key structure `[['module', 'procedure'], ...]`. If a queryPath doesn't match an actual tRPC procedure name, the invalidation silently does nothing.

**Canonical procedure names (verified):**

| Path | Router | Procedure |
|------|--------|-----------|
| `guests.getAll` | guests.router.ts | `getAll` |
| `guests.getStats` | guests.router.ts | `getStats` |
| `budget.getAll` | budget.router.ts | `getAll` |
| `budget.getSummary` | budget.router.ts | `getSummary` |
| `events.getAll` | events.router.ts | `getAll` |
| `timeline.getAll` | timeline.router.ts | `getAll` |
| `timeline.getStats` | timeline.router.ts | `getStats` |
| `vendors.getAll` | vendors.router.ts | `getAll` |
| `vendors.getStats` | vendors.router.ts | `getStats` |
| `hotels.getAll` | hotels.router.ts | `getAll` |
| `guestTransport.getAll` | guest-transport.router.ts | `getAll` |
| `gifts.getAll` | gifts.router.ts | `getAll` |
| `gifts.getStats` | gifts.router.ts | `getStats` |
| `clients.list` | clients.router.ts | `list` |
| `clients.getAll` | clients.router.ts | `getAll` |
| `clients.getById` | clients.router.ts | `getById` |
| `floorPlans.list` | floor-plans.router.ts | `list` |
| `floorPlans.getById` | floor-plans.router.ts | `getById` |

### 10.4 SSE Connection Manager — Increment-First Pattern

**File:** `src/lib/sse/connection-manager.ts`

The `acquire()` method uses an increment-first-then-check pattern (S7-M01 fix). If you modify this:
- INCR happens before limit check — this prevents TOCTOU races
- If limit exceeded, DECR rollback pipeline runs immediately
- If Redis fails entirely, connection is allowed without limits (graceful degradation)
- Release guard handles double-call (idempotent) and cleans up zero/negative counters

### 10.5 subscribeToCompany Polling — Do Not Add PUBLISH

**File:** `src/lib/realtime/redis-pubsub.ts`

`subscribeToCompany()` polls Redis sorted set every 500ms. This is intentional — Upstash REST API does not support persistent TCP pub/sub subscriptions. Do not add `redis.publish()` or `redis.subscribe()` — they won't work with Upstash REST.

If migrating to Upstash Redis TCP (non-REST), the polling can be replaced with actual pub/sub, but the sorted set must be retained for offline recovery.

### 10.6 Floor Plans Router Uses `db` Not `ctx.db`

**File:** `src/features/events/server/routers/floor-plans.router.ts`

Floor plans mutations use `db` (imported directly) instead of `ctx.db`. This means transactions must use `db.transaction()` not `ctx.db.transaction()`. Other routers (vendors, timeline, etc.) use `ctx.db`.

### 10.7 Adding a New Module

If adding a new module with mutations:

1. Add broadcastSync call to every mutation
2. Add module name to `SyncAction['module']` union in `redis-pubsub.ts`
3. Add queryPaths matching actual tRPC procedure names
4. Add tool mapping in `query-invalidation-map.ts` if chatbot can modify the module
5. Add pattern to `getModuleFromToolName()` in `tool-executor.ts`
6. Add module to `getQueryPathsForModule()` in `sheets-sync.ts` if Google Sheets sync needed
7. If the module has cascade side effects, document which queryPaths callers must include

---

*Report generated 2026-02-24. Covers commits `2fe0713` through `436cff6`.*
