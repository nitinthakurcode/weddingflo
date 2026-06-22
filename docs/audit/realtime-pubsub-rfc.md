# RFC: Real-time sync — from REST polling to event-driven pub/sub

> Status: proposed · Owner: TBD · Prereq for "scales to millions"

## Problem (fact-based)
Real-time sync currently **polls** Redis. Each open SSE connection runs
`subscribeToCompany()` (`src/lib/realtime/redis-pubsub.ts`) which calls
`getMissedActions()` on an interval. Today that's the Upstash **REST** API
(`@upstash/redis`), which has no persistent pub/sub — so cost scales with the
number of *connections*, not the number of *events*.

- Steady-state Redis ops ≈ `connections / interval`.
- At 10k concurrent connections × 300ms → **~33k ops/s**, which exceeds typical
  Upstash REST throughput and degrades for everyone.
- **Already shipped mitigation** (this branch): adaptive backoff (300ms when
  active → 2s when idle) cuts idle steady-state ~5–10×. That buys headroom; it
  does **not** remove the O(connections) ceiling.

The proper fix is **event-driven**: cost should scale with *events*, not
*connections*.

## Options

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. Redis TCP pub/sub (ioredis)** | Connect to Upstash's `rediss://` endpoint; `PUBLISH` in `broadcastSync`, `SUBSCRIBE` per company in the stream | Minimal model change; reuses Redis; true push (no polling) | One persistent TCP conn per app instance per channel-set; Upstash TCP pricing/limits; need connection lifecycle mgmt |
| **B. Postgres LISTEN/NOTIFY** | `NOTIFY sync_<company>` in the same tx; `LISTEN` on a dedicated pg connection | No extra infra (already on Postgres); transactional with the write | LISTEN holds a pg connection; payload size limit (8KB); doesn't fan out across many app instances without care |
| **C. Managed realtime (Ably / Pusher / Supabase Realtime)** | Publish to the provider; clients subscribe directly | Offloads scale/ops entirely; presence, history, global edge | New vendor + cost; client SDK change; data leaves Redis |

## Recommendation
**Option A (Redis TCP pub/sub)** as the primary, because it's the smallest
change to the current model and keeps one system (Redis). Keep the polling path
as the **fallback** behind a flag so rollout is safe and reversible.

## Migration plan (incremental, reversible)
1. **Add infra**: provision the Upstash TCP endpoint; set `REDIS_TCP_URL`
   (`rediss://…`). Add `ioredis`.
2. **New transport module** `src/lib/realtime/redis-pubsub-tcp.ts`:
   - `publishSyncAction(action)` → `PUBLISH sync:{companyId}` (called from
     `broadcastSync`, in addition to the existing sorted-set store used for
     offline catch-up).
   - `subscribeToCompanyTcp(companyId, signal)` → async generator backed by a
     shared `ioredis` subscriber (one connection, multiplexed channels via
     pattern `psubscribe sync:*` or per-company `subscribe`).
3. **Flag**: `REALTIME_TRANSPORT = 'poll' | 'pubsub'` (default `poll`). The SSE
   stream + `broadcastSync` pick the transport. Keep the sorted-set store for
   missed-action replay on reconnect either way.
4. **Connection lifecycle**: one subscriber connection per app instance;
   reference-count channels; reconnect with backoff; on reconnect, replay missed
   actions from the sorted set (existing logic) so no events are lost.
5. **Cutover**: enable `pubsub` in staging → load test → enable in prod.
6. **Cleanup**: once stable, the poll path stays only as an emergency fallback.

## Files touched
- `src/lib/realtime/broadcast-sync.ts` (publish alongside store)
- `src/lib/realtime/redis-pubsub.ts` (keep poll path; route by flag)
- `src/lib/realtime/redis-pubsub-tcp.ts` (new)
- `src/server/trpc/routers/sync.router.ts` (select transport)
- env: `REDIS_TCP_URL`, `REALTIME_TRANSPORT`

## Load-test plan (MUST precede enabling pubsub in prod)
- Tool: k6 or Artillery against a staging deploy.
- Scenarios: ramp 1k → 10k → 50k concurrent SSE subscribers; sustained writes at
  realistic rates (e.g. 50 events/s/company across N companies).
- Measure: Redis ops/s and connection count, event delivery p50/p95/p99 latency,
  app memory/CPU, dropped/duplicated events on reconnect.
- Pass criteria: delivery p95 < 1s at target concurrency; Redis ops scale with
  *events*, not *connections*; zero lost events across forced reconnects.

## Out of scope (separate roadmap items)
List-endpoint **pagination** (guests/budget/vendors return all rows per client),
CDN for assets, read replicas, and full-text search — all noted in
`docs/audit/pending-work-backlog.md`.
