/**
 * C1 — Timeline import. Timeline is NOT in importData's moduleTypes; its real import path
 * is timeline.bulkImport (staffProcedure), which the client-side excel-parser feeds. The
 * combined export's Timeline sheet is view-only (no ID/Action column), so the asserted
 * round-trip is the bulkImport contract: create/update/delete via _action + broadcast.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { IDS, resetDeterministic, teardownTenant } from '@/test-support/seed/deterministic-seed';
import { seedTimeline, FIDS } from '@/test-support/seed/module-fixtures';
import { callerFor } from '@/test-support/audit-caller';
import { clearSync, readSyncPaths } from '@/test-support/redis-sync-probe';

const caller = callerFor({ companyId: IDS.companyId, userId: IDS.userId });

describe('C1 Timeline bulkImport — create/update/delete + broadcast', () => {
  beforeAll(async () => {
    await resetDeterministic();
    await seedTimeline();
    await clearSync(IDS.companyId);
  });
  afterAll(async () => {
    await teardownTenant(IDS.companyId);
    await clearSync(IDS.companyId);
  });

  it('UPDATE + DELETE + CREATE via _action', async () => {
    const result = await caller.timeline.bulkImport({
      clientId: IDS.clientId,
      items: [
        { id: FIDS.timeline1, title: 'Ceremony (revised)', _action: 'update', date: '2026-06-25', startTime: '10:00' },
        { id: FIDS.timeline2, title: 'Reception', _action: 'delete' },
        { title: 'After Party', _action: 'create', date: '2026-06-25', startTime: '22:00', location: 'Rooftop' },
      ],
    });
    expect(result, JSON.stringify(result)).toBeTruthy();

    const updated = (await db.execute(
      sql`SELECT title FROM timeline WHERE id = ${FIDS.timeline1}`,
    )) as unknown as Array<{ title: string }>;
    expect(updated[0].title).toBe('Ceremony (revised)'); // UPDATE applied

    const deleted = (await db.execute(
      sql`SELECT id, deleted_at FROM timeline WHERE id = ${FIDS.timeline2}`,
    )) as unknown as Array<{ id: string; deleted_at: string | null }>;
    // timeline supports soft delete; accept either hard-removed or soft-deleted.
    expect(deleted.length === 0 || deleted[0].deleted_at !== null, 'timeline2 should be deleted').toBe(true);

    const created = (await db.execute(
      sql`SELECT id FROM timeline WHERE client_id = ${IDS.clientId} AND title = 'After Party' AND deleted_at IS NULL`,
    )) as unknown as Array<{ id: string }>;
    expect(created.length, 'new timeline item should be created').toBeGreaterThanOrEqual(1);

    const paths = await readSyncPaths(IDS.companyId);
    for (const p of ['timeline.getAll', 'timeline.getStats']) {
      expect(paths, `broadcast must include ${p}; got ${JSON.stringify(paths)}`).toContain(p);
    }
  });
});
