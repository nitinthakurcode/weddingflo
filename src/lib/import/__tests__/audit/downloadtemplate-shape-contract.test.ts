/**
 * 6A.1 — downloadTemplate column SHAPE is single-sourced from MODULE_SHAPES.
 *
 * Closes the Cluster-E SSOT bypass: `import.router.ts downloadTemplate` previously authored
 * each module's export columns INLINE and had drifted from the combined export (guests omitted
 * Side + Checked In; events differed on Status + Action). The 6 "clean" modules now render from
 * `MODULE_SHAPES` via `buildExportSheet`, so the template headers ARE the SSOT headers by
 * construction. This test fails the moment anyone re-introduces an inline column for them.
 *
 * vendors + gifts are INTENTIONALLY excluded: they draw from a different data source / table
 * (per-client `clientVendors` link view; gift-REGISTRY `gifts` table) than the combined export,
 * and stay inline by design — documented in KNOWN_GAPS.md.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import ExcelJS from 'exceljs';
import { IDS, resetDeterministic, teardownTenant } from '@/test-support/seed/deterministic-seed';
import { callerFor } from '@/test-support/audit-caller';
import { MODULE_SHAPES, type ExportModule } from '@/lib/import/module-shape';

const caller = callerFor({ companyId: IDS.companyId, userId: IDS.userId });

// The single-sourced downloadTemplate modules (vendors + gifts excluded by design).
const ROUTED: ExportModule[] = ['guests', 'budget', 'hotels', 'transport', 'guestGifts', 'events'];

async function templateHeaders(module: ExportModule): Promise<string[]> {
  const res = await caller.import.downloadTemplate({ module, clientId: IDS.clientId });
  const buf = Buffer.from(res.data, 'base64');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
  // hotels prepends an INSTRUCTIONS sheet, so look the data sheet up by its canonical name.
  const ws = wb.getWorksheet(MODULE_SHAPES[module].sheet);
  if (!ws) throw new Error(`downloadTemplate('${module}') has no '${MODULE_SHAPES[module].sheet}' sheet`);
  const headers: string[] = [];
  ws.getRow(1).eachCell((c) => headers.push(String(c.value ?? '')));
  return headers;
}

describe('6A.1 downloadTemplate is single-sourced from MODULE_SHAPES', () => {
  beforeAll(async () => {
    await resetDeterministic();
  });
  afterAll(async () => {
    await teardownTenant(IDS.companyId);
  });

  for (const m of ROUTED) {
    it(`downloadTemplate('${m}') headers === MODULE_SHAPES['${m}'] headers (no inline drift)`, async () => {
      const headers = await templateHeaders(m);
      expect(headers).toEqual(MODULE_SHAPES[m].columns.map((c) => c.header));
    });
  }
});
