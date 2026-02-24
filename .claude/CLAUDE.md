### How to Use Project Documentation

This project has comprehensive documentation. Read what's relevant to your current task.

**Always loaded:** This file (mandatory rules and canonical paths below).

**Before making changes, read the relevant section of docs/DEVELOPER_HANDBOOK.md:**

- Changing any database table → Section B (Table Reference) + Section F (Change Propagation)
- Changing guest module → Section D.1 + Section E (Sync Matrix) + Section G (Headers)
- Changing budget module → Section D.2 + Section E + Section G
- Changing timeline or events → Section D.3-D.4 + Section E
- Changing vendors → Section D.5 + Section E + Section G
- Changing hotels or transport → Section D.6-D.7 + Section E + Section G
- Changing floor plans or gifts → Section D.8-D.9
- Changing clients module → Section D.10 + Section K (Data Loss Prevention)
- Changing Excel import/export → Section G (Header Mapping) + Section F
- Changing Google Sheets sync → Section G + the relevant module section in D
- Changing chatbot tools → Section J (Chatbot Architecture) + Section E (Sync Matrix)
- Changing auth or security → Section C (User Flows) + Section H (Security Model)
- Changing real-time sync → Section I (Real-Time Sync)
- Changing i18n → Section N
- Changing file uploads → Section O
- Changing payments or notifications → Section P
- Writing or fixing tests → Section Q
- Debugging any issue → Section L (Debugging Guide)
- Deploying → Read docs/DEPLOYMENT_RUNBOOK.md
- Understanding what was fixed in audit → Read docs/audit/session-8-final-report.md

When a change touches multiple areas (e.g. adding a guest field affects schema, router, Excel, Sheets, chatbot), read ALL relevant sections before starting.

---

# WeddingFlo Pro — Claude Code Rules

> Multilingual wedding planning SaaS.
> Stack: Next.js 16.1.6, tRPC 11, Drizzle ORM 0.45.1, BetterAuth 1.4.18, PostgreSQL, Upstash Redis, Cloudflare R2.
> Hosted: Hetzner VPS with Dokploy.

---

## Mandatory Rules

### Tenant Isolation
1. Every INSERT to a tenant-scoped table MUST include `companyId`.
2. New tenant-scoped tables need BOTH `companyId` column AND RLS policy.
3. Never make `companyId` nullable on tenant-scoped tables.

### Data Integrity
4. Every budget/guest mutation MUST call `recalcClientStats()`.
5. RSVP changes MUST call `recalcPerGuestBudgetItems()`.
6. Multi-table writes MUST use `withTransaction()`.
7. Normalize enums at ingestion: `normalizeRsvpStatus()`, `normalizeGuestSide()`.
8. Client delete is MANUAL 19-table cascade — new child tables must be added to `clients.router.ts`.
9. Soft-delete queries MUST filter `isNull(clients.deletedAt)`.

### Real-Time Sync
10. Every mutation that changes shared data MUST call `broadcastSync()` OUTSIDE the transaction.
11. `broadcastSync` failures must never block or throw.
12. Cascade sync functions are broadcast-blind — callers must include cascade queryPaths.
13. `recalcClientStats` callers must include `clients.list` + `clients.getAll` in broadcastSync.
14. queryPaths must match actual tRPC procedure names (see 18 canonical paths below).

### Auth & Routing
15. Never add `middleware.ts` — Next.js 16 uses `proxy.ts` for i18n only, no auth.
16. Never use deprecated `users` table — use BetterAuth `user` table.
17. Server auth: `getServerSession()` from `@/lib/auth/server`.
18. Client auth: `useAuth()` from `@/lib/auth-client`.
19. Server-only imports (db, redis) must NOT appear in client components.

### Schema & Migrations
20. Never run `drizzle-kit push` — always `drizzle-kit generate` then `drizzle-kit migrate`.
21. Always run `drizzle-kit check` before `drizzle-kit generate`.
22. Raw SQL migrations must have matching Drizzle schema updates.
23. Never use `CREATE INDEX CONCURRENTLY` in migrations (runs inside transactions).

