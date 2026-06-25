/**
 * C4 — Real-time for NEW and EXISTING entities, asserted by RUNNING the real chain.
 *
 * A mutation publishes (broadcastSync → Redis/SRH) the correct queryPaths that the other
 * tab's useRealtimeSync would consume. Asserted via the SAME getMissedActions consume
 * path the SSE client uses (single-subscriber, real chain — no mock).
 *   4.1 NEW entity (just-created guest)   → guests.* paths delivered
 *   4.2 EXISTING entity (seeded budget)   → budget paths delivered
 *   4.3 broadcastSync is best-effort — the mutation persists regardless.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import ExcelJS from 'exceljs';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { IDS, resetDeterministic, teardownTenant } from '@/test-support/seed/deterministic-seed';
import { callerFor } from '@/test-support/audit-caller';
import { clearSync, readSyncPaths } from '@/test-support/redis-sync-probe';

const caller = callerFor({ companyId: IDS.companyId, userId: IDS.userId });

describe('C4 realtime new + existing', () => {
  beforeAll(async () => {
    await resetDeterministic();
  });
  afterAll(async () => {
    await teardownTenant(IDS.companyId);
    await clearSync(IDS.companyId);
  });

  it('4.1 NEW entity broadcast — creating a guest delivers guests.* paths', async () => {
    await clearSync(IDS.companyId);
    const created = await caller.guests.create({ clientId: IDS.clientId, name: 'Realtime New' });
    expect(created).toBeTruthy();
    const paths = await readSyncPaths(IDS.companyId);
    expect(paths.some((p) => p.startsWith('guests.')), `got ${JSON.stringify(paths)}`).toBe(true);
  });

  it('4.2 EXISTING entity broadcast — editing the seeded budget delivers budget paths', async () => {
    await clearSync(IDS.companyId);
    // minimal 1-row budget edit file for the existing seeded item
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Budget');
    ws.addRow(['ID', 'Item', 'Category', 'Estimated Cost']);
    ws.addRow([IDS.budgetId, 'Venue Hire', 'venue', 1234]);
    const fileData = Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer).toString('base64');

    const res = await caller.import.importData({ module: 'budget', clientId: IDS.clientId, fileData });
    expect(res.updated).toBeGreaterThanOrEqual(1);

    const paths = await readSyncPaths(IDS.companyId);
    expect(paths.some((p) => p.startsWith('budget.')), `got ${JSON.stringify(paths)}`).toBe(true);

    // 4.3 best-effort: the DB write persisted (broadcast never blocks the mutation)
    const row = (await db.execute(
      sql`SELECT estimated_cost FROM budget WHERE id = ${IDS.budgetId}`,
    )) as unknown as Array<{ estimated_cost: string }>;
    expect(Number(row[0].estimated_cost)).toBe(1234);
  });
});
