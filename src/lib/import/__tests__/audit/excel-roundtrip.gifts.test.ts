/**
 * C1 / E3 — Gifts + GuestGifts Excel round-trip (INLINE import path).
 *
 * Cluster-E fix: the combined export now emits a round-trippable gift-DELIVERY 'GiftsGiven'
 * sheet (handbook §G.7: leading ID + required Gift Name, sourced from the single-source
 * column SHAPE in module-shape.ts) instead of the old view-only 'Gifts' Serial-# sheet that
 * could not match rows. The two former DEFECT tests are flipped to expect-correct below.
 *   • gifts module (`gifts` table, received-FROM model) — single-sheet import via importGift.
 *   • guestGifts module (`guest_gifts` table, given-TO model) — combined + single-sheet via importGuestGift.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import ExcelJS from 'exceljs';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { IDS, resetDeterministic, teardownTenant } from '@/test-support/seed/deterministic-seed';
import { seedExtraGuest, seedGifts, seedGuestGifts, FIDS } from '@/test-support/seed/module-fixtures';
import { exportCombinedWorkbook, headerMap, findRowById, importWorkbook } from '@/test-support/audit/roundtrip-util';

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

  it('FIXED (E3): combined export emits a round-trippable GiftsGiven sheet (ID + required Gift Name)', async () => {
    const wb = await exportCombinedWorkbook();
    // [E3] The old view-only 'Gifts' (Serial #) sheet is replaced by the gift-delivery
    // 'GiftsGiven' sheet (handbook §G.7) with a leading ID + required Gift Name, sourced from
    // the SSOT shape consumed by both exporter and import service.
    expect(wb.getWorksheet('Gifts'), 'old view-only Gifts sheet should be gone').toBeUndefined();
    const ws = wb.getWorksheet('GiftsGiven');
    expect(ws, 'combined export must contain a GiftsGiven sheet').toBeTruthy();
    const hm = headerMap(ws!);
    expect(hm.get('id'), `GiftsGiven must expose an ID column; headers=${[...hm.keys()]}`).toBeTruthy();
    expect(hm.get('gift name'), `GiftsGiven must expose Gift Name; headers=${[...hm.keys()]}`).toBeTruthy();
  });

  it('FIXED (E3): combined-export GiftsGiven round-trips via importData(guestGifts) (EDIT by ID)', async () => {
    const wb = await exportCombinedWorkbook();
    const ws = wb.getWorksheet('GiftsGiven')!;
    const hm = headerMap(ws);
    const idCol = hm.get('id')!;
    const nameCol = hm.get('gift name')!;

    // EDIT the seeded guestGift1 ("Favor Box") by its real ID via the combined sheet.
    const editRow = findRowById(ws, idCol, FIDS.guestGift1);
    expect(editRow, 'GiftsGiven sheet should contain guestGift1 by ID').toBeGreaterThan(1);
    ws.getRow(editRow).getCell(nameCol).value = 'Favor Box EDITED';

    const result = await importWorkbook(wb, 'guestGifts');
    expect(result.errors, `combined GiftsGiven import must not error; ${JSON.stringify(result.errors)}`).toEqual([]);

    const edited = (await db.execute(
      sql`SELECT name FROM guest_gifts WHERE id = ${FIDS.guestGift1}`,
    )) as unknown as Array<{ name: string }>;
    expect(edited[0]?.name, 'EDIT via combined GiftsGiven sheet should apply').toBe('Favor Box EDITED');
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
