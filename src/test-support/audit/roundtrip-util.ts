/**
 * Shared mechanics for the Prompt-2 per-module Excel round-trip tests (ADDITIVE harness).
 * Mirrors the proven budget round-trip (excel-roundtrip.budget.test.ts) so every module
 * exercises the SAME real path: export.exportClientData (combined .xlsx) → edit the
 * module's sheet in exceljs → import.importData({module}) → caller fires recalc + broadcast.
 */
import ExcelJS from 'exceljs';
import { callerFor } from '@/test-support/audit-caller';
import { IDS } from '@/test-support/seed/deterministic-seed';

export const caller = callerFor({ companyId: IDS.companyId, userId: IDS.userId });

/** normalize an export header to its canonical token: lowercase, strip * and (...) text. */
export const norm = (h: string) =>
  h.toLowerCase().replace(/\(.*?\)/g, '').replace(/\*/g, '').trim();

/** Load the combined client-data workbook produced by the REAL export procedure. */
export async function exportCombinedWorkbook(clientId = IDS.clientId): Promise<ExcelJS.Workbook> {
  const res = await caller.export.exportClientData({ clientId, format: 'excel' });
  const buf = Buffer.from(res.data, 'base64');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
  return wb;
}

/** Map normalized header token → 1-based column index for a worksheet's header row. */
export function headerMap(ws: ExcelJS.Worksheet): Map<string, number> {
  const m = new Map<string, number>();
  ws.getRow(1).eachCell((cell, col) => m.set(norm(String(cell.value ?? '')), col));
  return m;
}

/** Append an "Action" column to the header row and return its 1-based index. */
export function addActionColumn(ws: ExcelJS.Worksheet, hm: Map<string, number>): number {
  const existing = hm.get('action');
  if (existing) return existing;
  const actionCol = (ws.columnCount || hm.size) + 1;
  ws.getRow(1).getCell(actionCol).value = 'Action';
  return actionCol;
}

/** Find the 1-based row index whose ID column equals `id`, or -1. */
export function findRowById(ws: ExcelJS.Worksheet, idCol: number, id: string): number {
  for (let r = 2; r <= ws.rowCount; r++) {
    if (String(ws.getRow(r).getCell(idCol).value ?? '').trim() === id) return r;
  }
  return -1;
}

/** Re-import a (possibly edited) workbook through the REAL importData procedure. */
export async function importWorkbook(
  wb: ExcelJS.Workbook,
  module: 'guests' | 'vendors' | 'budget' | 'gifts' | 'hotels' | 'transport' | 'guestGifts' | 'events',
  clientId = IDS.clientId,
) {
  const out = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  const fileData = Buffer.from(out).toString('base64');
  return caller.import.importData({ module, clientId, fileData });
}
