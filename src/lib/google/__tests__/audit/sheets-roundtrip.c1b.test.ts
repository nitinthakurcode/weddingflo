/**
 * C1b — Google Sheets round-trip via the FakeSheetsClient DI seam, asserted by RUNNING.
 *
 * Proves the authorized seam makes Sheets sync testable offline AND that the real sync
 * engine round-trips correctly:
 *   - seam: new GoogleSheetsOAuth(factory).getSheetsClient() returns the injected fake.
 *   - syncBudgetToSheet  → fake 'Budget' sheet populated from DB (export).
 *   - edit + add + delete(Action) + reorder columns in the fake sheet.
 *   - importBudgetFromSheet → DB upsert (EDIT/ADD/DELETE), name-based mapping (1b.7).
 *
 * The Sheets live smoke (real OAuth + throwaway sheet) is a SEPARATE nightly job — SKIPPED
 * here (no creds); the seam gates CI.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { GoogleSheetsOAuth } from '@/lib/google/sheets-client';
import { syncBudgetToSheet, importBudgetFromSheet } from '@/lib/google/sheets-sync';
import { FakeSheetsClient } from '@/test-support/fake-sheets-client';
import { IDS, resetDeterministic, teardownTenant } from '@/test-support/seed/deterministic-seed';
import type { sheets_v4 } from 'googleapis';

const SHEET_ID = 'fake-spreadsheet-id';

function asClient(fake: FakeSheetsClient): sheets_v4.Sheets {
  return fake as unknown as sheets_v4.Sheets;
}

describe('C1b Sheets round-trip via seam', () => {
  beforeAll(async () => {
    await resetDeterministic();
  });
  afterAll(async () => {
    await teardownTenant(IDS.companyId);
  });

  it('the SheetsClientFactory seam returns the injected fake (offline)', () => {
    const fake = new FakeSheetsClient();
    const oauth = new GoogleSheetsOAuth(() => asClient(fake));
    expect(oauth.getSheetsClient('access', 'refresh')).toBe(fake);
  });

  it('EDIT + ADD + DELETE + name-based mapping round-trip through the fake', async () => {
    const fake = new FakeSheetsClient();
    const client = asClient(fake);

    // export DB → sheet
    await syncBudgetToSheet(client, SHEET_ID, IDS.clientId);
    const rows = fake.getSheet('Budget') as string[][];
    expect(rows.length, 'header + 2 seeded budget rows').toBeGreaterThanOrEqual(3);

    const headers = rows[0];
    const idIdx = headers.indexOf('ID');
    const costIdx = headers.indexOf('Estimated Cost');
    const itemIdx = headers.indexOf('Item');
    const actionIdx = headers.indexOf('Action');
    const luIdx = headers.indexOf('Last Updated');
    expect(idIdx).toBeGreaterThanOrEqual(0);
    expect(costIdx).toBeGreaterThanOrEqual(0);

    // EDIT budgetId 1000 -> 1500 ; DELETE budgetId2 via Action ; ADD a new row.
    // The Sheets importer uses Last-Updated conflict detection (last-write-wins), so a
    // real user edit must carry a NEWER timestamp for the update to win over the DB row.
    const newer = new Date('2027-01-01T00:00:00.000Z').toISOString();
    for (let r = 1; r < rows.length; r++) {
      if (rows[r][idIdx] === IDS.budgetId) {
        rows[r][costIdx] = '1500';
        if (luIdx >= 0) rows[r][luIdx] = newer;
      }
      if (rows[r][idIdx] === IDS.budgetId2) rows[r][actionIdx] = 'DELETE';
    }
    const addRow = headers.map(() => '');
    addRow[itemIdx] = 'Sheet Cake';
    addRow[costIdx] = '700';
    const catIdx = headers.indexOf('Category');
    if (catIdx >= 0) addRow[catIdx] = 'catering';
    rows.push(addRow);

    // 1b.7 name-based mapping: REORDER columns (reverse) before re-import.
    const order = headers.map((_, i) => i).reverse();
    const reordered = rows.map((row) => order.map((i) => row[i]));
    fake.setSheet('Budget', reordered);

    // import sheet → DB
    await importBudgetFromSheet(client, SHEET_ID, IDS.clientId, IDS.companyId);

    const edited = (await db.execute(
      sql`SELECT estimated_cost, item FROM budget WHERE id = ${IDS.budgetId}`,
    )) as unknown as Array<{ estimated_cost: string; item: string }>;
    expect(Number(edited[0].estimated_cost)).toBe(1500); // EDIT via reordered columns (name-mapped)
    expect(edited[0].item).toBe('Venue Hire'); // non-destructive

    const deleted = (await db.execute(
      sql`SELECT id FROM budget WHERE id = ${IDS.budgetId2}`,
    )) as unknown as Array<{ id: string }>;
    expect(deleted).toHaveLength(0); // DELETE via Action

    const added = (await db.execute(
      sql`SELECT estimated_cost FROM budget WHERE client_id = ${IDS.clientId} AND item = 'Sheet Cake'`,
    )) as unknown as Array<{ estimated_cost: string }>;
    expect(added).toHaveLength(1); // ADD inserted, client-scoped
    expect(Number(added[0].estimated_cost)).toBe(700);
  });
});
