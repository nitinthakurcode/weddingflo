/**
 * C7-T2 / C4 — TRUE cross-tab delivery latency (not the publish-only number).
 *
 * The Prompt-1 perf.c7 "T2" measured PUBLISH latency only (broadcast→Redis→read-back ~9ms),
 * because broadcastSync is awaited INSIDE the mutation before the probe reads (FINDINGS H1).
 * This test measures DELIVERY: a SECOND actor (client B) consumes the REAL live-stream
 * generator `subscribeToCompany` — the exact async generator `sync.onSync` Phase-2 yields to
 * every SSE subscriber (sync.router.ts:94) — while client A performs real mutations. We time
 * from mutation start to B receiving the sync action, across N iterations → P50/P95.
 *
 * What this includes: mutation (DB write) → broadcastSync (ZADD) → Redis/SRH → the real
 * adaptive poll in subscribeToCompany (MIN 300ms) → yield to B. What it does NOT include
 * (vs a real browser): the HTTP/SSE transport frame + React-Query invalidate/refetch/render.
 * The full two-browser Playwright variant is BLOCKED here (auth secrets absent from env —
 * see STATE/FINDINGS); this is the faithful server-side delivery measurement.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { IDS, resetDeterministic, teardownTenant } from '@/test-support/seed/deterministic-seed';
import { buildCtx } from '@/test-support/audit-caller';
import { clearSync } from '@/test-support/redis-sync-probe';
import { subscribeToCompany } from '@/lib/realtime/redis-pubsub';
import { executeToolWithSync } from '@/features/chatbot/server/services/tool-executor';

const ctx = buildCtx({ companyId: IDS.companyId, userId: IDS.userId });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

describe('C7-T2 true cross-tab delivery (real subscribeToCompany live-stream)', () => {
  beforeAll(async () => {
    await resetDeterministic();
    await clearSync(IDS.companyId);
  });
  afterAll(async () => {
    await teardownTenant(IDS.companyId);
    await clearSync(IDS.companyId);
  });

  it('mutation (client A) → delivery (client B) P50/P95 < 2s (T2)', async () => {
    const abort = new AbortController();
    let resolveNext: ((ts: number) => void) | null = null;

    // Client B: consume the SAME generator the SSE subscription yields.
    const consumer = (async () => {
      for await (const _action of subscribeToCompany(IDS.companyId, abort.signal)) {
        if (resolveNext) { resolveNext(performance.now()); resolveNext = null; }
      }
    })();

    // Let B's poll loop initialize (lastTimestamp = Date.now() at start).
    await sleep(400);

    const latencies: number[] = [];
    const N = 10;
    for (let i = 0; i < N; i++) {
      const received = new Promise<number>((res) => { resolveNext = res; });
      const t0 = performance.now();
      // Client A mutates (real broadcast on the live Redis/SRH chain).
      const r = await executeToolWithSync(
        'add_guest',
        { clientId: IDS.clientId, firstName: `T2_${i}`, lastName: 'Probe', rsvpStatus: 'pending' },
        ctx,
      );
      expect(r.success, JSON.stringify(r)).toBe(true);
      // Guard against a missed wakeup (poll could already be sleeping up to MAX backoff).
      const t1 = await Promise.race([received, sleep(3000).then(() => -1)]);
      expect(t1, `iteration ${i} timed out waiting for delivery`).toBeGreaterThan(0);
      latencies.push(t1 - t0);
    }

    abort.abort();
    await consumer.catch(() => {});

    const p50 = pct(latencies, 50);
    const p95 = pct(latencies, 95);
    // eslint-disable-next-line no-console
    console.log(`[C7-T2 true delivery] n=${N} P50=${p50.toFixed(0)}ms P95=${p95.toFixed(0)}ms ` +
      `min=${Math.min(...latencies).toFixed(0)} max=${Math.max(...latencies).toFixed(0)} ` +
      `(publish-only baseline was ~9ms; delivery adds one adaptive poll interval, MIN 300ms)`);

    // T2 budget: end-to-end propagation < 2s (hard gate). Target < 1.5s.
    expect(p95, `T2 P95 ${p95}ms over 2s budget`).toBeLessThan(2000);
    expect(p50, `T2 P50 ${p50}ms over 1.5s target`).toBeLessThan(1500);
  });
});
