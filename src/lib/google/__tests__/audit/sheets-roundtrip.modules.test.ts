/**
 * C1b — Google Sheets round-trip via the FakeSheetsClient seam, for modules BEYOND budget
 * (budget is proven in sheets-roundtrip.c1b.test.ts). Each module: real syncXToSheet
 * (DB→sheet) → EDIT a row (with a NEWER Last Updated so last-write-wins) + DELETE via Action
 * → real importXFromSheet (sheet→DB) → assert DB. Offline, deterministic, no OAuth/network.
 *
 * NOTE (contrast): the Sheets GIFT path maps the correct gifts columns (Gift Name/Value/
 * Status), so it round-trips — unlike the Excel importGift, which references non-existent
 * columns (giftName/...) and is broken (see FINDINGS Cluster C / excel-roundtrip.gifts).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { GoogleSheetsOAuth } from '@/lib/google/sheets-client';
import {
  syncGuestsToSheet, importGuestsFromSheet,
  syncHotelsToSheet, importHotelsFromSheet,
  syncVendorsToSheet, importVendorsFromSheet,
  syncGiftsToSheet, importGiftsFromSheet,
} from '@/lib/google/sheets-sync';
import { FakeSheetsClient } from '@/test-support/fake-sheets-client';
import { IDS, resetDeterministic, teardownTenant } from '@/test-support/seed/deterministic-seed';
import { seedExtraGuest, seedHotels, seedVendors, seedGifts, FIDS } from '@/test-support/seed/module-fixtures';
import type { sheets_v4 } from 'googleapis';

const SHEET_ID = 'fake-spreadsheet-id';
const NEWER = new Date('2027-01-01T00:00:00.000Z').toISOString();
const asClient = (f: FakeSheetsClient) => f as unknown as sheets_v4.Sheets;

/** Verify the seam returns the injected fake (offline). */
function seamFake(): { fake: FakeSheetsClient; client: sheets_v4.Sheets } {
  const fake = new FakeSheetsClient();
  const client = asClient(fake);
  expect(new GoogleSheetsOAuth(() => client).getSheetsClient('a', 'r')).toBe(fake);
  return { fake, client };
}

/** EDIT a cell by ID (+ newer Last Updated) and mark another row DELETE in a fake sheet. */
function editAndDelete(rows: string[][], idCol: number, editId: string, editCol: number, editVal: string, delId: string) {
  const headers = rows[0];
  const luIdx = headers.indexOf('Last Updated');
  const actionIdx = headers.indexOf('Action');
  for (let r = 1; r < rows.length; r++) {
    if (rows[r][idCol] === editId) {
      rows[r][editCol] = editVal;
      if (luIdx >= 0) rows[r][luIdx] = NEWER;
    }
    if (rows[r][idCol] === delId && actionIdx >= 0) rows[r][actionIdx] = 'DELETE';
  }
}

describe('C1b Sheets round-trip — guests / hotels / vendors / gifts', () => {
  beforeAll(async () => { await resetDeterministic(); });
  afterAll(async () => { await teardownTenant(IDS.companyId); });

  it('guests: EDIT (Group) + DELETE round-trip', async () => {
    await resetDeterministic();
    await seedExtraGuest();
    const { fake, client } = seamFake();
    await syncGuestsToSheet(client, SHEET_ID, IDS.clientId);
    const rows = fake.getSheet('Guests') as string[][];
    const h = rows[0];
    editAndDelete(rows, h.indexOf('ID'), IDS.guestId, h.indexOf('Group'), 'VIP', FIDS.guest2);
    fake.setSheet('Guests', rows);
    await importGuestsFromSheet(client, SHEET_ID, IDS.clientId, IDS.companyId);

    const edited = (await db.execute(sql`SELECT group_name FROM guests WHERE id = ${IDS.guestId}`)) as unknown as Array<{ group_name: string }>;
    expect(edited[0].group_name).toBe('VIP');
    const del = (await db.execute(sql`SELECT id FROM guests WHERE id = ${FIDS.guest2}`)) as unknown as unknown[];
    expect(del).toHaveLength(0);
  });

  it('hotels: EDIT (Hotel Name) + DELETE round-trip', async () => {
    await resetDeterministic();
    await seedExtraGuest();
    await seedHotels();
    const { fake, client } = seamFake();
    await syncHotelsToSheet(client, SHEET_ID, IDS.clientId);
    const rows = fake.getSheet('Hotels') as string[][];
    const h = rows[0];
    editAndDelete(rows, h.indexOf('ID'), FIDS.hotel1, h.indexOf('Hotel Name'), 'Grand Plaza DELUXE', FIDS.hotel2);
    fake.setSheet('Hotels', rows);
    await importHotelsFromSheet(client, SHEET_ID, IDS.clientId, IDS.companyId);

    const edited = (await db.execute(sql`SELECT hotel_name FROM hotels WHERE id = ${FIDS.hotel1}`)) as unknown as Array<{ hotel_name: string }>;
    expect(edited[0].hotel_name).toBe('Grand Plaza DELUXE');
    const del = (await db.execute(sql`SELECT id FROM hotels WHERE id = ${FIDS.hotel2}`)) as unknown as unknown[];
    expect(del).toHaveLength(0);
  });

  it('vendors: EDIT (Contract Amount) + DELETE round-trip', async () => {
    await resetDeterministic();
    await seedVendors();
    const { fake, client } = seamFake();
    await syncVendorsToSheet(client, SHEET_ID, IDS.clientId, IDS.companyId);
    const rows = fake.getSheet('Vendors') as string[][];
    const h = rows[0];
    editAndDelete(rows, h.indexOf('ID'), FIDS.vendor1, h.indexOf('Contract Amount'), '3300', FIDS.vendor2);
    fake.setSheet('Vendors', rows);
    await importVendorsFromSheet(client, SHEET_ID, IDS.clientId, IDS.companyId);

    const edited = (await db.execute(sql`SELECT contract_amount FROM client_vendors WHERE vendor_id = ${FIDS.vendor1} AND client_id = ${IDS.clientId}`)) as unknown as Array<{ contract_amount: string }>;
    expect(Number(edited[0]?.contract_amount)).toBe(3300);
    const delLink = (await db.execute(sql`SELECT id FROM client_vendors WHERE vendor_id = ${FIDS.vendor2} AND client_id = ${IDS.clientId}`)) as unknown as unknown[];
    expect(delLink).toHaveLength(0);
  });

  it('gifts: EDIT (Gift Name) + DELETE round-trip (Sheets path uses CORRECT columns)', async () => {
    await resetDeterministic();
    await seedExtraGuest();
    await seedGifts();
    const { fake, client } = seamFake();
    await syncGiftsToSheet(client, SHEET_ID, IDS.clientId);
    const rows = fake.getSheet('Gifts') as string[][];
    const h = rows[0];
    editAndDelete(rows, h.indexOf('ID'), FIDS.gift1, h.indexOf('Gift Name'), 'Crystal Vase EDITED', FIDS.gift2);
    fake.setSheet('Gifts', rows);
    await importGiftsFromSheet(client, SHEET_ID, IDS.clientId);

    const edited = (await db.execute(sql`SELECT name FROM gifts WHERE id = ${FIDS.gift1}`)) as unknown as Array<{ name: string }>;
    expect(edited[0]?.name, 'Sheets gift EDIT should apply (unlike Excel importGift)').toBe('Crystal Vase EDITED');
    const del = (await db.execute(sql`SELECT id FROM gifts WHERE id = ${FIDS.gift2}`)) as unknown as unknown[];
    expect(del).toHaveLength(0);
  });
});
