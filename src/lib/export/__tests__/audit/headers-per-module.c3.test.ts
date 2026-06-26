/**
 * C3 (per-module) — Informative export headers, asserted per data sheet by RUNNING the real
 * combined export. Complements the global headers.c3 test with per-sheet quality checks:
 *   • no raw snake_case DB column leaks (per sheet),
 *   • headers are human-readable display names,
 *   • editable modules mark required columns with '*' AND carry an inline example/hint
 *     (parenthetical guidance, e.g. "(YYYY-MM-DD)", "(Do not modify)", "(Yes/No)").
 * View-oriented sheets (Timeline, Gifts) are reported, not failed, when they lack '*'.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import ExcelJS from 'exceljs';
import { IDS, resetDeterministic, teardownTenant } from '@/test-support/seed/deterministic-seed';
import { seedAllModuleFixtures } from '@/test-support/seed/module-fixtures';
import { caller } from '@/test-support/audit/roundtrip-util';

const looksLikeRawColumn = (h: string) => /^[a-z]+(_[a-z0-9]+)+$/.test(h.trim());
// Round-trippable sheets must mark required (*) + give an example. Events + GiftsGiven are
// editable as of Cluster E (combined export now round-trips them). Timeline stays view-only.
const EDITABLE = new Set(['Guests', 'Hotels', 'Transport', 'Vendors', 'Budget', 'Events', 'GiftsGiven']);

describe('C3 per-module informative headers', () => {
  beforeAll(async () => {
    await resetDeterministic();
    await seedAllModuleFixtures();
  });
  afterAll(async () => {
    await teardownTenant(IDS.companyId);
  });

  it('every data sheet has human-readable headers; editable modules mark required + give examples', async () => {
    const res = await caller.export.exportClientData({ clientId: IDS.clientId, format: 'excel' });
    const buf = Buffer.from(res.data, 'base64');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);

    const offenders: string[] = [];
    const sheetsSeen: string[] = [];
    const noRequiredMarker: string[] = [];
    const noExample: string[] = [];

    wb.eachSheet((ws) => {
      if (ws.name.toLowerCase() === 'cover') return;
      sheetsSeen.push(ws.name);
      const headers: string[] = [];
      ws.getRow(1).eachCell((cell) => {
        const h = String(cell.value ?? '').trim();
        if (h) headers.push(h);
      });
      expect(headers.length, `${ws.name} should have headers`).toBeGreaterThan(0);

      for (const h of headers) {
        if (looksLikeRawColumn(h)) offenders.push(`${ws.name}:"${h}"`);
      }
      const hasRequired = headers.some((h) => h.includes('*'));
      const hasExample = headers.some((h) => /\(.+\)/.test(h));
      if (!hasRequired) noRequiredMarker.push(ws.name);
      if (!hasExample) noExample.push(ws.name);

      if (EDITABLE.has(ws.name)) {
        expect(hasRequired, `${ws.name} (editable) must mark required columns with '*'; headers=${headers.join(', ')}`).toBe(true);
        expect(hasExample, `${ws.name} (editable) must carry an inline example/hint; headers=${headers.join(', ')}`).toBe(true);
      }
    });

    // Core sheets must all be present in the combined export. [Cluster E] Events (E1) and the
    // gift-delivery 'GiftsGiven' sheet (E3, replaces the old view-only 'Gifts' Serial-# sheet)
    // are now part of the combined export.
    for (const s of ['Guests', 'Hotels', 'Transport', 'Vendors', 'Budget', 'GiftsGiven', 'Events', 'Timeline']) {
      expect(sheetsSeen, `combined export must contain a ${s} sheet`).toContain(s);
    }

    // No raw DB column may leak on ANY sheet.
    expect(offenders, `raw DB column headers leaked: ${offenders.join(', ')}`).toEqual([]);

    // Report (do not fail) view-oriented sheets lacking required/example markers — feeds FINDINGS.
    // eslint-disable-next-line no-console
    console.log('[C3] sheets without required(*):', noRequiredMarker.join(', ') || 'none',
      '| without example():', noExample.join(', ') || 'none');
  });
});
