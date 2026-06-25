/**
 * C1a — Excel round-trip (budget), REAL .xlsx, asserts by RUNNING.
 *
 * Exercises the REAL wired endpoints end-to-end:
 *   export.exportClientData (combined .xlsx)  →  edit the Budget sheet in exceljs
 *   →  import.importData({module:'budget'})    →  assert DB mutation + cascade + broadcast.
 *
 * This replaces the header-only contract test (defect D3): it proves the actual upsert,
 * delete, non-destructive merge, the recalcClientStats cascade, AND that the broadcast
 * emitted the canonical BUDGET_MUTATION_PATHS on the real Redis/SRH chain.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import ExcelJS from 'exceljs';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { IDS, resetDeterministic, teardownTenant } from '@/test-support/seed/deterministic-seed';
import { callerFor } from '@/test-support/audit-caller';
import { clearSync, readSyncPaths } from '@/test-support/redis-sync-probe';
import { BUDGET_MUTATION_PATHS } from '@/lib/sync/cascade-query-paths';

const caller = callerFor({ companyId: IDS.companyId, userId: IDS.userId });

/** normalize an export header to its canonical token: lowercase, strip * and (...) */
const norm = (h: string) =>
  h.toLowerCase().replace(/\(.*?\)/g, '').replace(/\*/g, '').trim();

async function exportBudgetWorkbook(): Promise<ExcelJS.Workbook> {
  const res = await caller.export.exportClientData({ clientId: IDS.clientId, format: 'excel' });
  const buf = Buffer.from(res.data, 'base64');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
  return wb;
}

function headerMap(ws: ExcelJS.Worksheet): Map<string, number> {
  const m = new Map<string, number>();
  ws.getRow(1).eachCell((cell, col) => m.set(norm(String(cell.value ?? '')), col));
  return m;
}

async function importWorkbook(wb: ExcelJS.Workbook) {
  const out = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  const fileData = Buffer.from(out).toString('base64');
  return caller.import.importData({ module: 'budget', clientId: IDS.clientId, fileData });
}

describe('C1a Excel round-trip — budget', () => {
  beforeAll(async () => {
    await resetDeterministic();
    await clearSync(IDS.companyId);
  });
  afterAll(async () => {
    await teardownTenant(IDS.companyId);
    await clearSync(IDS.companyId);
  });

  it('EDIT + ADD + DELETE + NON-DESTRUCTIVE + cascade + broadcast in one round-trip', async () => {
    // ── capture pre-state (created_at is in NO sheet → proves absent cols not nulled) ──
    const before = (await db.execute(
      sql`SELECT id, item, category, notes, created_at FROM budget WHERE id = ${IDS.budgetId}`,
    )) as unknown as Array<{ id: string; item: string; category: string; notes: string; created_at: string }>;
    expect(before).toHaveLength(1);
    const createdAtBefore = String(before[0].created_at);

    // ── export real .xlsx ──
    const wb = await exportBudgetWorkbook();
    const ws = wb.getWorksheet('Budget');
    expect(ws, 'combined export must contain a Budget sheet').toBeTruthy();
    const hm = headerMap(ws!);
    const idCol = hm.get('id');
    const costCol = hm.get('estimated cost');
    const itemCol = hm.get('item');
    expect(idCol, `Budget sheet must expose an ID column. headers=${[...hm.keys()]}`).toBeTruthy();
    expect(costCol, `Budget sheet must expose Estimated Cost. headers=${[...hm.keys()]}`).toBeTruthy();

    // ── locate the seeded rows by ID, and add an Action column (user delete workflow) ──
    const actionCol = (ws!.columnCount || hm.size) + 1;
    ws!.getRow(1).getCell(actionCol).value = 'Action';

    let editedRow = -1;
    let deleteRow = -1;
    for (let r = 2; r <= ws!.rowCount; r++) {
      const idVal = String(ws!.getRow(r).getCell(idCol!).value ?? '').trim();
      if (idVal === IDS.budgetId) editedRow = r;
      if (idVal === IDS.budgetId2) deleteRow = r;
    }
    expect(editedRow, 'edited row (budgetId) must be present in export').toBeGreaterThan(1);
    expect(deleteRow, 'delete row (budgetId2) must be present in export').toBeGreaterThan(1);

    // EDIT: 1000 -> 1500
    ws!.getRow(editedRow).getCell(costCol!).value = 1500;
    // DELETE: mark budgetId2 row
    ws!.getRow(deleteRow).getCell(actionCol).value = 'DELETE';
    // ADD: brand-new row, no ID, required Item present
    const newRow = ws!.addRow([]);
    newRow.getCell(itemCol!).value = 'Wedding Cake';
    newRow.getCell(costCol!).value = 500;
    const catCol = hm.get('category');
    if (catCol) newRow.getCell(catCol).value = 'catering';

    // ── re-import through the REAL procedure (fires recalc + broadcast) ──
    const result = await importWorkbook(wb);
    expect(result.errors, `import errors: ${JSON.stringify(result.errors)}`).toEqual([]);
    expect(result.updated).toBeGreaterThanOrEqual(1);
    expect(result.deleted).toBeGreaterThanOrEqual(1);
    expect(result.created).toBeGreaterThanOrEqual(1);

    // ── assert DB state ──
    const edited = (await db.execute(
      sql`SELECT estimated_cost, item, category, notes, created_at FROM budget WHERE id = ${IDS.budgetId}`,
    )) as unknown as Array<{ estimated_cost: string; item: string; category: string; notes: string; created_at: string }>;
    expect(Number(edited[0].estimated_cost)).toBe(1500); // EDIT applied
    expect(edited[0].item).toBe('Venue Hire'); // untouched present column preserved
    expect(edited[0].notes).toBe('KEEP'); // round-tripped present column preserved
    expect(String(edited[0].created_at)).toBe(createdAtBefore); // NON-DESTRUCTIVE: absent col not nulled

    const deleted = (await db.execute(
      sql`SELECT id FROM budget WHERE id = ${IDS.budgetId2}`,
    )) as unknown as Array<{ id: string }>;
    expect(deleted).toHaveLength(0); // DELETE applied

    const added = (await db.execute(
      sql`SELECT estimated_cost FROM budget WHERE client_id = ${IDS.clientId} AND item = 'Wedding Cake'`,
    )) as unknown as Array<{ estimated_cost: string }>;
    expect(added).toHaveLength(1); // ADD inserted, client-scoped
    expect(Number(added[0].estimated_cost)).toBe(500);

    // ── assert cascade: broadcast emitted the canonical BUDGET_MUTATION_PATHS ──
    const paths = await readSyncPaths(IDS.companyId);
    for (const p of BUDGET_MUTATION_PATHS) {
      expect(paths, `broadcast must include ${p}; got ${JSON.stringify(paths)}`).toContain(p);
    }
  });
});