### Chatbot
24. New chatbot tool requires 5 files: `schemas.ts`, `definitions.ts`, `tool-executor.ts`, `query-invalidation-map.ts`, `chatbot-system.ts`.
25. New query tool requires `isQueryOnlyTool` update in `query-invalidation-map.ts`.
26. SSE route (`/api/chatbot/stream/route.ts`) is outside tRPC — auth changes must apply to BOTH.
27. `TOOL_QUERY_MAP` paths must match real tRPC procedure names.

### Import/Export
28. All Excel imports must call `validateExcelFile()` first.
29. Server-side Excel imports must be in `excel-parser-server.ts`, not `excel-parser.ts`.

### Infrastructure
30. SSE connection manager uses increment-first pattern — do not reorder.
31. Floor plans router uses `db` not `ctx.db` for transactions.

### Adding a New Module (7 steps)
32. (1) broadcastSync in every mutation, (2) add module to SyncAction union, (3) add queryPaths matching tRPC names, (4) add to TOOL_QUERY_MAP, (5) add pattern to `getModuleFromToolName()`, (6) add to `getQueryPathsForModule()` if Sheets sync needed, (7) document cascade queryPaths.

---

## 18 Canonical queryPaths

```
budget.getAll        budget.getSummary     clients.getAll
clients.getById      clients.list          events.getAll
floorPlans.getById   floorPlans.list       gifts.getAll
gifts.getStats       guestTransport.getAll guests.getAll
guests.getStats      hotels.getAll         timeline.getAll
timeline.getStats    vendors.getAll        vendors.getStats
```

---

## Before Any Change

```bash
npx tsc --noEmit          # 0 errors
npx vitest run            # 307 passed, 8 skipped, 0 failed
npm run build             # All routes compile
npx drizzle-kit check     # "Everything's fine"
```

Read `docs/DEVELOPER_HANDBOOK.md` Section F for propagation checklist.

---

## Key Files

| File | Purpose |
|------|---------|
| `src/server/trpc/routers/_app.ts` | Main tRPC router (40+ sub-routers) |
| `src/lib/auth.ts` | BetterAuth server config |
| `src/lib/auth/server.ts` | `getServerSession()` |
| `src/lib/auth-client.ts` | Client auth hooks (`useAuth`, `signIn*`, `signOut*`) |
| `src/lib/db/index.ts` | Drizzle DB client |
| `src/lib/db/schema.ts` | Core auth schema |
| `src/lib/db/schema-features.ts` | All feature tables |
| `src/lib/realtime/broadcast-sync.ts` | `broadcastSync()` |
| `src/lib/sync/client-stats-sync.ts` | `recalcClientStats()` |
| `src/features/clients/server/routers/clients.router.ts` | Client CRUD + 19-table cascade delete |
| `src/features/guests/server/routers/guests.router.ts` | Guest CRUD + RSVP |
| `src/features/events/server/routers/vendors.router.ts` | Vendor CRUD + budget |
| `src/features/analytics/server/routers/budget.router.ts` | Budget mutations |
| `src/features/chatbot/server/services/tool-executor.ts` | Chatbot tool executor (5,946 lines) |
| `src/app/api/chatbot/stream/route.ts` | SSE streaming endpoint |
| `next.config.ts` | Next.js config + security headers |

---

## Reference Docs

- `docs/DEVELOPER_HANDBOOK.md` — Complete architecture, all flows, all patterns
- `docs/audit/session-8-final-report.md` — Final audit: 38 rules, coverage maps
- `docs/DEPLOYMENT_RUNBOOK.md` — Deployment procedures
- `.claude/WEDDINGFLOW_PERMANENT_STANDARDS.md` — Auth/Supabase/proxy patterns

---

## Environment Variables (Required)

```
DATABASE_URL                          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY             TOKEN_ENCRYPTION_KEY
BETTER_AUTH_SECRET                    UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN              GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET                  OPENAI_API_KEY
```
