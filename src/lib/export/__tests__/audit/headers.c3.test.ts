/**
 * C3 — Informative headers, asserted by RUNNING the real export.
 *
 * Every column header in the exported workbook must be a human-readable display name —
 * no raw snake_case / DB column name (e.g. estimated_cost, client_id) may leak to the
 * client file (handbook §G). Required columns must carry a `*` marker.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import ExcelJS from 'exceljs';
import { IDS, resetDeterministic, teardownTenant } from '@/test-support/seed/deterministic-seed';
import { callerFor } from '@/test-support/audit-caller';

const caller = callerFor({ companyId: IDS.companyId, userId: IDS.userId });

/** raw DB-style token: lower_snake_case with an internal underscore between letters. */
const looksLikeRawColumn = (h: string) => /^[a-z]+(_[a-z0-9]+)+$/.test(h.trim());

describe('C3 informative headers', () => {
  beforeAll(async () => {
    await resetDeterministic();
  });
  afterAll(async () => {
    await teardownTenant(IDS.companyId);
  });

  it('no exported header leaks a raw snake_case DB column name', async () => {
    const res = await caller.export.exportClientData({ clientId: IDS.clientId, format: 'excel' });
    const buf = Buffer.from(res.data, 'base64');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);

    const offenders: string[] = [];
    let sheetsChecked = 0;
    let requiredMarkers = 0;

    wb.eachSheet((ws) => {
      if (ws.name.toLowerCase() === 'cover') return;
      sheetsChecked++;
      ws.getRow(1).eachCell((cell) => {
        const h = String(cell.value ?? '').trim();
        if (!h) return;
        if (h.includes('*')) requiredMarkers++;
        if (looksLikeRawColumn(h)) offenders.push(`${ws.name}:"${h}"`);
      });
    });

    expect(sheetsChecked, 'export should contain at least one data sheet').toBeGreaterThan(0);
    expect(offenders, `raw DB column headers leaked: ${offenders.join(', ')}`).toEqual([]);
    // Required-field markers present somewhere (e.g. "Item *", "Estimated Cost *").
    expect(requiredMarkers, 'export should mark required columns with *').toBeGreaterThan(0);
  });
});
