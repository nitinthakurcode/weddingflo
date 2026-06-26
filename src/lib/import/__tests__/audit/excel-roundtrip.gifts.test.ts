/**
 * C1 — Gifts + GuestGifts Excel round-trip. Both use the INLINE import path, so they
 * inherit the B1 combined-export sheet-select bug (picks 'Cover'). They also carry
 * gift-specific traps:
 *   • The combined export 'Gifts' sheet is sourced from the guest_gifts table (gifts GIVEN
 *     to guests) yet has NO ID column (only a 'Serial #' row index) — so importData('gifts')
 *     (which writes the separate `gifts` table, received FROM guests) cannot match rows.
 *   • The combined export has NO 'GiftsGiven' sheet at all for guestGifts.
 * Documents ACTUAL behavior deterministically; proves the single-sheet template paths work.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import ExcelJS from 'exceljs';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { IDS, resetDeterministic, teardownTenant } from '@/test-support/seed/deterministic-seed';
import { seedExtraGuest, seedGifts, seedGuestGifts, FIDS } from '@/test-support/seed/module-fixtures';
import { exportCombinedWorkbook, headerMap, importWorkbook } from '@/test-support/audit/roundtrip-util';

function singleSheet(name: string, headers: string[], rows: string[][]): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(name);
  ws.getRow(1).values = headers as ExcelJS.CellValue[];
  rows.forEach((r, i) => { ws.getRow(i + 2).values = r as ExcelJS.CellValue[]; });
  return wb;
}

describe('C1 Excel round-trip — gifts / guestGifts', () => {
  beforeAll(async () => {
    await resetDeterministic();
    await seedExtraGuest();
    await seedGifts();
    await seedGuestGifts();
  });
  afterAll(async () => {
    await teardownTenant(IDS.companyId);
  });

  it('DEFECT: combined export Gifts sheet has NO ID column (Serial # only)', async () => {
    const wb = await exportCombinedWorkbook();
    const ws = wb.getWorksheet('Gifts');
    expect(ws, 'combined export must contain a Gifts sheet').toBeTruthy();
    const hm = headerMap(ws!);
    expect(hm.get('id'), `BUG: Gifts sheet exposes no ID column; headers=${[...hm.keys()]}`).toBeUndefined();
    expect(hm.get('serial #') ?? hm.get('serial'), 'Gifts sheet uses Serial # as the row key').toBeTruthy();
  });

  it('DEFECT: combined-export importData(gifts) cannot round-trip (throws / leaves gifts table untouched)', async () => {
    const wb = await exportCombinedWorkbook();
    // The inline importer parses 'Cover' (B1) and the Gifts sheet has no ID column —
    // importData('gifts') either throws BAD_REQUEST or no-ops. Either way: no mutation.
    try {
      await importWorkbook(wb, 'gifts');
    } catch {
      /* BAD_REQUEST is acceptable — the point is the gifts table is not mutated */
    }
    const rows = (await db.execute(
      sql`SELECT id, name FROM gifts WHERE client_id = ${IDS.clientId} ORDER BY name`,
    )) as unknown as Array<{ id: string; name: string }>;
    expect(rows.map((r) => r.name), 'BUG: gifts unchanged — combined Gifts sheet cannot round-trip').toEqual(
      ['Crystal Vase', 'Gift Card'],
    );
  });

  it('FIXED (C1): importGift maps the real gifts columns → EDIT applies, ADD does not crash', async () => {
    const wb = singleSheet(
      'Gifts',
      ['ID (Do not modify)', 'Gift Name *', 'Value', 'Status', 'Action'],
      [
        [FIDS.gift1, 'Crystal Vase EDITED', '120', 'received', ''],
        ['', 'Toaster', '40', 'received', ''], // ADD row — used to crash on g.giftName.toLowerCase()
      ],
    );
    const result = await importWorkbook(wb, 'gifts');

    // No crash: the name-match now reads the real `name` column (was g.giftName → undefined).
    expect(result.errors, `ADD must not crash; errors=${JSON.stringify(result.errors)}`).toEqual([]);

    // EDIT applies: giftData now maps to the real `name` column.
    const edited = (await db.execute(
      sql`SELECT name, value FROM gifts WHERE id = ${FIDS.gift1}`,
    )) as unknown as Array<{ name: string; value: number | null }>;
    expect(edited[0]?.name, 'EDIT should apply via correct column mapping').toBe('Crystal Vase EDITED');
    expect(Number(edited[0]?.value), 'Value column should round-trip').toBe(120);

    // ADD inserts a new gifts row.
    const added = (await db.execute(
      sql`SELECT id FROM gifts WHERE client_id = ${IDS.clientId} AND name = 'Toaster'`,
    )) as unknown as Array<{ id: string }>;
    expect(added.length, 'ADD should insert a new gift').toBeGreaterThanOrEqual(1);
  });

  it('single-sheet GiftsGiven template round-trips into the guest_gifts table', async () => {
    await resetDeterministic();
    await seedExtraGuest();
    await seedGuestGifts();
    const wb = singleSheet(
      'GiftsGiven',
      ['ID (Do not modify)', 'Guest Name *', 'Gift Name *', 'Quantity', 'Action'],
      [
        [FIDS.guestGift1, 'Carol Guest', 'Favor Box DELUXE', '3', ''],
        [FIDS.guestGift2, 'Dave Deletable', 'Keepsake Mug', '2', 'DELETE'],
        ['', 'Carol Guest', 'Extra Token', '1', ''],
      ],
    );
    const result = await importWorkbook(wb, 'guestGifts');
    expect(result.errors, JSON.stringify(result.errors)).toEqual([]);

    const edited = (await db.execute(
      sql`SELECT name, quantity FROM guest_gifts WHERE id = ${FIDS.guestGift1}`,
    )) as unknown as Array<{ name: string; quantity: number }>;
    expect(edited[0]?.name, 'EDIT by ID should apply').toBe('Favor Box DELUXE');

    const deleted = (await db.execute(sql`SELECT id FROM guest_gifts WHERE id = ${FIDS.guestGift2}`)) as unknown as Array<{ id: string }>;
    expect(deleted, 'guestGift2 should be deleted').toHaveLength(0);

    const added = (await db.execute(
      sql`SELECT id FROM guest_gifts WHERE client_id = ${IDS.clientId} AND name = 'Extra Token'`,
    )) as unknown as Array<{ id: string }>;
    expect(added.length, 'new guest gift should be added').toBeGreaterThanOrEqual(1);
  });
});
