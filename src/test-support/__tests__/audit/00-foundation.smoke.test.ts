/**
 * Foundation smoke — proves the audit harness itself works before any concern test:
 *  • Rail-3 guard let us connect (setup would have thrown otherwise).
 *  • Deterministic seed inserts the FIXED tenant with the FIXED ids.
 *  • resetDeterministic() is idempotent (run twice → identical row counts, no residual).
 *  • Redis/SRH sync probe round-trips.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  IDS,
  resetDeterministic,
  seedDeterministic,
  teardownTenant,
} from '@/test-support/seed/deterministic-seed';
import { clearSync, readSyncPaths } from '@/test-support/redis-sync-probe';

async function tenantRowCount(): Promise<number> {
  const r = (await db.execute(
    sql`SELECT
          (SELECT count(*) FROM clients WHERE company_id = ${IDS.companyId}) +
          (SELECT count(*) FROM events  WHERE company_id = ${IDS.companyId}) +
          (SELECT count(*) FROM budget  WHERE company_id = ${IDS.companyId}) +
          (SELECT count(*) FROM guests  WHERE company_id = ${IDS.companyId}) AS n`,
  )) as unknown as Array<{ n: number | string }>;
  return Number(r[0].n);
}

describe('audit foundation', () => {
  beforeAll(async () => {
    await resetDeterministic();
  });
  afterAll(async () => {
    await teardownTenant(IDS.companyId);
    await clearSync(IDS.companyId);
  });

  it('seeds the FIXED tenant with FIXED ids', async () => {
    const client = (await db.execute(
      sql`SELECT id, partner1_first_name FROM clients WHERE id = ${IDS.clientId}`,
    )) as unknown as Array<{ id: string; partner1_first_name: string }>;
    expect(client).toHaveLength(1);
    expect(client[0].partner1_first_name).toBe('Ava');

    const b = (await db.execute(
      sql`SELECT estimated_cost FROM budget WHERE id = ${IDS.budgetId}`,
    )) as unknown as Array<{ estimated_cost: string }>;
    expect(Number(b[0].estimated_cost)).toBe(1000);
  });

  it('reset is idempotent — run twice, identical row counts, zero residual', async () => {
    const first = await tenantRowCount();
    await resetDeterministic();
    const second = await tenantRowCount();
    expect(second).toBe(first);
    // 2 clients + 2 events + 2 budget + 1 guest = 7
    expect(second).toBe(7);
  });

  it('Redis/SRH sync probe round-trips', async () => {
    await clearSync(IDS.companyId);
    const paths = await readSyncPaths(IDS.companyId);
    expect(Array.isArray(paths)).toBe(true);
    expect(paths).toHaveLength(0);
  });
});
