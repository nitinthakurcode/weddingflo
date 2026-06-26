/**
 * C1 / E1 — Events Excel round-trip. As of Cluster E, events ARE part of the combined client
 * export (export-utils.ts emits an Events sheet from the SSOT shape — the first test below
 * proves the combined round-trip). The dedicated downloadTemplate('events') path is also
 * covered.
 *
 * Server-parser path (excel-parser-server.ts importEventsExcel, reads getWorksheet('Events')).
 * Asserts EDIT (by ID) + ADD + cascade (syncEventsToTimeline writes sourceModule='events'
 * timeline rows) + broadcast EVENT_MUTATION_PATHS.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import ExcelJS from 'exceljs';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { IDS, resetDeterministic, teardownTenant } from '@/test-support/seed/deterministic-seed';
import { clearSync, readSyncPaths } from '@/test-support/redis-sync-probe';
import { EVENT_MUTATION_PATHS } from '@/lib/sync/cascade-query-paths';
import {
  caller, exportCombinedWorkbook, headerMap, addActionColumn, findRowById, importWorkbook,
} from '@/test-support/audit/roundtrip-util';

async function eventsTemplate(): Promise<ExcelJS.Workbook> {
  const res = await caller.import.downloadTemplate({ module: 'events', clientId: IDS.clientId });
  const buf = Buffer.from(res.data, 'base64');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
  return wb;
}

describe('C1 Excel round-trip — events (via template)', () => {
  beforeAll(async () => {
    await resetDeterministic();
    await clearSync(IDS.companyId);
  });
  afterAll(async () => {
    await teardownTenant(IDS.companyId);
    await clearSync(IDS.companyId);
  });

  it('FIXED (E1): events are in the combined export and round-trip from it (EDIT by ID)', async () => {
    // [E1] Events were absent from the combined client export → no combined round-trip.
    // They are now emitted from the SSOT shape and consumed by importData('events').
    const wb = await exportCombinedWorkbook();
    const ws = wb.getWorksheet('Events');
    expect(ws, 'combined export must contain an Events sheet').toBeTruthy();
    const hm = headerMap(ws!);
    const idCol = hm.get('id')!;
    const titleCol = hm.get('title')!;
    expect(idCol, `combined Events must expose ID; headers=${[...hm.keys()]}`).toBeTruthy();
    expect(titleCol, `combined Events must expose Title; headers=${[...hm.keys()]}`).toBeTruthy();
    addActionColumn(ws!, hm);

    const editRow = findRowById(ws!, idCol, IDS.eventId);
    expect(editRow, 'combined Events sheet should contain the seeded event by ID').toBeGreaterThan(1);
    ws!.getRow(editRow).getCell(titleCol).value = 'Combined Event EDIT';

    const result = await importWorkbook(wb, 'events');
    expect(result.errors, JSON.stringify(result.errors)).toEqual([]);

    const edited = (await db.execute(
      sql`SELECT title FROM events WHERE id = ${IDS.eventId}`,
    )) as unknown as Array<{ title: string }>;
    expect(edited[0]?.title, 'EDIT via combined Events sheet should apply').toBe('Combined Event EDIT');
  });

  it('downloadTemplate emits an Events sheet with ID + Title columns', async () => {
    const wb = await eventsTemplate();
    const ws = wb.getWorksheet('Events');
    expect(ws, 'events template must contain an Events sheet').toBeTruthy();
    const hm = headerMap(ws!);
    expect(hm.get('id'), `headers=${[...hm.keys()]}`).toBeTruthy();
    expect(hm.get('title'), `headers=${[...hm.keys()]}`).toBeTruthy();
  });

  it('EDIT (by ID) + ADD applies + cascades to timeline + broadcasts EVENT_MUTATION_PATHS', async () => {
    const wb = await eventsTemplate();
    const ws = wb.getWorksheet('Events')!;
    const hm = headerMap(ws);
    const idCol = hm.get('id')!;
    const titleCol = hm.get('title')!;
    const typeCol = hm.get('event type');
    const dateCol = hm.get('event date');
    addActionColumn(ws, hm);

    // EDIT the seeded "Main Wedding" event by its real ID.
    const editRow = ws.addRow([]);
    editRow.getCell(idCol).value = IDS.eventId;
    editRow.getCell(titleCol).value = 'Main Wedding RENAMED';
    if (typeCol) editRow.getCell(typeCol).value = 'wedding';
    if (dateCol) editRow.getCell(dateCol).value = '2027-06-15';

    // ADD a brand-new event.
    const addRow = ws.addRow([]);
    addRow.getCell(titleCol).value = 'Welcome Dinner';
    if (typeCol) addRow.getCell(typeCol).value = 'reception';
    if (dateCol) addRow.getCell(dateCol).value = '2027-06-14';

    const result = await importWorkbook(wb, 'events');
    expect(result.errors, JSON.stringify(result.errors)).toEqual([]);

    const edited = (await db.execute(
      sql`SELECT title FROM events WHERE id = ${IDS.eventId}`,
    )) as unknown as Array<{ title: string }>;
    expect(edited[0].title).toBe('Main Wedding RENAMED'); // EDIT applied by ID

    const added = (await db.execute(
      sql`SELECT id FROM events WHERE client_id = ${IDS.clientId} AND title = 'Welcome Dinner'`,
    )) as unknown as Array<{ id: string }>;
    expect(added.length, 'new event should be added').toBeGreaterThanOrEqual(1);

    // Cascade: syncEventsToTimeline produces timeline rows sourced from events.
    const tl = (await db.execute(
      sql`SELECT id FROM timeline WHERE client_id = ${IDS.clientId} AND source_module = 'events'`,
    )) as unknown as Array<{ id: string }>;
    expect(tl.length, 'events should sync into timeline').toBeGreaterThanOrEqual(1);

    const paths = await readSyncPaths(IDS.companyId);
    for (const p of EVENT_MUTATION_PATHS) {
      expect(paths, `broadcast must include ${p}; got ${JSON.stringify(paths)}`).toContain(p);
    }
  });
});
