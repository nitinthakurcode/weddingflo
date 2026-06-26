/**
 * C1 — Vendors Excel round-trip (combined export → edit → importData('vendors')).
 * Server-parser path (excel-parser-server.ts importVendorsExcel, reads getWorksheet('Vendors')).
 * Vendors are a global table + per-client clientVendors join (contract amount / event link).
 * Asserts EDIT (contract amount on the join) + ADD + DELETE + cascade (recalcClientStats +
 * syncVendorBudgetItem creates a linked budget item) + broadcast VENDOR_MUTATION_PATHS.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { IDS, resetDeterministic, teardownTenant } from '@/test-support/seed/deterministic-seed';
import { seedVendors, FIDS } from '@/test-support/seed/module-fixtures';
import { clearSync, readSyncPaths } from '@/test-support/redis-sync-probe';
import { VENDOR_MUTATION_PATHS } from '@/lib/sync/cascade-query-paths';
import {
  exportCombinedWorkbook, headerMap, addActionColumn, findRowById, importWorkbook,
} from '@/test-support/audit/roundtrip-util';

describe('C1 Excel round-trip — vendors', () => {
  beforeAll(async () => {
    await resetDeterministic();
    await seedVendors();
    await clearSync(IDS.companyId);
  });
  afterAll(async () => {
    await teardownTenant(IDS.companyId);
    await clearSync(IDS.companyId);
  });

  it('EDIT + ADD + DELETE + cascade (budget item) + broadcast', async () => {
    const wb = await exportCombinedWorkbook();
    const ws = wb.getWorksheet('Vendors');
    expect(ws, 'combined export must contain a Vendors sheet').toBeTruthy();
    const hm = headerMap(ws!);
    const idCol = hm.get('id');
    const nameCol = hm.get('vendor name');
    const catCol = hm.get('category');
    const amtCol = hm.get('contract amount');
    expect(idCol, `headers=${[...hm.keys()]}`).toBeTruthy();
    expect(nameCol, `Vendors sheet must expose Vendor Name. headers=${[...hm.keys()]}`).toBeTruthy();
    const actionCol = addActionColumn(ws!, hm);

    const editRow = findRowById(ws!, idCol!, FIDS.vendor1);
    const delRow = findRowById(ws!, idCol!, FIDS.vendor2);
    expect(editRow).toBeGreaterThan(1);
    expect(delRow).toBeGreaterThan(1);
    if (amtCol) ws!.getRow(editRow).getCell(amtCol).value = 3300;
    ws!.getRow(delRow).getCell(actionCol).value = 'DELETE';
    const newRow = ws!.addRow([]);
    newRow.getCell(nameCol!).value = 'Cater Co';
    if (catCol) newRow.getCell(catCol).value = 'catering';
    if (amtCol) newRow.getCell(amtCol).value = 1500;

    const result = await importWorkbook(wb, 'vendors');
    expect(result.errors, JSON.stringify(result.errors)).toEqual([]);

    if (amtCol) {
      const edited = (await db.execute(
        sql`SELECT contract_amount FROM client_vendors WHERE vendor_id = ${FIDS.vendor1} AND client_id = ${IDS.clientId}`,
      )) as unknown as Array<{ contract_amount: string }>;
      expect(Number(edited[0]?.contract_amount)).toBe(3300); // EDIT applied to join row
    }

    // DELETE disassociates the client_vendors join (vendor master row may persist).
    const delJoin = (await db.execute(
      sql`SELECT id FROM client_vendors WHERE vendor_id = ${FIDS.vendor2} AND client_id = ${IDS.clientId}`,
    )) as unknown as Array<{ id: string }>;
    expect(delJoin, 'vendor2 client link should be removed').toHaveLength(0);

    const added = (await db.execute(
      sql`SELECT id FROM vendors WHERE company_id = ${IDS.companyId} AND name = 'Cater Co'`,
    )) as unknown as Array<{ id: string }>;
    expect(added.length, 'new vendor should be added').toBeGreaterThanOrEqual(1);

    // Cascade: syncVendorBudgetItem creates a budget line (segment='vendors', item=vendor
    // name, vendor_id set; category = linked event title) for the contract amount.
    const budgetItems = (await db.execute(
      sql`SELECT id, item FROM budget WHERE client_id = ${IDS.clientId} AND segment = 'vendors' AND vendor_id IS NOT NULL`,
    )) as unknown as Array<{ id: string; item: string }>;
    expect(budgetItems.length, 'vendor cost should sync into a budget item').toBeGreaterThanOrEqual(1);
    expect(budgetItems.some((b) => b.item === 'Bloom Florist'), 'edited vendor budget line should exist').toBe(true);

    const paths = await readSyncPaths(IDS.companyId);
    for (const p of VENDOR_MUTATION_PATHS) {
      expect(paths, `broadcast must include ${p}; got ${JSON.stringify(paths)}`).toContain(p);
    }
  });
});
