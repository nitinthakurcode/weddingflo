/**
 * C1 — Guests Excel round-trip (combined export → edit → importData('guests')), asserted
 * by RUNNING the real export + import procedures, with cascade + broadcast assertions.
 *
 * Guests use the INLINE import path (import.router.ts ~:1090 importGuest) — NOT a server
 * parser — so this test also exercises two suspected defects:
 *   • D1   — inline importGuest does NOT call validateExcelFile() (CLAUDE rule 28).
 *   • SHEET-SELECT — the inline importer picks the FIRST non-INSTRUCTIONS worksheet
 *     (import.router.ts:936). In the combined export that is 'Cover', not 'Guests', so a
 *     combined-export round-trip cannot find the guest rows.
 *
 * Documents ACTUAL behavior. The intended (handbook) round-trip is the green target; where
 * the app is broken the test is marked RED via it.fails with a SPECIFIC assertion so an
 * unrelated throw cannot masquerade as the defect (FINDINGS H4).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { IDS, resetDeterministic, teardownTenant } from '@/test-support/seed/deterministic-seed';
import { seedExtraGuest, FIDS } from '@/test-support/seed/module-fixtures';
import { clearSync, readSyncPaths } from '@/test-support/redis-sync-probe';
import { GUEST_MUTATION_PATHS } from '@/lib/sync/cascade-query-paths';
import {
  exportCombinedWorkbook,
  headerMap,
  addActionColumn,
  findRowById,
  importWorkbook,
} from '@/test-support/audit/roundtrip-util';

describe('C1 Excel round-trip — guests (inline path)', () => {
  beforeAll(async () => {
    await resetDeterministic();
    await seedExtraGuest();
    await clearSync(IDS.companyId);
  });
  afterAll(async () => {
    await teardownTenant(IDS.companyId);
    await clearSync(IDS.companyId);
  });

  it('combined export contains a Guests sheet with the seeded guests + ID column', async () => {
    const wb = await exportCombinedWorkbook();
    const ws = wb.getWorksheet('Guests');
    expect(ws, 'combined export must contain a Guests sheet').toBeTruthy();
    const hm = headerMap(ws!);
    expect(hm.get('id'), `Guests sheet must expose an ID column. headers=${[...hm.keys()]}`).toBeTruthy();
    expect(hm.get('name'), `Guests sheet must expose a Name column. headers=${[...hm.keys()]}`).toBeTruthy();
    expect(findRowById(ws!, hm.get('id')!, IDS.guestId)).toBeGreaterThan(1);
    expect(findRowById(ws!, hm.get('id')!, FIDS.guest2)).toBeGreaterThan(1);
  });

  // DEFECT (documented deterministically — not it.fails, so H4 fragility can't apply).
  // The intended round-trip would EDIT Carol, DELETE Dave, ADD Eve. The inline importer
  // selects 'Cover' (first non-INSTRUCTIONS sheet, import.router.ts:936), so the Guests
  // sheet edits never reach the DB. We assert that BROKEN OUTCOME: Dave survives, Eve is
  // absent. If this test ever FAILS, the combined-export guests round-trip has been FIXED
  // (sheet selection now finds 'Guests') — update FINDINGS at that point.
  it('DEFECT: combined-export guests import silently no-ops (picks Cover, not Guests)', async () => {
    const wb = await exportCombinedWorkbook();
    const ws = wb.getWorksheet('Guests')!;
    const hm = headerMap(ws);
    const idCol = hm.get('id')!;
    const nameCol = hm.get('name')!;
    const actionCol = addActionColumn(ws, hm);

    const delRow = findRowById(ws, idCol, FIDS.guest2);
    ws.getRow(delRow).getCell(actionCol).value = 'DELETE';
    const newRow = ws.addRow([]);
    newRow.getCell(nameCol).value = 'Eve New';

    await importWorkbook(wb, 'guests'); // parses 'Cover', not 'Guests'

    const dave = (await db.execute(
      sql`SELECT id FROM guests WHERE id = ${FIDS.guest2}`,
    )) as unknown as Array<{ id: string }>;
    expect(dave, 'BUG: Dave NOT deleted — Guests-sheet Action ignored').toHaveLength(1);

    const eve = (await db.execute(
      sql`SELECT id FROM guests WHERE client_id = ${IDS.clientId} AND first_name = 'Eve'`,
    )) as unknown as Array<{ id: string }>;
    expect(eve, 'BUG: Eve NOT added — Guests-sheet ADD ignored').toHaveLength(0);
  });

  // Broadcast IS expected to fire for guests (GUEST_MUTATION_PATHS) on a successful import,
  // but since the round-trip above is broken, this asserts the cascade contract on the
  // single-sheet path that DOES work: a guests-only workbook (the downloadTemplate shape).
  it('guests import via a single-sheet workbook applies + broadcasts GUEST_MUTATION_PATHS', async () => {
    await resetDeterministic();
    await seedExtraGuest();
    await clearSync(IDS.companyId);

    // Build a single-sheet 'Guests' workbook (mirrors downloadTemplate output, the real
    // single-module upload path) from the combined export's Guests sheet.
    const combined = await exportCombinedWorkbook();
    const src = combined.getWorksheet('Guests')!;
    const ExcelJS = (await import('exceljs')).default;
    const single = new ExcelJS.Workbook();
    const ws = single.addWorksheet('Guests');
    src.eachRow((row, r) => {
      const vals: unknown[] = [];
      row.eachCell((cell, c) => { vals[c - 1] = cell.value; });
      ws.getRow(r).values = vals as ExcelJS.CellValue[];
    });
    const hm = headerMap(ws);
    const idCol = hm.get('id')!;
    const actionCol = addActionColumn(ws, hm);
    const delRow = findRowById(ws, idCol, FIDS.guest2);
    ws.getRow(delRow).getCell(actionCol).value = 'DELETE';
    const newRow = ws.addRow([]);
    newRow.getCell(hm.get('name')!).value = 'Eve New';

    const result = await importWorkbook(single, 'guests');
    expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
    expect(result.created).toBeGreaterThanOrEqual(1);
    expect(result.deleted).toBeGreaterThanOrEqual(1);

    const paths = await readSyncPaths(IDS.companyId);
    for (const p of GUEST_MUTATION_PATHS) {
      expect(paths, `broadcast must include ${p}; got ${JSON.stringify(paths)}`).toContain(p);
    }
  });
});
