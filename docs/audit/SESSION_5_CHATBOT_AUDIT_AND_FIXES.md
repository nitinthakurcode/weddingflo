# Session 5 — Chatbot Feature Audit & Fixes

> **Date:** 2026-02-24
> **Scope:** AI Command Chatbot — 12 core files, 15,567 lines
> **Fix Rounds:** 7 (all completed)

---

## Table of Contents

1. [Overview & Scope](#1-overview--scope)
2. [Architecture Overview](#2-architecture-overview)
3. [File Inventory](#3-file-inventory)
4. [Tool Catalog (51 Tools)](#4-tool-catalog-51-tools)
5. [Execution Flow](#5-execution-flow)
6. [Entity Resolution](#6-entity-resolution)
7. [Security Model](#7-security-model)
8. [Cache Invalidation & Realtime Sync](#8-cache-invalidation--realtime-sync)
9. [Session 5 Audit Findings](#9-session-5-audit-findings)
10. [Session 5 Fixes Applied](#10-session-5-fixes-applied)
11. [Error Handling](#11-error-handling)
12. [Pending Calls Lifecycle](#12-pending-calls-lifecycle)
13. [Mutation Parity Matrix](#13-mutation-parity-matrix)
14. [Cross-Session References](#14-cross-session-references)
15. [Danger Zones — Read Before Editing](#15-danger-zones--read-before-editing)
16. [Known Remaining Issues](#16-known-remaining-issues)
17. [Quick Reference / Cheat Sheet](#17-quick-reference--cheat-sheet)

---

## 1. Overview & Scope

The chatbot is a natural-language AI assistant that helps wedding planners manage client data via OpenAI function calling. It supports 51 tools spanning 15 modules: clients, guests, events, timeline, vendors, hotels, transport, budget, seating, gifts, creative, team, search/analytics, communication, and business operations.

### What was audited

- **12 core backend files** (15,567 total lines)
- Tool schemas, definitions, and executor functions
- Entity resolution and fuzzy matching
- Transaction safety and deadlock handling
- Security: tenant isolation (companyId), role gates, CSRF
- Cache invalidation and realtime sync broadcast
- System prompt accuracy vs actual tool capabilities
- Enum normalization at data ingestion boundaries

### What was NOT audited

- Frontend React components (chatbot UI panel, message rendering)
- Client-side tRPC hooks and state management
- OpenAI API token costs / rate limiting internals
- End-to-end integration tests

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (React)                       │
│  ChatPanel → useChatbot hook → tRPC / SSE fetch             │
└──────────────┬────────────────────────┬─────────────────────┘
               │ tRPC                   │ SSE (streaming)
               ▼                        ▼
┌──────────────────────┐  ┌──────────────────────────────────┐
│  chatbot.router.ts   │  │  /api/chatbot/stream/route.ts    │
│  (20 procedures)     │  │  (SSE endpoint, 30s timeout)     │
│  - chat (mutation)   │  │  - Auth + rate limit             │
│  - confirmToolCall   │  │  - Context build → system prompt │
│  - cancelToolCall    │  │  - OpenAI streaming              │
│  - CRUD convos/tmpl  │  │  - Model fallback on failure     │
└──────┬───────────────┘  └──────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│                    tool-executor.ts (7,034 lines)             │
│  executeTool() dispatcher → 51 execute* functions            │
│  executeToolWithSync() wrapper → broadcastSync after success │
├──────────────────────────────────────────────────────────────┤
│ Depends on:                                                   │
│  ├─ entity-resolver.ts     (fuzzy name matching)             │
│  ├─ context-builder.ts     (LLM context injection)           │
│  ├─ pending-calls.ts       (mutation confirmation queue)     │
│  ├─ transaction-wrapper.ts (deadlock retry + atomic ops)     │
│  ├─ query-invalidation-map.ts (cache bust after mutations)   │
│  ├─ schemas.ts             (Zod input validation)            │
│  ├─ definitions.ts         (OpenAI function schemas)         │
│  └─ chatbot-system.ts      (system prompt builder)           │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  Drizzle ORM → PostgreSQL (Supabase)                         │
│  schema-chatbot.ts: 4 tables                                 │
│  schema-features.ts: domain tables (clients, guests, etc.)   │
└──────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| SSE endpoint separate from tRPC | tRPC doesn't natively support streaming; SSE gives token-by-token output |
| Pending calls in UNLOGGED table | 2x faster writes; 5-min TTL makes crash data loss acceptable |
| broadcastSync in wrapper, not per-function | Single point of sync; execute* functions stay pure data operations |
| Entity resolution via Levenshtein | Handles typos and partial names ("Priya" → "Priya Sharma") |
| Mutation confirmation flow | All mutations require user preview + confirm before execution |

---

## 3. File Inventory

| # | File | Lines | Role |
|---|------|-------|------|
| 1 | `src/features/chatbot/server/services/tool-executor.ts` | 7,034 | Dispatcher + 51 executor functions |
| 2 | `src/features/chatbot/tools/definitions.ts` | 2,937 | TOOL_METADATA (51) + CHATBOT_TOOLS OpenAI schemas (51) |
| 3 | `src/features/chatbot/server/services/context-builder.ts` | 1,336 | Builds LLM context (client, events, guests, budget stats) |
| 4 | `src/features/chatbot/server/routers/chatbot.router.ts` | 1,149 | 20 tRPC procedures (7 query, 13 mutation) |
| 5 | `src/features/chatbot/server/services/entity-resolver.ts` | 1,073 | Fuzzy name matching for clients, guests, vendors, events |
| 6 | `src/features/chatbot/tools/schemas.ts` | 705 | Zod validation schemas for all 51 tools |
| 7 | `src/lib/ai/prompts/chatbot-system.ts` | 364 | System prompt + helpers (preview, confirmation, error recovery) |
| 8 | `src/app/api/chatbot/stream/route.ts` | 245 | SSE streaming endpoint with auth + rate limit |
| 9 | `src/features/chatbot/server/services/transaction-wrapper.ts` | 219 | `withTransaction` with deadlock retry (3 retries) |
| 10 | `src/features/chatbot/server/services/pending-calls.ts` | 187 | 5-min TTL pending call store (UNLOGGED table) |
| 11 | `src/features/chatbot/server/services/query-invalidation-map.ts` | 166 | TOOL_QUERY_MAP (37 entries) + MODULE_PRIMARY_QUERIES (17 modules) |
| 12 | `src/lib/db/schema-chatbot.ts` | 152 | 4 DB tables: conversations, messages, templates, pending_calls |
| | **Total** | **15,567** | |

---

## 4. Tool Catalog (51 Tools)

### 4.1 By Category

#### Client Management (5 tools)

| Tool | Type | Schema (line) | Executor (line) | Cascade |
|------|------|---------------|-----------------|---------|
| `create_client` | mutation | 16 | 716 | Auto-creates main wedding event + budget categories + vendors from CSV |
| `update_client` | mutation | 32 | 941 | — |
| `get_client_summary` | query | 46 | 1096 | — |
| `get_wedding_summary` | query | 284 | 3415 | — |
| `get_recommendations` | query | 305 | 3608 | — |

#### Guest Management (6 tools)

| Tool | Type | Schema (line) | Executor (line) | Cascade |
|------|------|---------------|-----------------|---------|
| `add_guest` | mutation | 54 | 1494 | Auto hotel booking if needsHotel; enum normalization (RSVP + side) |
| `update_guest_rsvp` | mutation | 82 | 1631 | Per-guest budget recalc via `cascadeGuestSideEffects` |
| `get_guest_stats` | query | 89 | 1177 | — |
| `bulk_update_guests` | mutation | 94 | 1741 | RSVP normalization on bulk |
| `check_in_guest` | mutation | 293 | 3810 | — |
| `delete_guest` | mutation | 609 | 6528 | Cascade: floorPlanGuests, hotels, guestTransport, guestGifts, gifts + budget recalc |

#### Events & Timeline (6 tools)

| Tool | Type | Schema (line) | Executor (line) | Cascade |
|------|------|---------------|-----------------|---------|
| `create_event` | mutation | 110 | 1853 | Auto-creates timeline from template |
| `update_event` | mutation | 123 | 2021 | — |
| `add_timeline_item` | mutation | 139 | 2145 | — |
| `shift_timeline` | mutation | 153 | 2237 | — |
| `delete_event` | mutation | 615 | 6660 | Cascade: timeline entries, guest attendingEvents arrays |
| `delete_timeline_item` | mutation | 631 | 6923 | — |

#### Vendors (3 tools)

| Tool | Type | Schema (line) | Executor (line) | Cascade |
|------|------|---------------|-----------------|---------|
| `add_vendor` | mutation | 165 | 2331 | Auto budget item + timeline entry + auto-event linking |
| `update_vendor` | mutation | 180 | 2506 | — |
| `delete_vendor` | mutation | 621 | 6751 | Cascade: clientVendors, budget items, timeline entries |

#### Hotels & Transport (4 tools)

| Tool | Type | Schema (line) | Executor (line) |
|------|------|---------------|-----------------|
| `add_hotel_booking` | mutation | 198 | 2598 |
| `bulk_add_hotel_bookings` | mutation | 398 | 4835 |
| `sync_hotel_guests` | query | 211 | 1309 |
| `assign_transport` | mutation | 314 | 3924 |

#### Budget (4 tools)

| Tool | Type | Schema (line) | Executor (line) | Cascade |
|------|------|---------------|-----------------|---------|
| `get_budget_overview` | query | 220 | 1234 | — |
| `update_budget_item` | mutation | 225 | 2817 | — |
| `budget_currency_convert` | query | 379 | 4610 | — |
| `delete_budget_item` | mutation | 627 | 6862 | Cascade: timeline entries (budget source) |

#### Seating & Floor Plan (2 tools)

| Tool | Type | Schema (line) | Executor (line) |
|------|------|---------------|-----------------|
| `add_seating_constraint` | mutation | 421 | 5045 |
| `update_table_dietary` | mutation | 413 | 4976 |

#### Gifts (3 tools)

| Tool | Type | Schema (line) | Executor (line) |
|------|------|---------------|-----------------|
| `add_gift` | mutation | 433 | 5156 |
| `update_gift` | mutation | 444 | 5217 |
| `delete_gift` | mutation | 635 | 6967 |

#### Creative & Team (2 tools)

| Tool | Type | Schema (line) | Executor (line) |
|------|------|---------------|-----------------|
| `update_creative` | mutation | 454 | 5285 |
| `assign_team_member` | mutation | 466 | 5368 |

#### Search & Analytics (4 tools)

| Tool | Type | Schema (line) | Executor (line) |
|------|------|---------------|-----------------|
| `search_entities` | query | 241 | 1370 |
| `query_data` | query | 351 | 4288 |
| `query_analytics` | query | 535 | 5856 |
| `query_cross_client_events` | query | 371 | 4534 |

#### Communication (1 tool)

| Tool | Type | Schema (line) | Executor (line) |
|------|------|---------------|-----------------|
| `send_communication` | mutation | 252 | 3018 |

#### Business Operations (4 tools)

| Tool | Type | Schema (line) | Executor (line) |
|------|------|---------------|-----------------|
| `create_proposal` | mutation | 478 | 5468 |
| `create_invoice` | mutation | 491 | 5580 |
| `export_data` | mutation | 506 | 5666 |
| `update_pipeline` | mutation | 270 | 3226 |

#### Website & Calendar (2 tools)

| Tool | Type | Schema (line) | Executor (line) |
|------|------|---------------|-----------------|
| `update_website` | mutation | 519 | 5765 |
| `sync_calendar` | mutation | 585 | 6173 |

#### Automation & Utilities (4 tools)

| Tool | Type | Schema (line) | Executor (line) |
|------|------|---------------|-----------------|
| `create_workflow` | mutation | 548 | 6000 |
| `generate_qr_codes` | mutation | 571 | 6074 |
| `get_document_upload_url` | query | 597 | 6411 |
| `get_weather` | query | 387 | 4717 |

#### Assign (1 tool)

| Tool | Type | Schema (line) | Executor (line) |
|------|------|---------------|-----------------|
| `assign_guests_to_events` | mutation | 335 | 4094 |

### 4.2 Summary

| Category | Query | Mutation | Total |
|----------|-------|----------|-------|
| Client | 3 | 2 | 5 |
| Guest | 1 | 5 | 6 |
| Events & Timeline | 0 | 6 | 6 |
| Vendors | 0 | 3 | 3 |
| Hotels & Transport | 1 | 3 | 4 |
| Budget | 2 | 2 | 4 |
| Seating | 0 | 2 | 2 |
| Gifts | 0 | 3 | 3 |
| Creative & Team | 0 | 2 | 2 |
| Search & Analytics | 4 | 0 | 4 |
| Communication | 0 | 1 | 1 |
| Business Ops | 0 | 4 | 4 |
| Website & Calendar | 0 | 2 | 2 |
| Automation & Utilities | 2 | 2 | 4 |
| Assign | 0 | 1 | 1 |
| **Total** | **13** | **38** | **51** |

---

## 5. Execution Flow

### 5.1 Chat Flow (tRPC `chat` mutation)

```
User message → chatbot.router.ts:chat (line 151)
  ├─ 1. companyId null guard (line 156)
  ├─ 2. Rate limit check (line 164)
  ├─ 3. Client ownership validation (line 181)
  ├─ 4. Build context → system prompt (lines 197+)
  ├─ 5. Call OpenAI with CHATBOT_TOOLS (lines 200+)
  ├─ 6. If tool_call:
  │     ├─ Query tool → executeToolWithSync() → return results
  │     └─ Mutation tool → generateToolPreview() → store pending call → return preview
  └─ 7. If text response → return as-is
```

### 5.2 Mutation Confirmation Flow

```
User confirms → chatbot.router.ts:confirmToolCall (line 433)
  ├─ Step 1: companyId presence guard (line 438)
  ├─ Step 2: Admin role gate (company_admin / super_admin) (line 446)
  ├─ Step 3: Client ownership validation (line 454)
  ├─ Step 4: Retrieve pending call from DB (line 472)
  ├─ Step 5: Cross-tenant ownership check (pending.companyId + userId) (line 482)
  ├─ Step 6: Tool name integrity check (line 490)
  ├─ Step 7: Expiry check (5-min TTL) (line 498)
  └─ Execute: executeToolWithSync(toolName, args, ctx) (line 508+)
```

### 5.3 SSE Streaming Flow

```
POST /api/chatbot/stream → stream/route.ts (line 28)
  ├─ Auth: getServerSession() (line 36)
  ├─ Rate limit: checkRateLimit() (line 46)
  ├─ Context: buildChatbotContext + buildChatbotSystemPrompt (lines 71-72)
  ├─ Stream: ReadableStream + TextEncoder (line 84)
  ├─ Timeout: AbortController 30s (lines 89-90)
  ├─ Primary: OpenAI streaming call (line 98)
  │   └─ On failure → Fallback model retry (line 107)
  ├─ Loop: for await (chunk of streamResponse)
  │   ├─ Content tokens → SSE type: 'content' (line 167)
  │   ├─ Tool calls → accumulate → SSE type: 'tool_call' (line 178)
  │   └─ Stop → SSE type: 'done' (line 193)
  └─ Headers: text/event-stream, no-cache, keep-alive (line 230)
```

### 5.4 Tool Execution Internals

```
executeToolWithSync(toolName, args, ctx) — line 554
  ├─ Call executeTool(toolName, args, ctx) — line 350
  │     └─ 51-case switch → execute*(args, ctx)
  ├─ On success:
  │     ├─ Determine queries to invalidate (getQueriesToInvalidate)
  │     ├─ Build SyncAction { module, action, queries }
  │     └─ Broadcast via publishSyncAction (non-fatal, catch logged)
  └─ Return result
```

### 5.5 Transaction Wrapper

```
withTransaction(fn, options?) — transaction-wrapper.ts:100
  ├─ MAX_RETRIES = 3 (default)
  ├─ DEADLOCK_RETRY_DELAY_MS = 100ms (base)
  ├─ Retryable PG codes: 40P01 (deadlock), 40001 (serialization), 55P03 (lock)
  ├─ Also retries on message match: 'connection', 'timeout', 'deadlock'
  ├─ Backoff: delay_ms × attempt (100ms, 200ms, 300ms)
  └─ On exhaustion: TRPCError INTERNAL_SERVER_ERROR
```

---

## 6. Entity Resolution

**File:** `entity-resolver.ts` (1,073 lines)

### 6.1 Resolve Functions

| Function | Line | Input | Matching Strategy |
|----------|------|-------|-------------------|
| `resolveClient` | 279 | name or partial | Levenshtein on `partnerOneName`, `partnerTwoName`, `displayName` |
| `resolveGuest` | 405 | name or partial | Levenshtein on `firstName`, `lastName`, full name |
| `resolveVendor` | 532 | name or partial | Levenshtein on `businessName`, `contactPerson` |
| `resolveEvent` | 638 | title, type, or date | Levenshtein on `title`, `eventType`, date text |
| `resolveMultipleEntities` | 766 | array of names | Calls individual resolve functions in parallel |

### 6.2 Scoring Thresholds

| Threshold | Value | Usage |
|-----------|-------|-------|
| Auto-match (client, guest, vendor) | > 0.8 | Single top match returned immediately |
| Auto-match (event) | > 0.7 | Lower because events match on title+type+date text |
| Ambiguous cutoff (client) | < 0.8 | Returns top 5 options for user disambiguation |
| Ambiguous cutoff (guest, vendor) | < 0.9 | Returns top matches for user disambiguation |
| Duplicate similarity | 0.75 | Used in `checkGuestDuplicates` / `checkVendorDuplicates` |

### 6.3 Exported Types

```typescript
type ResolvedEntityType = 'client' | 'guest' | 'vendor' | 'event'  // line 24

interface EntityResolutionResult {
  resolved: boolean
  entity?: { id, name, type, score }
  ambiguous?: { options: Array<{ id, name, score }> }
  notFound?: boolean
}

interface DuplicateCheckResult {
  hasDuplicate: boolean
  existingEntity?: { id, name, score }
}
```

---

## 7. Security Model

### 7.1 Authentication

All entry points require BetterAuth session:

| Entry Point | Auth Check | Line |
|-------------|-----------|------|
| `chatbot.router.ts` (all 20 procedures) | `protectedProcedure` (session required) | Inherited from tRPC base |
| `stream/route.ts` | `getServerSession()` → 401 if no userId | 36-41 |

### 7.2 Tenant Isolation (companyId)

Every `execute*` function enforces `companyId` via one of:
- Direct `WHERE companyId = ctx.companyId!` on the target table
- `innerJoin(clients)` with `eq(clients.companyId, ctx.companyId!)`
- Entity resolution functions that filter by companyId

**Functions with indirect/missing companyId checks (audit findings):**

| Function | Line | Issue |
|----------|------|-------|
| `executeUpdateGift` | 5217 | Uses clientId only, no direct companyId check |
| `executeUpdateCreative` | 5285 | Uses clientId/creativeId directly, no companyId check |
| `executeUpdateWebsite` | 5765 | Uses clientId+websiteId only, no companyId check |

These are mitigated by the fact that clientId is resolved via entity resolver which filters by companyId. However, if a raw clientId is passed (bypassing resolution), cross-tenant access is theoretically possible. Flagged as future hardening candidates.

### 7.3 Role Gates

| Check | Where | Lines |
|-------|-------|-------|
| Mutation tool calls require `company_admin` or `super_admin` | `chat` procedure | 369-375 |
| `confirmToolCall` requires `company_admin` or `super_admin` | `confirmToolCall` procedure | 446-451 |

Query tools are accessible to all authenticated users with a valid companyId.

### 7.4 Pending Call Security (7-Step Verification)

The `confirmToolCall` procedure enforces:

1. `companyId` is not null
2. User role is `company_admin` or `super_admin`
3. Client belongs to the user's company (if clientId provided)
4. Pending call exists in DB
5. Pending call's `companyId` and `userId` match the session
6. Requested `toolName` matches stored `toolName`
7. Pending call has not expired (5-minute TTL)

### 7.5 Rate Limiting

- `chatbot.router.ts:chat` — `checkRateLimit(userId)` at line 164
- `stream/route.ts` — `checkRateLimit(userId)` at line 46
- Returns HTTP 429 / TRPCError `TOO_MANY_REQUESTS` on breach

---

## 8. Cache Invalidation & Realtime Sync

### 8.1 TOOL_QUERY_MAP

**File:** `query-invalidation-map.ts` (166 lines)

Maps each mutation tool to the tRPC query paths that should be invalidated after execution:

| Tool | Invalidated Queries |
|------|---------------------|
| `create_client` | `clients.list` |
| `update_client` | `clients.list` |
| `add_guest` | `guests.list`, `guests.getStats`, `hotels.list`, `guestTransport.list`, `budget.overview` |
| `update_guest_rsvp` | `guests.list`, `guests.getStats`, `budget.overview` |
| `bulk_update_guests` | `guests.list`, `guests.getStats` |
| `check_in_guest` | `guests.list`, `guests.getStats` |
| `assign_guests_to_events` | `guests.list`, `events.list` |
| `update_table_dietary` | `guests.list` |
| `create_event` | `events.list`, `timeline.list` |
| `update_event` | `events.list`, `timeline.list` |
| `add_timeline_item` | `timeline.list` |
| `shift_timeline` | `timeline.list` |
| `add_vendor` | `vendors.list`, `budget.list`, `timeline.list` |
| `update_vendor` | `vendors.list`, `budget.list` |
| `add_hotel_booking` | `hotels.list` |
| `bulk_add_hotel_bookings` | `hotels.list` |
| `assign_transport` | `guestTransport.list` |
| `update_budget_item` | `budget.list`, `budget.overview` |
| `add_gift` | `gifts.list` |
| `update_gift` | `gifts.list` |
| `add_seating_constraint` | `floorPlans.list` |
| `send_communication` | `communications.list` |
| `update_pipeline` | `pipeline.list` |
| `update_creative` | `creatives.list` |
| `assign_team_member` | `team.list` |
| `create_proposal` | `proposals.list` |
| `create_invoice` | `invoices.list` |
| `update_website` | `websites.list` |
| `create_workflow` | `workflows.list` |
| `delete_guest` | `guests.list`, `guests.getStats`, `hotels.list`, `guestTransport.list`, `budget.overview` |
| `delete_event` | `events.list`, `timeline.list`, `guests.list` |
| `delete_vendor` | `vendors.list`, `budget.list`, `timeline.list` |
| `delete_budget_item` | `budget.list`, `budget.overview`, `timeline.list` |
| `delete_timeline_item` | `timeline.list` |
| `delete_gift` | `gifts.list` |

### 8.2 Broadcast Mechanism

```
executeToolWithSync() → success
  ├─ getQueriesToInvalidate(toolName) → string[]
  ├─ Build SyncAction { module, action: 'chatbot_mutation', queries }
  ├─ storeSyncAction(action) — persist to Redis
  └─ publishSyncAction(action) — Redis pub/sub broadcast
       └─ catch: log "Sync broadcast failed (non-fatal)" — NEVER throws
```

**Design intent:** Broadcast failures are intentionally non-fatal. The chatbot mutation has already succeeded in the database; the sync broadcast is a best-effort optimization for live UI updates. Redis unavailability should not roll back a successful DB write.

### 8.3 MODULE_PRIMARY_QUERIES

17 module mappings for `getModuleFromToolName()` → primary query paths:

| Module | Queries |
|--------|---------|
| `guests` | `guests.list`, `guests.getStats` |
| `events` | `events.list` |
| `budget` | `budget.list`, `budget.overview` |
| `vendors` | `vendors.list` |
| `hotels` | `hotels.list` |
| `transport` | `guestTransport.list` |
| `timeline` | `timeline.list` |
| `gifts` | `gifts.list` |
| `floorPlan` | `floorPlans.list` |
| `pipeline` | `pipeline.list` |
| `communications` | `communications.list` |
| `creatives` | `creatives.list` |
| `team` | `team.list` |
| `proposals` | `proposals.list` |
| `invoices` | `invoices.list` |
| `websites` | `websites.list` |
| `workflows` | `workflows.list` |

---

## 9. Session 5 Audit Findings

### 9.1 Severity Classification

| Severity | Count | Description |
|----------|-------|-------------|
| **Critical** | 7 | No transaction on multi-table writes, no auth on mutations, phantom cache entries |
| **High** | 8 | Missing cascades, missing delete tools, data integrity gaps |
| **Medium** | 13 | Logic gaps, missing validation, parity issues, SSE safety |
| **Low** | 9 | Type safety, unused code, minor schema mismatches |
| **Total** | **37** | |

### 9.2 Critical-Severity Findings

| ID | Finding | Status |
|----|---------|--------|
| S5-C01 | `executeCreateEvent` was raw `db.insert` — no transaction, no timeline auto-creation from templates | **Fixed (Round 1)** |
| S5-C02 | `executeUpdateBudgetItem` was raw `db.update` — no transaction, no vendor sync, no timeline sync | **Fixed (Round 1)** |
| S5-C03 | `executeUpdateEvent` was raw `db.update` — no transaction, no timeline date sync on date change | **Fixed (Round 1)** |
| S5-C04 | `executeAddHotelBooking` was raw `db.insert` — no transaction, no accommodation link, no timeline entry, no default dates | **Fixed (Round 1)** |
| S5-C05 | `TOOL_QUERY_MAP` had 38 entries with 30 phantom query paths, 16 missing mutations, 2 name mismatches | **Fixed (Round 2)** |
| S5-C06 | No role gate on `chat` mutation — any authenticated user could execute destructive mutations | **Fixed (Round 3)** |
| S5-C07 | No role gate on `confirmToolCall` — any authenticated user could confirm pending mutations | **Fixed (Round 3)** |

### 9.3 High-Severity Findings

| ID | Finding | Status |
|----|---------|--------|
| S5-H01 | `catch (error: any)` throughout tool-executor (should be `unknown`) | Deferred (large scope, no runtime risk) |
| S5-H02 | `tx: any` in Drizzle transactions (should be `TransactionClient`) | Deferred (same reason) |
| S5-H03 | `ctx.companyId` (string \| null) not narrowing in `withTransaction` callbacks | Deferred (workaround: capture to local var) |
| S5-H04 | Pervasive `as` type casts in tool-executor (e.g., `args.name as string`) | Deferred (refactoring candidate: Zod parse per tool) |
| S5-H05 | Vendor create missing auto-timeline entry (UI has it, chatbot didn't) | **Fixed (Round 5)** |
| S5-H06 | Vendor create missing auto-event-linking by date (UI has it, chatbot didn't) | **Fixed (Round 5)** |
| S5-H07 | Zero delete tools — no way to delete guests, events, vendors, etc. | **Fixed (Round 6)** — 6 delete tools added |
| S5-H08 | `executeAddGuest` passed null for ALL hotel/transport fields to `cascadeGuestSideEffects` — side-effect logic was dead code | **Fixed (Round 1)** |

### 9.4 Medium-Severity Findings

| ID | Finding | Status |
|----|---------|--------|
| S5-M01 | `normalizeRsvpStatus` never imported/called in tool-executor | **Fixed (Round 5)** |
| S5-M02 | LLM can send raw RSVP values ('attending', 'yes') that bypass normalization | **Fixed (Round 5)** |
| S5-M03 | `normalizeGuestSide` doesn't read client `planningSide` for 'mutual' resolution | **Fixed (Round 5)** |
| S5-M04 | Event schema included `dressCode` (column doesn't exist in DB) | **Fixed (Round 5)** |
| S5-M05 | `add_vendor` definition missing `serviceDate` parameter | **Fixed (Round 5)** |
| S5-M06 | System prompt said "Deletion is NOT available" (now it is) | **Fixed (Round 6)** |
| S5-M07 | `create_client` couldn't auto-create vendors from CSV string | **Fixed (Round 7)** |
| S5-M08 | broadcastSync catch block had no design-intent documentation | **Fixed (Round 7)** |
| S5-M09 | `executeUpdateGift` lacks direct companyId check | Flagged (mitigated by clientId resolution) |
| S5-M10 | `executeUpdateCreative` lacks direct companyId check | Flagged (mitigated by clientId resolution) |
| S5-M11 | `executeUpdateWebsite` lacks direct companyId check | Flagged (mitigated by clientId resolution) |
| S5-M12 | `isQueryOnlyTool` had 15 stale tool names (14/15 were wrong) | **Fixed (Round 2)** |
| S5-M13 | `resolveGuest()` and `resolveEvent()` had optional `companyId` param — callers could skip tenant filter | **Fixed (Round 3)** |

### 9.5 Low-Severity Findings

| ID | Finding | Status |
|----|---------|--------|
| S5-L01 | Unused `'budget'` in ResolvedEntity type union | **Fixed (Round 7)** |
| S5-L02 | Unused `budget` import in entity-resolver.ts | **Fixed (Round 7)** |
| S5-L03 | broadcastSync already present in gifts.router.ts (no chatbot fix needed) | Verified — no fix needed |
| S5-L04 | `quantity` parameter extracted in executeAddGift but giftsEnhanced has no quantity column | **Fixed (Round 5)** |
| S5-L05 | `notes` field in executeCreateEvent incorrectly set from nonexistent dressCode | **Fixed (Round 5)** |
| S5-L06 | Missing import of `normalizeRsvpStatus` from `@/lib/constants/enums` | **Fixed (Round 5)** |
| S5-L07 | `create_client` schema missing `vendors` field | **Fixed (Round 7)** |
| S5-L08 | `createEventSchema` had `dressCode` field (no such DB column) | **Fixed (Round 5)** |
| S5-L09 | `create_event` OpenAI definition had `dress_code` property | **Fixed (Round 5)** |

---

## 10. Session 5 Fixes Applied

### Round 1: Critical Cascade + Transaction Fixes (5 fixes)

**FIX 1.1 — `executeCreateEvent`: Add `withTransaction` + timeline auto-creation** (S5-C01)

Before: Raw `db.insert(events)` with no cascade. After: Full parity with `events.router.ts:create`.

- `tool-executor.ts:1977` — Wrapped in `withTransaction`
- Lines 1901-1974: Pre-transaction read-only phase:
  - Line 1912: Normalizes `eventType` to lowercase
  - Lines 1915-1940: Queries `timelineTemplates` for company-custom templates matching `(companyId, normalizedEventType, isActive=true)`, ordered by `sortOrder ASC`
  - Lines 1942-1946: Falls back to `getDefaultTemplate(eventType)` if no custom templates
  - Lines 1948-1971: Maps template items to `timeline.$inferInsert[]` with computed `startTime` (eventStart + offsetMinutes), `endTime`, `sourceModule: 'events'`, `sourceId: eventId`
- Lines 1978-2001: Transaction Step 1 — `tx.insert(events).values(...)` with pre-generated UUID
- Lines 2004-2008: Transaction Step 2 — `tx.insert(timeline).values(preparedTimelineItems)` (bulk insert)

**FIX 1.2 — `executeUpdateBudgetItem`: Add `withTransaction` + vendor sync + timeline sync** (S5-C02)

Before: Raw `db.update(budget)` with no cascade. After: Full parity with `budget.router.ts:update`.

- `tool-executor.ts:2903` — Wrapped in `withTransaction`
- Lines 2904-2915: Transaction Step 1 — Update budget row
- Lines 2917-2941: Transaction Step 2 — **Vendor sync** (conditional on `updated.vendorId`):
  - `estimatedCost` → `clientVendors.contractAmount` (line 2924)
  - `paymentStatus` → `clientVendors.paymentStatus` (line 2927)
  - If `paymentStatus === 'paid'`, also sets `clientVendors.depositPaid = true` (lines 2928-2930)
  - `tx.update(clientVendors).set(syncData).where(eq(clientVendors.vendorId, updated.vendorId))` (lines 2934-2937)
- Lines 2943-3001: Transaction Step 3 — **Timeline sync**:
  - If `paymentDate` exists: upserts timeline entry (`sourceModule: 'budget'`, title: `"Payment Due: {item}"`, startTime at 17:00)
  - If `paymentDate` cleared: deletes linked timeline entry (`tx.delete(timeline).where(sourceModule='budget' AND sourceId=updated.id)`)

**FIX 1.3 — `executeUpdateEvent`: Add `withTransaction` + timeline date sync** (S5-C03)

Before: Raw `db.update(events)` with no cascade. After: Full parity with `events.router.ts:update`.

- `tool-executor.ts:2080` — Wrapped in `withTransaction`
- Lines 2081-2092: Transaction Step 1 — Update event row
- Lines 2094-2133: Transaction Step 2 — **Timeline date sync**:
  - If `eventDate` or `startTime` changed: recomputes `startTime` DateTime, sets `timelineUpdate.startTime` (lines 2096-2109)
  - If `endTime` changed: recomputes and sets `timelineUpdate.endTime` (lines 2111-2121)
  - `tx.update(timeline).set(timelineUpdate).where(sourceModule='events' AND sourceId=eventId)` — updates ALL linked timeline entries (lines 2123-2131)

**FIX 1.4 — `executeAddHotelBooking`: Add `withTransaction` + accommodation + timeline + default dates** (S5-C04)

Before: Raw `db.insert(hotels)` with no cascade. After: Full parity with `hotels.router.ts:create`.

- `tool-executor.ts:2693` — Wrapped in `withTransaction`
- Lines 2664-2677: **Default dates from wedding date** (pre-transaction):
  - If `checkInDate` absent and client has `weddingDate`: default = wedding date - 1 day
  - If `checkOutDate` absent and client has `weddingDate`: default = wedding date + 1 day
- Lines 2696-2718: Transaction Step 1 — Insert hotel record
- Lines 2720-2765: Transaction Step 2 — **Auto-create accommodation**:
  - Checks if accommodation with matching `hotelName` already exists for this client
  - If not: `tx.insert(accommodations).values({ clientId, name: trimmedHotelName })`, then links via `tx.update(hotels).set({ accommodationId })`
  - If exists: links only via `tx.update(hotels).set({ accommodationId })`
- Lines 2767-2788: Transaction Step 3 — **Timeline check-in entry**:
  - Creates timeline entry with `sourceModule: 'hotels'`, title: `"Hotel Check-in: {guestName}"`, startTime at 15:00 (3 PM)
- Lines 2791-2797: Transaction Step 4 — Guest flag update: `tx.update(guests).set({ hotelRequired: false })` — marks requirement fulfilled

**FIX 1.5 — `executeAddGuest`: Pass actual hotel/transport args to `cascadeGuestSideEffects`** (S5-H08)

Before: All 8 hotel/transport fields passed as `null` to `cascadeGuestSideEffects`, making the cascade dead code. After: Actual args passed.

- `tool-executor.ts:1498-1522` — Now extracts 8 additional fields: `hotelName`, `hotelCheckIn`, `hotelCheckOut`, `hotelRoomType`, `transportType`, `pickupLocation`, `pickupTime`, `transportNotes`
- Lines 1591-1608: `cascadeGuestSideEffects` call now spreads `...newGuest` and overlays the 8 fields from args:
  ```
  hotelName: hotelName || null, hotelCheckIn: hotelCheckIn || null,
  hotelCheckOut: hotelCheckOut || null, hotelRoomType: hotelRoomType || null,
  transportType: transportType || null, transportPickupLocation: pickupLocation || null,
  transportPickupTime: pickupTime || null, transportNotes: transportNotes || null
  ```
- `schemas.ts` + `definitions.ts` — Added 8 optional fields to `addGuestSchema` and `add_guest` OpenAI definition

### Round 2: Query Invalidation Map Rewrite (3 fixes)

**FIX 2.1 — Rewrite `TOOL_QUERY_MAP`** (S5-C05)

Before: 38 entries with 30 phantom query paths that didn't match any real tRPC router (e.g., `guests.getAll`, `budget.getOverview`, `vendors.getAll`), 16 mutation tools with no entry at all, and 2 tool name mismatches (`sync_hotel` instead of `sync_hotel_guests`).

After: 37 entries, all query paths verified against actual tRPC router procedure names. Every mutation tool that changes data has an entry. Query paths use real procedure names (`guests.list`, `guests.getStats`, `budget.list`, `budget.overview`, etc.).

- `query-invalidation-map.ts:18` — Complete rewrite of `TOOL_QUERY_MAP`

**FIX 2.2 — Rewrite `isQueryOnlyTool`** (S5-M12)

Before: 15 tool names, 14 of 15 were wrong (e.g., `get_guests`, `get_events`, `get_vendors` — tools that don't exist).

After: 14 correct tool names matching the actual query tools in `TOOL_METADATA`:
- `query-invalidation-map.ts:106-125` — `get_client_summary`, `get_wedding_summary`, `get_recommendations`, `get_guest_stats`, `sync_hotel_guests`, `get_budget_overview`, `budget_currency_convert`, `search_entities`, `query_data`, `query_cross_client_events`, `export_data`, `query_analytics`, `get_weather`, `get_document_upload_url`

**FIX 2.3 — Rewrite `MODULE_PRIMARY_QUERIES`** (S5-C05)

Before: 9 entries with wrong query path names. After: 17 entries covering all modules, all paths verified against real tRPC procedures.

- `query-invalidation-map.ts:132-150` — 17 module entries (guests, events, budget, vendors, hotels, transport, timeline, gifts, floorPlan, pipeline, communications, creatives, team, proposals, invoices, websites, workflows)

### Round 3: Authorization Hardening (4 fixes)

**FIX 3.1 — Add role gate to `chat` mutation** (S5-C06)

Before: Any authenticated user could trigger mutation tool calls via chat. After: Only `company_admin` and `super_admin` can execute mutations.

- `chatbot.router.ts:369-375` — Soft gate that returns error object (not TRPCError throw) when non-admin user tries a mutation tool:
  ```typescript
  if (ctx.role !== 'company_admin' && ctx.role !== 'super_admin') {
    return { type: 'error', content: 'You don\'t have permission...', error: 'FORBIDDEN' }
  }
  ```
  Placed after query tool execution path (line 321) but before mutation preview/pending-call path.

**FIX 3.2 — Add role gate to `confirmToolCall`** (S5-C07)

Before: Any authenticated user could confirm pending mutations. After: Hard `TRPCError FORBIDDEN` for non-admins.

- `chatbot.router.ts:446-451` — Hard gate (throws `TRPCError`):
  ```typescript
  if (ctx.role !== 'company_admin' && ctx.role !== 'super_admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions...' })
  }
  ```

**FIX 3.3 — Add companyId to entity resolver calls** (S5-M13)

Before: `resolveGuest()` and `resolveEvent()` accepted `companyId` as optional parameter. Some callers omitted it, allowing queries to run without tenant filtering.

After: All callers in `tool-executor.ts` now pass `ctx.companyId!` to every resolve call. The functions validate client ownership when `companyId` is provided:
- `entity-resolver.ts:411-425` (`resolveGuest`) — If `companyId` provided, verifies `clients.companyId = companyId` before proceeding
- `entity-resolver.ts:644-658` (`resolveEvent`) — Same pattern

**FIX 3.4 — Add companyId to context builder stat queries**

Before: Some `build*Stats` functions only filtered by `clientId`. After: All 5 stat functions filter by BOTH `clientId` AND `companyId`:
- `context-builder.ts:291` — `buildClientContext`: `eq(clients.companyId, companyId)`
- `context-builder.ts:334-356` — `buildEventStats`: `eq(events.companyId, companyId)` in both aggregate and nextEvent queries
- `context-builder.ts:390` — `buildGuestStats`: `eq(guests.companyId, companyId)`
- `context-builder.ts:417` — `buildBudgetStats`: `eq(budget.companyId, companyId)`
- `context-builder.ts:450` — `buildVendorStats`: `eq(vendors.companyId, companyId)`
- `context-builder.ts:487-501` — `buildTimelineStats`: `eq(timeline.companyId, companyId)` in both queries

### Round 4: Error Handling + SSE Safety + System Prompt (6 fixes)

**FIX 4.1 — Update system prompt with all 51 tools**

Before: System prompt listed ~30 tools, missing delete tools, missing newer tools. After: All 51 tools documented in Available Tools Reference sections with accurate descriptions and cascade warnings.

- `chatbot-system.ts` — Full rewrite of the Available Tools Reference block

**FIX 4.2 — SSE AbortController 30s timeout** (related to S5-C01 area)

Before: No timeout on OpenAI streaming — hung connections would block indefinitely. After:

- `stream/route.ts:89-90` — `const abortController = new AbortController()` + `setTimeout(() => abortController.abort(), 30000)`
- Line 98: `signal: abortController.signal` passed to OpenAI `chat.completions.create`
- Line 223: `clearTimeout(timeout)` in finally block

**FIX 4.3 — SSE error message sanitization**

Before: Raw error messages (potentially containing internal details) sent to client. After:

- `stream/route.ts:208` — Real error logged server-side: `console.error('[Chatbot Stream] Error:', error)`
- Lines 210-213: Client receives generic message based on error type:
  - `AbortError` (timeout) → `"The response timed out. Please try a simpler request or try again."`
  - Other errors → `"An error occurred while generating the response. Please try again."`

**FIX 4.4 — SSE fallback model wrapped in own try-catch**

Before: Fallback model failure would crash the entire stream handler. After:

- `stream/route.ts:110-130` — Fallback `fallbackAI.chat.completions.create` wrapped in its own try-catch. On fallback failure: sends SSE `type: 'error'` event, calls `controller.close()`, returns gracefully.

**FIX 4.5 — `deletePendingCall` now re-throws errors**

Before: `deletePendingCall` swallowed all errors silently. After:

- `pending-calls.ts:107` — `throw error` re-throws so callers can distinguish cleanup failure from mutation failure
- JSDoc (lines 93-99) documents rationale: "The mutation itself may have already succeeded — callers should catch this and still report mutation success with a logged warning."

**FIX 4.6 — `cleanupExpiredCalls` wired to `setPendingCall`, returns count**

Before: `cleanupExpiredCalls` existed but was never called. After:

- `pending-calls.ts:36` — Opportunistic cleanup wired into `setPendingCall`: `cleanupExpiredCalls().catch(() => {})` (fire-and-forget)
- Lines 166-171: Returns actual count: `return deleted.length` from `db.delete(chatbotPendingCalls).where(lt(expiresAt, new Date())).returning({ id })`

### Round 5: Enum Normalization + Tool-Executor Logic Gaps (6 fixes)

**FIX 5.1 — Import and call `normalizeRsvpStatus`** (S5-M01, S5-M02, S5-L06)

- `tool-executor.ts:49` — Added `normalizeRsvpStatus` to import from `@/lib/constants/enums`
- `executeAddGuest` (line 1503) — `normalizeRsvpStatus((args.rsvpStatus as string) || 'pending')`
- `executeUpdateGuestRsvp` (line 1641) — Split extraction + null check + `normalizeRsvpStatus(rawRsvpStatus)`
- `executeBulkUpdateGuests` (line 1788) — `normalizeRsvpStatus(updates.rsvpStatus as string)`

**FIX 5.2 — Remove unused `quantity` parameter** (S5-L04)

- `executeAddGift` — Removed `const quantity = (args.quantity as number) || 1` (giftsEnhanced table has no quantity column; quantity lives on child giftItems table)

**FIX 5.3 — Vendor create: add timeline entry + auto-event-linking** (S5-H05, S5-H06)

- `schemas.ts:175` — Added `serviceDate` to `addVendorSchema`
- `definitions.ts` — Added `service_date` to `add_vendor` OpenAI definition
- `executeAddVendor` — After vendor + clientVendor + budget creation:
  - Creates timeline entry with `sourceModule: 'vendors'`
  - Queries events matching `serviceDate` and auto-links vendor via `event.vendorIds[]`
- `query-invalidation-map.ts` — Updated `add_vendor` to include `'timeline.list'`

**FIX 5.4 — Fix `normalizeGuestSide` to read client `planningSide`** (S5-M03)

- `executeAddGuest` (line 1538) — Extended client query to `select({ id: clients.id, planningSide: clients.planningSide })`
- Lines 1554-1556 — If guest side is `'mutual'` and client has `planningSide`, resolves to `normalizeGuestSide(client.planningSide)`

**FIX 5.5 — Remove `dressCode` from event schemas** (S5-M04, S5-L08, S5-L09)

- `schemas.ts` — Removed `dressCode` from `createEventSchema`
- `definitions.ts` — Removed `dress_code` from `create_event` OpenAI definition
- `executeCreateEvent` — Removed dressCode extraction (line 1753) and usage in notes field (line 1880)

### Round 6: Delete Tools (6 new tools)

Added 6 delete tools matching UI router cascade patterns:

**`delete_guest`** (executor line 6528, 127 lines)
- Resolves guest via `resolveGuest()` with fuzzy matching
- Verifies ownership via `innerJoin(clients)` on companyId
- `withTransaction` cascade (6 steps):
  1. Delete `floorPlanGuests` (seating assignments)
  2. Delete `hotels` (hotel bookings)
  3. Delete `guestTransport` (transport assignments)
  4. Delete `guestGifts` (gift associations)
  5. Delete `gifts` (gift records where guestId matches)
  6. Delete the guest record
- Post-transaction: `recalcPerGuestBudgetItems` if guest was confirmed

**`delete_event`** (executor line 6660, 85 lines)
- Verifies event via `innerJoin(clients)` on companyId
- `withTransaction` cascade (3 steps):
  1. SQL `array_remove` on all guests' `attendingEvents[]` arrays
  2. Delete timeline entries where `sourceModule = 'events'`
  3. Delete the event record

**`delete_vendor`** (executor line 6751, 106 lines)
- Resolves vendor via `resolveVendor()`, then finds `clientVendors` record
- `withTransaction` cascade (3 steps):
  1. Delete budget items linked to the clientVendor
  2. Delete timeline entries where `sourceModule = 'vendors'`
  3. Delete the `clientVendors` record (vendor record stays for reuse)

**`delete_budget_item`** (executor line 6862, 56 lines)
- Verifies budget item via `innerJoin(clients)` on companyId
- `withTransaction` cascade (2 steps):
  1. Delete timeline entries where `sourceModule = 'budget'`
  2. Delete the budget record

**`delete_timeline_item`** (executor line 6923, 39 lines)
- Verifies timeline item via `innerJoin(clients)` on companyId
- No transaction needed — single `db.delete()` call

**`delete_gift`** (executor line 6967, 68 lines)
- Dual-table lookup: tries `giftsEnhanced` first, falls back to `gifts`
- Verifies ownership via `innerJoin(clients)` on companyId
- No transaction — single `db.delete()` call

**Supporting changes for Round 6:**
- `schemas.ts` — 6 new Zod schemas (lines 609-635) + 6 type exports (lines 700-705)
- `definitions.ts` — 6 TOOL_METADATA entries (lines 471-511) + 6 CHATBOT_TOOLS definitions (lines 2767-2905)
- `query-invalidation-map.ts` — 6 new entries (lines 83-88)
- `chatbot-system.ts` — Updated Available Tools Reference with delete tools; replaced "Deletion is NOT available" with cascade warning guidance

### Round 7: Final Fixes + Verification (3 fixes)

**FIX 7.1 — Remove unused `'budget'` from ResolvedEntity type** (S5-L01, S5-L02)

- `entity-resolver.ts:24` — Removed `'budget'` from `ResolvedEntityType` union
- Removed unused `budget` import from schema

**FIX 7.2 — Add vendor CSV parsing to `create_client`** (S5-L07, S5-M07)

- `schemas.ts:29` — Added `vendors: z.string().optional()` to `createClientSchema`
- `definitions.ts` — Added `vendors` parameter to `create_client` OpenAI definition with description: "Comma-separated list of vendors, format: 'Category: Name' or just 'Name'"
- `executeCreateClient` (lines 836-908) — Inside existing `withTransaction`:
  - Parses CSV: `vendorsCsv.split(',').map(v => v.trim()).filter(Boolean)`
  - Supports "Category: Vendor Name" or just "Vendor Name" format
  - Category keyword inference: photographer→photography, dj→music, etc.
  - Per vendor: creates `vendors` record + `clientVendors` link + `budget` item
  - All linked to `mainEventId` from the auto-created wedding event

**FIX 7.3 — Document broadcast sync as non-fatal** (S5-M08)

- `tool-executor.ts:588-598` — Added 3-line design intent comment:
  ```
  // Design intent: Broadcast failures are intentionally non-fatal.
  // The chatbot mutation has already succeeded in the database; the sync
  // broadcast is a best-effort optimization for live UI updates.
  ```
- Changed log message to `"Sync broadcast failed (non-fatal)"`

### Comprehensive 11-Point Verification (all passed)

| # | Check | Result |
|---|-------|--------|
| 1 | `normalizeRsvpStatus` imported and used in 3 functions | PASS |
| 2 | `normalizeGuestSide` uses `client.planningSide` for 'mutual' | PASS |
| 3 | `dressCode` fully removed from schemas, definitions, executor | PASS |
| 4 | `quantity` removed from `executeAddGift` | PASS |
| 5 | `add_vendor` creates timeline + auto-links events | PASS |
| 6 | 6 delete tools in schemas (51 total) | PASS |
| 7 | 6 delete tools in definitions (51 total) | PASS |
| 8 | 6 delete tools in executor (51 cases + default) | PASS |
| 9 | 6 delete entries in query-invalidation-map | PASS |
| 10 | System prompt documents delete tools with cascade warnings | PASS |
| 11 | TypeScript compilation clean (`npx tsc --noEmit`) | PASS |

---

## 11. Error Handling

### 11.1 `executeTool` Top-Level Catch

**File:** `tool-executor.ts:532-543`

```
try {
  switch (toolName) { ... 51 cases ... }
} catch (error) {
  if (error instanceof TRPCError) throw error       // Re-throw as-is (line 533)
  console.error(`[Tool Executor] Error:`, error)     // Log real error (line 537)
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: error instanceof Error ? error.message : 'Failed to execute tool'  // line 541
  })
}
```

Pattern: `TRPCError`s (already structured) pass through unchanged. All other errors are logged server-side with full stack trace, then re-wrapped as `INTERNAL_SERVER_ERROR` with a safe message.

### 11.2 Transaction Wrapper Retry

**File:** `transaction-wrapper.ts`

| Setting | Value | Line |
|---------|-------|------|
| `MAX_RETRIES` | 3 | 24 |
| `DEADLOCK_RETRY_DELAY_MS` | 100ms (base) | 25 |
| Retryable PG codes | `40P01` (deadlock), `40001` (serialization), `55P03` (lock) | 49-57 |
| Retryable message patterns | `'connection'`, `'timeout'`, `'deadlock'` | 63-68 |
| Backoff formula | `delay_ms × attempt` (100ms, 200ms, 300ms) | 137 |
| On exhaustion | `TRPCError INTERNAL_SERVER_ERROR` with `cause: lastError` | 149-153 |

`isRetryableError(error)` at line 49 checks both PG error codes (via `.code` property) and string patterns in `.message`.

### 11.3 Broadcast Sync (Non-Fatal)

**File:** `tool-executor.ts:590-598`

```typescript
try {
  await Promise.all([publishSyncAction(action), storeSyncAction(action)])
} catch (error) {
  console.warn('[Tool Executor] Sync broadcast failed (non-fatal):', error)
}
```

The `ToolExecutionResult` is returned **unchanged** — no `warning` field is injected. The only function that uses `syncWarning` in the result is `executeUpdateClient` (line 1011), where event sync failure sets `warning: syncWarning`.

### 11.4 SSE Error Handling

**File:** `stream/route.ts`

| Mechanism | Lines | Behavior |
|-----------|-------|----------|
| AbortController timeout | 89-90 | 30s timeout, `abortController.abort()` |
| Primary AI failure | 107 | Falls through to fallback model |
| Fallback failure | 121-130 | Sends SSE `type: 'error'`, closes stream |
| Error sanitization | 208-215 | `AbortError` → timeout message; other → generic message |
| Real error logging | 208 | `console.error('[Chatbot Stream] Error:', error)` — server-only |
| Timeout cleanup | 223 | `clearTimeout(timeout)` in `finally` block |

Client never sees internal error details. The SSE error event contains only:
- Timeout: `"The response timed out. Please try a simpler request or try again."`
- Other: `"An error occurred while generating the response. Please try again."`

### 11.5 Pending Calls Error Handling

**File:** `pending-calls.ts`

| Function | Error Behavior | Line |
|----------|---------------|------|
| `setPendingCall` | Throws on insert failure | 48-52 |
| `getPendingCall` | Auto-deletes expired (line 71-74), re-fetches, returns `null` on not-found | 58-91 |
| `deletePendingCall` | **Re-throws** (`throw error` at line 107) — callers must handle | 100-109 |
| `hasPendingCall` | Returns `false` on any error (non-throwing) | 114-127 |
| `getPendingCallsForUser` | Returns `[]` on any error (non-throwing) | 132-155 |
| `cleanupExpiredCalls` | Returns `0` on error (non-throwing) | 164-176 |
| `clearAllPendingCalls` | Swallows all errors | 181-187 |

`deletePendingCall` is the only function that re-throws. This is by design — a failed cleanup after a successful mutation should be visible to the caller so it can log a warning while still reporting success to the user.

---

## 12. Pending Calls Lifecycle

**File:** `pending-calls.ts` (187 lines)

### 12.1 Storage Design

The `chatbot_pending_calls` table is **UNLOGGED** in PostgreSQL (lines 1-17 rationale):
- 2x faster writes (0.03ms vs 0.24ms per query)
- Survives clean deploys/restarts (unlike in-memory)
- Data lost on unexpected crash — acceptable for 5-minute TTL confirmations
- No additional infrastructure needed (no Redis, no separate process)

### 12.2 Lifecycle Flow

```
1. User sends chat message with mutation intent
2. Router generates preview → calls setPendingCall()
   ├─ Stores: id, userId, companyId, toolName, args, preview, expiresAt, createdAt
   ├─ TTL: expiresAt = now + 5 minutes (hardcoded in router at line 391)
   └─ Side-effect: cleanupExpiredCalls().catch(() => {}) — fire-and-forget (line 36)
3. User sees preview, clicks "Confirm"
4. Router calls confirmToolCall → getPendingCall(id)
   ├─ If expired (expiresAt < now): auto-deletes, returns null → BAD_REQUEST (line 71-74)
   ├─ If not found: returns null → BAD_REQUEST
   └─ If valid: returns pending call data
5. Router executes tool → calls deletePendingCall(id)
   └─ On failure: re-throws (line 107) — caller logs warning, still reports success
6. Background: every setPendingCall triggers cleanupExpiredCalls (line 36)
   └─ DELETE FROM chatbot_pending_calls WHERE expiresAt < now()
   └─ Returns count of deleted rows (line 171)
```

### 12.3 Dead Code Note

`DEFAULT_TTL_MS = 5 * 60 * 1000` (line 24) is declared but never used. The TTL is hardcoded by the caller in `chatbot.router.ts` at line 391: `new Date(Date.now() + 5 * 60 * 1000)`. This constant should either be exported and used by the caller, or removed.

---

## 13. Mutation Parity Matrix

For 8 core mutations, comparing the UI router implementation against the chatbot executor.

### 13.1 `add_guest`

| Aspect | UI (`guests.router.ts:86`) | Chatbot (`tool-executor.ts:1494`) | Match? |
|--------|----------------------------|-----------------------------------|--------|
| Transaction | `withTransaction` (line 169) | `withTransaction` (line 1560) | YES |
| Cascade ops | `cascadeGuestSideEffects` (line 226) | `cascadeGuestSideEffects` (line 1591) | YES |
| Enum: RSVP | Zod enum validates against `RSVP_STATUS_VALUES` | `normalizeRsvpStatus()` at line 1503 | YES (different approach, same result) |
| Enum: Side | `normalizeGuestSide(client.planningSide)` (line 159) | `normalizeGuestSide` + `client.planningSide` fallback (lines 1553-1557) | YES |
| companyId | `eq(clients.companyId, ctx.companyId)` (line 141) | `eq(clients.companyId, ctx.companyId!)` (line 1538) | YES |
| broadcastSync paths | `guests.list, guests.getStats, hotels.list, guestTransport.list, budget.overview` | Same paths in TOOL_QUERY_MAP | YES |
| Input fields | 30+ fields including hotel/transport details | 22 fields (line 1498-1522) | PARTIAL — UI has more granular fields |

### 13.2 `update_guest_rsvp`

| Aspect | UI (`guests.router.ts:1140`) | Chatbot (`tool-executor.ts:1631`) | Match? |
|--------|-------------------------------|-----------------------------------|--------|
| Transaction | `withTransaction` (line 1171) | No transaction (direct `db.update`) | NO — chatbot lacks transaction |
| Cascade ops | `recalcPerGuestBudgetItems` on confirmed/declined (line 1193) | `recalcPerGuestBudgetItems` via `cascadeGuestSideEffects` (line 1631+) | PARTIAL |
| Enum: RSVP | Zod enum `RSVP_STATUS_VALUES` | `normalizeRsvpStatus()` at line 1641 | YES |
| companyId | `innerJoin(clients)` + `eq(clients.companyId)` (line 1151) | Conditional `if (ctx.companyId)` at line 1674 | PARTIAL — chatbot check is conditional |
| broadcastSync paths | `guests.list, guests.getStats, budget.overview` | Same paths in TOOL_QUERY_MAP | YES |

### 13.3 `create_event`

| Aspect | UI (`events.router.ts:80`) | Chatbot (`tool-executor.ts:1853`) | Match? |
|--------|----------------------------|-----------------------------------|--------|
| Transaction | `ctx.db.transaction()` (line 206) | `withTransaction` (line 1977) | YES (chatbot has retry advantage) |
| Cascade ops | Custom templates → `getDefaultTemplate` fallback → bulk timeline insert (lines 126-238) | Same pattern (lines 1901-2008) | YES |
| companyId | `eq(clients.companyId, ctx.companyId)` (line 102) | `eq(clients.companyId, ctx.companyId!)` (line 1882) | YES |
| broadcastSync paths | `events.list, timeline.list` | Same paths in TOOL_QUERY_MAP | YES |
| Input fields | 12 fields | 10 fields (no `notes`, no explicit `status`) | PARTIAL |

### 13.4 `update_event`

| Aspect | UI (`events.router.ts:257`) | Chatbot (`tool-executor.ts:2021`) | Match? |
|--------|----------------------------|-----------------------------------|--------|
| Transaction | `ctx.db.transaction()` (line 328) | `withTransaction` (line 2080) | YES (chatbot has retry advantage) |
| Cascade: Timeline date sync | Recomputes timeline `startTime`/`endTime` on date change (lines 344-375) | Same pattern (lines 2094-2133) | YES |
| companyId | `innerJoin(clients)` + `eq(clients.companyId)` (line 281) | Same pattern (line 2045) | YES |
| broadcastSync paths | `events.list, timeline.list` | Same paths in TOOL_QUERY_MAP | YES |

### 13.5 `add_vendor`

| Aspect | UI (`vendors.router.ts:290`) | Chatbot (`tool-executor.ts:2331`) | Match? |
|--------|------------------------------|-----------------------------------|--------|
| Transaction | `withTransaction` (line 339) | `withTransaction` (line 2377) | YES |
| Cascade: Budget | Auto-creates budget item (lines 400-428) | Auto-creates budget item | YES |
| Cascade: Timeline | Auto-creates timeline entry on `serviceDate` (lines 432-449) | Auto-creates timeline entry on `serviceDate` | YES |
| Cascade: Auto-event-link | Matches event by `eventDate = serviceDate`, updates `clientVendors.eventId` (lines 452-478) | Same pattern | YES |
| companyId | `eq(clients.companyId, ctx.companyId)` (line 322) + vendor stamped with `companyId` (line 349) | `eq(clients.companyId, ctx.companyId!)` (line 2362) | YES |
| broadcastSync paths | `vendors.list` (UI only) | `vendors.list, budget.list, timeline.list` (TOOL_QUERY_MAP) | CHATBOT BETTER — includes cascade targets |

### 13.6 `update_budget_item`

| Aspect | UI (`budget.router.ts:273`) | Chatbot (`tool-executor.ts:2817`) | Match? |
|--------|----------------------------|-----------------------------------|--------|
| Transaction | `ctx.db.transaction()` (line 343) | `withTransaction` (line 2903) | YES (chatbot has retry advantage) |
| Cascade: Vendor sync | `estimatedCost→contractAmount`, `paymentStatus`, `depositPaid` (lines 357-384) | Same pattern (lines 2917-2941) | YES |
| Cascade: Timeline sync | Upsert/delete payment-due timeline entry (lines 386-443) | Same pattern (lines 2943-3001) | YES |
| companyId | `innerJoin(clients)` + `eq(clients.companyId)` (line 302) | Same pattern (line 2846) | YES |
| broadcastSync paths | `budget.list, budget.overview` | Same paths in TOOL_QUERY_MAP | YES |

### 13.7 `add_hotel_booking`

| Aspect | UI (`hotels.router.ts:82`) | Chatbot (`tool-executor.ts:2598`) | Match? |
|--------|----------------------------|-----------------------------------|--------|
| Transaction | `withTransaction` (line 151) | `withTransaction` (line 2693) | YES |
| Cascade: Accommodation | Auto-create/link accommodation by `hotelName` (lines 184-233) | Same pattern (lines 2720-2765) | YES |
| Cascade: Timeline | Check-in entry at 15:00 (lines 236-258) | Same pattern (lines 2767-2788) | YES |
| Default dates | `weddingDate - 1 day` / `+ 1 day` (lines 129-148) | Same pattern (lines 2664-2677) | YES |
| companyId | `eq(clients.companyId, ctx.companyId)` (line 108) | Same pattern (line 2630) | YES |
| broadcastSync paths | `hotels.list` | Same path in TOOL_QUERY_MAP | YES |

### 13.8 `create_client`

| Aspect | UI (`clients.router.ts:381`) | Chatbot (`tool-executor.ts:716`) | Match? |
|--------|------------------------------|----------------------------------|--------|
| Transaction | **None** — sequential try/catch blocks | `withTransaction` (line 746) | CHATBOT BETTER — atomic |
| Cascade: Event | Auto-creates "Main Wedding" event (lines 583-613) | Auto-creates main event | YES |
| Cascade: Budget | Auto-creates budget categories from `BUDGET_TEMPLATES[weddingType]` (lines 615-640) | Auto-creates budget categories | YES |
| Cascade: Vendors from CSV | Parses `"Category: Name"` format, creates vendor+clientVendor+budget per entry (lines 649-789) | Same pattern (lines 836-908) | YES |
| companyId | `companyId: effectiveCompanyId` at insert (line 543) | `companyId: ctx.companyId!` | YES |
| broadcastSync paths | **None** | `clients.list` in TOOL_QUERY_MAP | CHATBOT BETTER |

### 13.9 Parity Summary

| Mutation | Full Parity? | Gap |
|----------|-------------|-----|
| `add_guest` | YES | Minor: fewer input fields in chatbot |
| `update_guest_rsvp` | PARTIAL | Chatbot lacks transaction wrapper; conditional companyId check |
| `create_event` | YES | — |
| `update_event` | YES | — |
| `add_vendor` | YES | Chatbot invalidates more query paths (better) |
| `update_budget_item` | YES | — |
| `add_hotel_booking` | YES | — |
| `create_client` | YES | Chatbot is more atomic (withTransaction vs sequential) |

---

## 14. Cross-Session References

### 14.1 Session 1 (M-07): `chatbot_messages.companyId`

**Question:** Is `companyId` populated on chatbot message records?

**Answer:** `companyId` is NOT stored on individual `chatbot_messages` rows. The `saveMessage` procedure (`chatbot.router.ts:858-894`) stores only: `conversationId`, `role`, `content`, `toolName`, `toolArgs`, `toolResult`, `status`. Tenant isolation for messages is inherited from the parent `chatbot_conversations` row, which does store `companyId` (set during `createConversation` at lines 702-707). This is acceptable because messages are always accessed via their conversation, which is already tenant-scoped.

### 14.2 Session 2 (Section 10.6): Missing delete tools

**Confirmed and fixed in Round 6.** 6 delete tools added: `delete_guest`, `delete_event`, `delete_vendor`, `delete_budget_item`, `delete_timeline_item`, `delete_gift`. All with proper cascade matching UI router patterns.

### 14.3 Session 2: `executeCreateEvent` no transaction

**Confirmed and fixed in Round 1 (S5-C01).** Was raw `db.insert`, now `withTransaction` with full timeline auto-creation from templates.

### 14.4 Session 3: `normalizeRsvpStatus` not used

**Confirmed and fixed in Round 5 (S5-M01, S5-M02, S5-L06).** Now imported and called in `executeAddGuest` (line 1503), `executeUpdateGuestRsvp` (line 1641), and `executeBulkUpdateGuests` (line 1788).

### 14.5 Session 3: `normalizeGuestSide` used but partial

**Confirmed and fixed in Round 5 (S5-M03).** `executeAddGuest` now reads `client.planningSide` (line 1538) and resolves `'mutual'` guests using `normalizeGuestSide(client.planningSide)` (lines 1554-1556).

---

## 15. Danger Zones — Read Before Editing

Rules derived from actual patterns found during the Session 5 audit. Violating any of these will likely cause bugs, data inconsistency, or security regressions.

### Rule 1: Every new mutation tool requires 5 file changes
If you add a new mutation tool, you MUST update ALL of: `schemas.ts` (Zod schema + type export), `definitions.ts` (TOOL_METADATA + CHATBOT_TOOLS entry), `tool-executor.ts` (dispatcher case + execute* function), `query-invalidation-map.ts` (TOOL_QUERY_MAP entry), and `chatbot-system.ts` (Available Tools Reference). Missing any one will cause silent failures.

### Rule 2: Every new query tool requires `isQueryOnlyTool` update
If you add a new query tool, you MUST add it to the `isQueryOnlyTool` list in `query-invalidation-map.ts:106-125`. Missing this will cause the tool to trigger unnecessary cache invalidation broadcasts.

### Rule 3: Never use raw `db.insert`/`db.update`/`db.delete` for multi-table operations
All execute* functions that touch more than one table MUST use `withTransaction` from `transaction-wrapper.ts`. Raw Drizzle calls without transactions were the root cause of 4 critical findings (S5-C01 through S5-C04). The `withTransaction` wrapper provides deadlock retry with exponential backoff.

### Rule 4: Every `execute*` function must enforce `companyId`
Every executor function MUST verify `ctx.companyId` against the target data, either via direct `WHERE companyId = ctx.companyId!` or via `innerJoin(clients)` with `eq(clients.companyId, ctx.companyId!)`. Three functions currently lack this (S5-M09, S5-M10, S5-M11) — do not add more.

### Rule 5: The SSE route is OUTSIDE tRPC — auth changes must apply to BOTH
`stream/route.ts` uses `getServerSession()` directly (line 36), not tRPC's `protectedProcedure`. Any auth pattern change (e.g., new role checks, IP allowlists) must be applied to both `chatbot.router.ts` AND `stream/route.ts` independently.

### Rule 6: System prompt must be updated when tools change
`chatbot-system.ts` contains a hardcoded Available Tools Reference that the LLM reads to decide which tools to call. If you add/remove/rename a tool without updating the prompt, the LLM will either not know about the tool or hallucinate calls to removed tools.

### Rule 7: TOOL_QUERY_MAP paths must match real tRPC procedure names
Query paths in `TOOL_QUERY_MAP` (e.g., `guests.list`, `budget.overview`) are broadcast to clients for cache invalidation. They must exactly match the tRPC router procedure names. Using phantom names (the Round 2 bug with 30 wrong paths) causes silent cache staleness.

### Rule 8: Entity resolver `companyId` parameter must always be passed
`resolveGuest()` and `resolveEvent()` accept `companyId` as optional. Always pass `ctx.companyId!` from execute* functions. Omitting it skips the tenant validation pre-check, allowing cross-tenant entity resolution.

### Rule 9: Enum values from LLM must be normalized at ingestion
The LLM may send RSVP values like `'attending'`, `'yes'`, `'not attending'` instead of the DB enum values `'confirmed'`, `'declined'`, `'pending'`. Always call `normalizeRsvpStatus()` before writing to the database. Same for guest side values — always call `normalizeGuestSide()`.

### Rule 10: Delete tools must cascade in the same order as UI routers
When adding new delete tools, read the corresponding UI router's delete procedure first and match its cascade order exactly. The chatbot's delete cascade must be a superset of (or equal to) the UI's cascade. Missing a cascade step leaves orphaned records.

### Rule 11: `broadcastSync` failures must NEVER block or throw
The catch block in `executeToolWithSync` (line 596) must remain non-fatal. The DB mutation has already committed. Throwing from the sync path would cause the user to see an error despite their data being saved, leading to confusion and duplicate retry attempts.

### Rule 12: New schemas must not include columns that don't exist in the DB
The Session 5 `dressCode` bug (S5-M04) happened because the Zod schema and OpenAI definition included a field (`dressCode`) that has no corresponding column in the `events` table. Always verify field existence against `schema-features.ts` before adding to chatbot schemas.

### Rule 13: `addGuestSchema` optional fields must flow through to `cascadeGuestSideEffects`
If you add new optional fields to the guest creation schema (e.g., new hotel detail fields), they must be explicitly passed to the `cascadeGuestSideEffects` call in `executeAddGuest` (line 1591). The Round 1 fix (S5-H08) found that all hotel/transport fields were being passed as `null`, making the cascade dead code.

### Rule 14: The `chatbot_pending_calls` table is UNLOGGED
This means data is lost on PostgreSQL crash (not clean restart). Never store anything in this table that cannot be regenerated. The 5-minute TTL makes this acceptable for confirmation flows, but do not repurpose this table for long-lived data.

---

## 16. Known Remaining Issues

### 16.1 Deferred Type Safety Issues

These are pervasive patterns that would require large-scale refactoring:

| Issue | Scope | Risk | Recommendation |
|-------|-------|------|----------------|
| `catch (error: any)` | ~50 catch blocks | Low (runtime safe) | Migrate to `catch (error: unknown)` with `error instanceof Error ? error.message : String(error)` |
| `tx: any` in transaction params | ~15 occurrences | Low (runtime safe) | Use `TransactionClient` type from `transaction-wrapper.ts` |
| `as` type casts on args | ~200 occurrences | Medium (silent type errors) | Parse with Zod schema per tool before accessing args |
| `ctx.companyId` null narrowing | ~10 occurrences inside callbacks | Low (guarded at entry) | Capture `const companyId = ctx.companyId!` before callback |

### 16.2 Indirect companyId Checks

Three functions rely on clientId resolution (which filters by companyId) rather than direct companyId enforcement:
- `executeUpdateGift` (line 5217)
- `executeUpdateCreative` (line 5285)
- `executeUpdateWebsite` (line 5765)

**Mitigation:** clientId is always resolved via entity resolver which filters by companyId. Direct raw clientId bypass would require compromised frontend. Low risk but should be hardened.

### 16.3 Gift Dual-Table Pattern

The chatbot creates gifts in `giftsEnhanced` while the UI creates in `gifts`. The `executeDeleteGift` function handles this with a dual-table lookup (tries `giftsEnhanced` first, falls back to `gifts`). This should be unified once the `gifts` → `giftsEnhanced` migration is complete.

### 16.4 Missing Frontend Audit

The chatbot UI components (`ChatPanel`, `ChatMessage`, `useChatbot` hook, etc.) were not audited in Session 5. React hook dependency arrays, `'use client'` directives, and error boundary coverage should be verified in a future session.

---

## 17. Quick Reference / Cheat Sheet

### Adding a New Tool

1. **Schema** (`schemas.ts`): Add Zod schema + export type
2. **Definition** (`definitions.ts`): Add TOOL_METADATA entry + CHATBOT_TOOLS OpenAI function definition
3. **Executor** (`tool-executor.ts`): Add case to `executeTool()` switch + `execute*` function
4. **Invalidation** (`query-invalidation-map.ts`): Add entry to TOOL_QUERY_MAP (if mutation)
5. **System prompt** (`chatbot-system.ts`): Add to Available Tools Reference section
6. **Verify**: `npx tsc --noEmit` must pass

### Key Function Signatures

```typescript
// Dispatcher — tool-executor.ts:350
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: Context & { companyId: string | null; userId: string }
): Promise<{ success: boolean; data?: unknown; error?: string }>

// Sync wrapper — tool-executor.ts:554
export async function executeToolWithSync(
  toolName: string,
  args: Record<string, unknown>,
  ctx: Context & { companyId: string | null; userId: string }
): Promise<{ success: boolean; data?: unknown; error?: string }>

// Preview generator — tool-executor.ts:132
export async function generateToolPreview(
  toolName: string,
  args: Record<string, unknown>,
  ctx: Context
): Promise<{ preview: string; cascadeEffects: string[]; warnings: string[] }>

// Entity resolution — entity-resolver.ts
export async function resolveClient(name: string, companyId: string): Promise<EntityResolutionResult>
export async function resolveGuest(name: string, clientId: string, companyId: string): Promise<EntityResolutionResult>
export async function resolveVendor(name: string, companyId: string): Promise<EntityResolutionResult>
export async function resolveEvent(query: string, clientId: string, companyId: string): Promise<EntityResolutionResult>

// Context builder — context-builder.ts:672
export async function buildChatbotContext(ctx: {
  userId: string; companyId: string; clientId?: string
}): Promise<ChatbotContext>

// System prompt — chatbot-system.ts:252
export function buildChatbotSystemPrompt(context: ChatbotContext): string

// Transaction — transaction-wrapper.ts:100
export async function withTransaction<T>(
  fn: (tx: TransactionClient) => Promise<T>,
  options?: { maxRetries?: number; retryDelayMs?: number }
): Promise<T>
```

### Database Tables (schema-chatbot.ts)

| Table | Purpose | Key Feature |
|-------|---------|-------------|
| `chatbot_conversations` | Conversation threads | Scoped by companyId + userId |
| `chatbot_messages` | Individual messages | FK cascade delete on conversation |
| `chatbot_command_templates` | Saved command templates | Pinnable, usage tracking |
| `chatbot_pending_calls` | Mutation confirmation queue | UNLOGGED table, 5-min TTL |

### Enum Normalization Functions

```typescript
// @/lib/constants/enums

normalizeRsvpStatus(raw: string): string
// 'attending' | 'yes' → 'confirmed'
// 'not attending' | 'no' → 'declined'
// 'maybe' | 'tentative' → 'pending'

normalizeGuestSide(raw: string): string
// 'bride' → 'partner1'
// 'groom' → 'partner2'
// 'both' | 'shared' → 'mutual'
```

### File Quick-Jump

| Need to... | Go to |
|------------|-------|
| Add/modify a tool schema | `schemas.ts` |
| Add/modify OpenAI tool definition | `definitions.ts` |
| Add/modify tool execution logic | `tool-executor.ts` → `executeTool()` switch (line 375) |
| Add cache invalidation for a tool | `query-invalidation-map.ts` → `TOOL_QUERY_MAP` (line 18) |
| Modify LLM system prompt | `chatbot-system.ts` → `CORE_SYSTEM_PROMPT` (line 17) |
| Modify fuzzy matching behavior | `entity-resolver.ts` |
| Modify LLM context injection | `context-builder.ts` → `buildChatbotContext()` (line 672) |
| Modify pending call TTL/storage | `pending-calls.ts` |
| Modify transaction retry behavior | `transaction-wrapper.ts` → `withTransaction()` (line 100) |
| Add a new tRPC procedure | `chatbot.router.ts` |
| Modify SSE streaming | `stream/route.ts` |
| Modify DB schema | `schema-chatbot.ts` |

---

*End of Session 5 Audit Document*
