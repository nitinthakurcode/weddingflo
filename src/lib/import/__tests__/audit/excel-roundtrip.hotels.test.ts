/**
 * C1 — Hotels Excel round-trip (combined export → edit → importData('hotels')).
 * Server-parser path (excel-parser-server.ts importHotelsExcel, reads getWorksheet('Hotels')),
 * so the combined-export round-trip is expected to WORK (unlike the inline modules).
 * Asserts EDIT + ADD + DELETE + non-destructive + cascade (syncHotelsToTimeline) + broadcast.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { IDS, resetDeterministic, teardownTenant } from '@/test-support/seed/deterministic-seed';
import { seedExtraGuest, seedHotels, FIDS } from '@/test-support/seed/module-fixtures';
import { clearSync, readSyncPaths } from '@/test-support/redis-sync-probe';
import { HOTEL_MUTATION_PATHS } from '@/lib/sync/cascade-query-paths';
import {
  exportCombinedWorkbook, headerMap, addActionColumn, findRowById, importWorkbook,
} from '@/test-support/audit/roundtrip-util';

describe('C1 Excel round-trip — hotels', () => {
  beforeAll(async () => {
    await resetDeterministic();
    await seedExtraGuest();
    await seedHotels();
    await clearSync(IDS.companyId);
  });
  afterAll(async () => {
    await teardownTenant(IDS.companyId);
    await clearSync(IDS.companyId);
  });

  it('EDIT + ADD + DELETE + non-destructive + cascade + broadcast', async () => {
    const before = (await db.execute(
      sql`SELECT created_at FROM hotels WHERE id = ${FIDS.hotel1}`,
    )) as unknown as Array<{ created_at: string }>;
    const createdAtBefore = String(before[0].created_at);

    const wb = await exportCombinedWorkbook();
    const ws = wb.getWorksheet('Hotels');
    expect(ws, 'combined export must contain a Hotels sheet').toBeTruthy();
    const hm = headerMap(ws!);
    const idCol = hm.get('id');
    const nameCol = hm.get('guest name');
    const hotelCol = hm.get('hotel name');
    expect(idCol, `headers=${[...hm.keys()]}`).toBeTruthy();
    expect(nameCol, `Hotels sheet must expose Guest Name. headers=${[...hm.keys()]}`).toBeTruthy();
    expect(hotelCol, `Hotels sheet must expose Hotel Name. headers=${[...hm.keys()]}`).toBeTruthy();
    const actionCol = addActionColumn(ws!, hm);

    // EDIT hotel1 hotelName; DELETE hotel2; ADD a new room.
    const editRow = findRowById(ws!, idCol!, FIDS.hotel1);
    const delRow = findRowById(ws!, idCol!, FIDS.hotel2);
    expect(editRow).toBeGreaterThan(1);
    expect(delRow).toBeGreaterThan(1);
    ws!.getRow(editRow).getCell(hotelCol!).value = 'Grand Plaza DELUXE';
    ws!.getRow(delRow).getCell(actionCol).value = 'DELETE';
    const newRow = ws!.addRow([]);
    newRow.getCell(nameCol!).value = 'Frank New';
    newRow.getCell(hotelCol!).value = 'New Hotel';

    const result = await importWorkbook(wb, 'hotels');
    expect(result.errors, JSON.stringify(result.errors)).toEqual([]);

    const edited = (await db.execute(
      sql`SELECT hotel_name, created_at FROM hotels WHERE id = ${FIDS.hotel1}`,
    )) as unknown as Array<{ hotel_name: string; created_at: string }>;
    expect(edited[0].hotel_name).toBe('Grand Plaza DELUXE'); // EDIT applied
    expect(String(edited[0].created_at)).toBe(createdAtBefore); // NON-DESTRUCTIVE (absent col)

    const deleted = (await db.execute(
      sql`SELECT id FROM hotels WHERE id = ${FIDS.hotel2}`,
    )) as unknown as Array<{ id: string }>;
    expect(deleted, 'hotel2 should be deleted').toHaveLength(0);

    const added = (await db.execute(
      sql`SELECT id FROM hotels WHERE client_id = ${IDS.clientId} AND guest_name = 'Frank New'`,
    )) as unknown as Array<{ id: string }>;
    expect(added.length, 'new hotel row should be added').toBeGreaterThanOrEqual(1);

    const paths = await readSyncPaths(IDS.companyId);
    for (const p of HOTEL_MUTATION_PATHS) {
      expect(paths, `broadcast must include ${p}; got ${JSON.stringify(paths)}`).toContain(p);
    }
  });
});
