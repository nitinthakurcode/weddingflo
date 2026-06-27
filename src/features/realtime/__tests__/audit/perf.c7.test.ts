/**
 * C7 — Tiered performance SLO, MEASURED on the real stack (P95; record P50/P95).
 *
 *  T1 interactive mutation ack          P95 < 500 ms   (server-side, primary gate)
 *  T2 PUBLISH/enqueue latency (mutation→broadcast→read-back) P95 < 2 s  (real
 *      broadcastSync→Redis→SRH chain). NOTE [H1]: broadcastSync is awaited INSIDE the
 *      mutation, so the action is already in Redis before the probe's first poll — this
 *      measures PUBLISH latency, NOT cross-tab DELIVERY. True end-to-end delivery (a second
 *      actor consuming the live subscribeToCompany stream) is measured by the authoritative
 *      perf-t2-crosstab.c7.test.ts (P50 ~305ms / P95 ~307ms). This number is kept only as a
 *      cheap publish-latency ceiling; do not read it as the propagation SLO.
 *  T3 23-table client cascade delete    MEASURE then classify (blocking → ceiling < 2 s)
 *      on a freshly-seeded AND a legacy back-filled client.
 *
 * Polls until settled — never fixed sleeps for the assertion itself.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { IDS, resetDeterministic, teardownTenant } from '@/test-support/seed/deterministic-seed';
import { callerFor } from '@/test-support/audit-caller';
import { clearSync, readSyncActions } from '@/test-support/redis-sync-probe';

const caller = callerFor({ companyId: IDS.companyId, userId: IDS.userId });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function pct(values: number[], p: number): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}
function report(tier: string, xs: number[]) {
  // eslint-disable-next-line no-console
  console.log(`[C7 ${tier}] n=${xs.length} P50=${Math.round(pct(xs, 50))}ms P95=${Math.round(pct(xs, 95))}ms max=${Math.round(Math.max(...xs))}ms`);
}

describe('C7 tiered performance SLO', () => {
  beforeAll(async () => {
    await resetDeterministic();
    await clearSync(IDS.companyId);
  });
  afterAll(async () => {
    await teardownTenant(IDS.companyId);
    await clearSync(IDS.companyId);
  });

  it('T1 mutation ack P95 < 500ms', async () => {
    const xs: number[] = [];
    for (let i = 0; i < 12; i++) {
      const t0 = performance.now();
      await caller.guests.create({ clientId: IDS.clientId, name: `Perf Guest ${i}` });
      xs.push(performance.now() - t0);
    }
    report('T1 ack', xs);
    expect(pct(xs, 95)).toBeLessThan(500);
  });

  // [H1] PUBLISH-latency ceiling only — broadcastSync is awaited inside create(), so the
  // action is in Redis before the first poll. True cross-tab DELIVERY is perf-t2-crosstab.c7.
  it('T2 publish/enqueue latency P95 < 2s (real broadcast→Redis read-back)', async () => {
    const xs: number[] = [];
    for (let i = 0; i < 6; i++) {
      await clearSync(IDS.companyId);
      const t0 = performance.now();
      await caller.guests.create({ clientId: IDS.clientId, name: `Propagate ${i}` });
      // read back via the real client path, polled at the ~300ms active cadence
      let delivered = -1;
      for (let waited = 0; waited <= 2500; waited += 300) {
        const actions = await readSyncActions(IDS.companyId);
        if (actions.some((a) => (a.queryPaths ?? []).some((p) => p.startsWith('guests.')))) {
          delivered = performance.now() - t0;
          break;
        }
        await sleep(300);
      }
      expect(delivered, 'guest mutation must propagate within 2.5s window').toBeGreaterThan(0);
      xs.push(delivered);
    }
    report('T2 publish/enqueue', xs);
    expect(pct(xs, 95)).toBeLessThan(2000);
  });

  it('T3 23-table cascade delete — measure then classify (blocking ceiling < 2s)', async () => {
    const results: Record<string, number> = {};
    for (const which of ['fresh', 'legacy'] as const) {
      await resetDeterministic();
      const targetId = which === 'fresh' ? IDS.clientId : IDS.legacyClientId;
      const t0 = performance.now();
      await caller.clients.delete({ id: targetId });
      results[which] = performance.now() - t0;
    }
    report('T3 cascade', [results.fresh, results.legacy]);
    // Synchronous (blocking) delete → classify under the < 2s blocking ceiling.
    expect(results.fresh).toBeLessThan(2000);
    expect(results.legacy).toBeLessThan(2000);
  });
});
