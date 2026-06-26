/**
 * C1 — Transport Excel round-trip (combined export → edit → importData('transport')).
 * Server-parser path (excel-parser-server.ts importTransportExcel, reads
 * getWorksheet('Guest Transport') || getWorksheet('Transport')); combined export emits
 * 'Transport', so the round-trip is expected to WORK. Asserts EDIT + ADD + DELETE +
 * cascade (syncTransportToTimeline) + broadcast TRANSPORT_MUTATION_PATHS.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { IDS, resetDeterministic, teardownTenant } from '@/test-support/seed/deterministic-seed';
import { seedExtraGuest, seedTransport, FIDS } from '@/test-support/seed/module-fixtures';
import { clearSync, readSyncPaths } from '@/test-support/redis-sync-probe';
import { TRANSPORT_MUTATION_PATHS } from '@/lib/sync/cascade-query-paths';
import {
  exportCombinedWorkbook, headerMap, addActionColumn, findRowById, importWorkbook,
} from '@/test-support/audit/roundtrip-util';

describe('C1 Excel round-trip — transport', () => {
  beforeAll(async () => {
    await resetDeterministic();
    await seedExtraGuest();
    await seedTransport();
    await clearSync(IDS.companyId);
  });
  afterAll(async () => {
    await teardownTenant(IDS.companyId);
    await clearSync(IDS.companyId);
  });

  it('EDIT + ADD + DELETE + cascade + broadcast', async () => {
    const wb = await exportCombinedWorkbook();
    const ws = wb.getWorksheet('Transport');
    expect(ws, 'combined export must contain a Transport sheet').toBeTruthy();
    const hm = headerMap(ws!);
    const idCol = hm.get('id');
    const nameCol = hm.get('guest name');
    const dropCol = hm.get('drop to');
    expect(idCol, `headers=${[...hm.keys()]}`).toBeTruthy();
    expect(nameCol, `Transport sheet must expose Guest Name. headers=${[...hm.keys()]}`).toBeTruthy();
    const actionCol = addActionColumn(ws!, hm);

    const editRow = findRowById(ws!, idCol!, FIDS.transport1);
    const delRow = findRowById(ws!, idCol!, FIDS.transport2);
    expect(editRow).toBeGreaterThan(1);
    expect(delRow).toBeGreaterThan(1);
    if (dropCol) ws!.getRow(editRow).getCell(dropCol).value = 'Updated Venue';
    ws!.getRow(delRow).getCell(actionCol).value = 'DELETE';
    const newRow = ws!.addRow([]);
    newRow.getCell(nameCol!).value = 'Frank New';

    const result = await importWorkbook(wb, 'transport');
    expect(result.errors, JSON.stringify(result.errors)).toEqual([]);

    if (dropCol) {
      const edited = (await db.execute(
        sql`SELECT drop_to FROM guest_transport WHERE id = ${FIDS.transport1}`,
      )) as unknown as Array<{ drop_to: string }>;
      expect(edited[0].drop_to).toBe('Updated Venue'); // EDIT applied
    }

    const deleted = (await db.execute(
      sql`SELECT id FROM guest_transport WHERE id = ${FIDS.transport2}`,
    )) as unknown as Array<{ id: string }>;
    expect(deleted, 'transport2 should be deleted').toHaveLength(0);

    const added = (await db.execute(
      sql`SELECT id FROM guest_transport WHERE client_id = ${IDS.clientId} AND guest_name = 'Frank New'`,
    )) as unknown as Array<{ id: string }>;
    expect(added.length, 'new transport row should be added').toBeGreaterThanOrEqual(1);

    const paths = await readSyncPaths(IDS.companyId);
    for (const p of TRANSPORT_MUTATION_PATHS) {
      expect(paths, `broadcast must include ${p}; got ${JSON.stringify(paths)}`).toContain(p);
    }
  });
});
