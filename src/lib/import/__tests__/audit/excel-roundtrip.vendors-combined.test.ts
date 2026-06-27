/**
 * [6A.2] Combined-export → re-import vendor round-trip — the per-link DATA-LOSS regression.
 *
 * The combined client export used to read bare global `vendors` (§G.6 per-link columns blank);
 * because the importer is non-destructive on HEADER-presence (a present-but-blank column
 * overwrites), exporting the whole workbook and re-importing it SILENTLY CLEARED a vendor's
 * `clientVendors` link fields (contract amount, deposit, service date, on-site POC,
 * deliverables, approval, event) even when the user never touched them. The fix single-sources
 * the vendor fetch (`fetchClientVendorExportRows`) so the combined export now populates those
 * columns — so an un-edited round-trip preserves them.
 *
 * Asserts BOTH halves of the contract:
 *   1. un-edited full-workbook re-import KEEPS every per-link field, and
 *   2. an explicit unassign (clearing a cell) STILL clears that one field (header-presence is
 *      the intended explicit-unassign mechanism) — without disturbing the other fields.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { clientVendors } from '@/lib/db/schema-features';
import { IDS, resetDeterministic, teardownTenant } from '@/test-support/seed/deterministic-seed';
import { seedVendors, FIDS } from '@/test-support/seed/module-fixtures';
import { clearSync } from '@/test-support/redis-sync-probe';
import {
  exportCombinedWorkbook, headerMap, findRowById, importWorkbook,
} from '@/test-support/audit/roundtrip-util';

/** The full per-link payload seeded onto vendor1's client↔vendor link. */
const RICH_LINK = {
  contractAmount: '2500',
  depositAmount: '500',
  serviceDate: '2026-09-01',
  paymentStatus: 'paid',
  approvalStatus: 'approved',
  approvalComments: 'Confirmed by couple',
  venueAddress: '12 Garden Ave',
  onsitePocName: 'Dana POC',
  onsitePocPhone: '555-0100',
  deliverables: 'Bouquets + arch florals',
};

async function vendor1Link() {
  const rows = (await db.execute(
    sql`SELECT contract_amount, deposit_amount, service_date, payment_status, approval_status,
               approval_comments, venue_address, onsite_poc_name, onsite_poc_phone,
               deliverables, event_id
        FROM client_vendors WHERE vendor_id = ${FIDS.vendor1} AND client_id = ${IDS.clientId}`,
  )) as unknown as Array<Record<string, string | null>>;
  return rows[0];
}

describe('[6A.2] vendors combined-export round-trip — no per-link data loss', () => {
  beforeAll(async () => {
    await resetDeterministic();
    await seedVendors();
    // Enrich vendor1's link with the full §G.6 per-client field set (the fixture only sets
    // contractAmount + eventId), so preservation across a round-trip is actually meaningful.
    await db.update(clientVendors)
      .set(RICH_LINK)
      .where(and(
        eq(clientVendors.vendorId, FIDS.vendor1),
        eq(clientVendors.clientId, IDS.clientId),
      ));
    await clearSync(IDS.companyId);
  });
  afterAll(async () => {
    await teardownTenant(IDS.companyId);
    await clearSync(IDS.companyId);
  });

  it('combined export POPULATES the per-link columns (the data-source fix)', async () => {
    const wb = await exportCombinedWorkbook();
    const ws = wb.getWorksheet('Vendors');
    expect(ws, 'combined export must contain a Vendors sheet').toBeTruthy();
    const hm = headerMap(ws!);
    const idCol = hm.get('id')!;
    const row = findRowById(ws!, idCol, FIDS.vendor1);
    expect(row).toBeGreaterThan(1);
    const cell = (header: string) =>
      String(ws!.getRow(row).getCell(hm.get(header)!).value ?? '').trim();

    // Before the fix these were BLANK (combined export read global vendors). Now populated.
    expect(cell('contract amount')).toBe('2500');
    expect(cell('service date')).toBe('2026-09-01');
    expect(cell('service location')).toBe('12 Garden Ave');
    expect(cell('on-site contact')).toBe('Dana POC');
    expect(cell('services provided')).toBe('Bouquets + arch florals');
    expect(cell('approval status')).toBe('approved');
    expect(cell('event')).toBe('Main Wedding'); // global vendors had no event link
  });

  it('un-edited full-workbook re-import KEEPS every per-link field', async () => {
    const wb = await exportCombinedWorkbook();
    // No edits — round-trip the whole workbook exactly as exported.
    const result = await importWorkbook(wb, 'vendors');
    expect(result.errors, JSON.stringify(result.errors)).toEqual([]);

    const link = await vendor1Link();
    expect(Number(link.contract_amount)).toBe(2500);
    expect(Number(link.deposit_amount)).toBe(500);
    expect(link.service_date).toBe('2026-09-01');
    expect(link.payment_status).toBe('paid');
    expect(link.approval_status).toBe('approved');
    expect(link.approval_comments).toBe('Confirmed by couple');
    expect(link.venue_address).toBe('12 Garden Ave');
    expect(link.onsite_poc_name).toBe('Dana POC');
    expect(link.onsite_poc_phone).toBe('555-0100');
    expect(link.deliverables).toBe('Bouquets + arch florals');
    expect(link.event_id, 'event link preserved').toBe(IDS.eventId);
  });

  it('explicit unassign (cleared cell) STILL clears that one field, others preserved', async () => {
    const wb = await exportCombinedWorkbook();
    const ws = wb.getWorksheet('Vendors')!;
    const hm = headerMap(ws);
    const idCol = hm.get('id')!;
    const row = findRowById(ws, idCol, FIDS.vendor1);
    expect(row).toBeGreaterThan(1);

    // User clears Service Date — present-but-blank is the intended explicit-unassign signal.
    ws.getRow(row).getCell(hm.get('service date')!).value = '';

    const result = await importWorkbook(wb, 'vendors');
    expect(result.errors, JSON.stringify(result.errors)).toEqual([]);

    const link = await vendor1Link();
    expect(link.service_date, 'cleared field is unassigned').toBeNull();
    // Everything NOT cleared survives the same workbook re-import.
    expect(Number(link.contract_amount)).toBe(2500);
    expect(link.approval_status).toBe('approved');
    expect(link.venue_address).toBe('12 Garden Ave');
    expect(link.deliverables).toBe('Bouquets + arch florals');
  });
});
