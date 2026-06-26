/**
 * Cluster E — column-SHAPE single-source contract.
 *
 * Proves the exporter and the import service consume ONE shape: import-cascade's
 * MODULE_SHEET_NAME + INLINE_IMPORT_VALIDATION are derived from MODULE_SHAPES (the SSOT),
 * so the sheet names + required headers the importer validates are exactly the labels the
 * exporter writes. Guards against the Cluster-E drift class (E1/E2/E3/C3) reappearing.
 *
 * Pure unit test (no DB / network).
 */
import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import {
  MODULE_SHAPES,
  buildExportSheet,
  cleanHeader,
  inlineValidationSpec,
  type ExportModule,
} from '@/lib/import/module-shape';
import { MODULE_SHEET_NAME, INLINE_IMPORT_VALIDATION } from '@/lib/import/import-cascade';

const COMBINED: ExportModule[] = [
  'guests', 'hotels', 'guestGifts', 'transport', 'vendors', 'budget', 'events', 'timeline',
];

describe('Cluster E — export/import column SHAPE is single-sourced', () => {
  it('every combined-export module has a non-empty, uniquely-keyed shape', () => {
    for (const m of COMBINED) {
      const shape = MODULE_SHAPES[m];
      expect(shape.sheet, `${m} must declare a sheet name`).toBeTruthy();
      expect(shape.columns.length, `${m} must declare columns`).toBeGreaterThan(0);
      const keys = shape.columns.map((c) => c.key);
      expect(new Set(keys).size, `${m} column keys must be unique`).toBe(keys.length);
      const headers = shape.columns.map((c) => c.header);
      expect(new Set(headers).size, `${m} headers must be unique`).toBe(headers.length);
    }
  });

  it('import-cascade sheet names are derived from the SSOT (no drift)', () => {
    // The modules whose combined-export sheet IS the import sheet must match the SSOT.
    expect(MODULE_SHEET_NAME.guests).toBe(MODULE_SHAPES.guests.sheet);
    expect(MODULE_SHEET_NAME.hotels).toBe(MODULE_SHAPES.hotels.sheet);
    expect(MODULE_SHEET_NAME.transport).toBe(MODULE_SHAPES.transport.sheet);
    expect(MODULE_SHEET_NAME.vendors).toBe(MODULE_SHAPES.vendors.sheet);
    expect(MODULE_SHEET_NAME.budget).toBe(MODULE_SHAPES.budget.sheet);
    expect(MODULE_SHEET_NAME.events).toBe(MODULE_SHAPES.events.sheet);
    expect(MODULE_SHEET_NAME.guestGifts).toBe(MODULE_SHAPES.guestGifts.sheet);
    expect(MODULE_SHEET_NAME.guestGifts).toBe('GiftsGiven');
  });

  it('inline validation (guests, guestGifts) is derived from the SSOT and self-consistent', () => {
    for (const m of ['guests', 'guestGifts'] as const) {
      const spec = INLINE_IMPORT_VALIDATION[m];
      expect(spec).toEqual(inlineValidationSpec(m));
      expect(spec.sheet).toBe(MODULE_SHAPES[m].sheet);
      expect(spec.required.length, `${m} must declare required headers`).toBeGreaterThan(0);
      // Every required header must actually be a (cleaned) header emitted by the exporter.
      const emitted = MODULE_SHAPES[m].columns.map((c) => cleanHeader(c.header));
      for (const r of spec.required) {
        expect(emitted, `${m} required '${r}' must be an emitted header`).toContain(r);
      }
    }
  });

  it('value fidelity: Date columns stay Date cells; text-cost stays raw (no Number coercion)', () => {
    const arrival = new Date('2027-06-15T09:30:00.000Z');
    // Guests: arrival/departure are timestamp columns → must export as a Date cell, not a
    // stringified locale form (else the round-trip degrades).
    const gWb = new ExcelJS.Workbook();
    const gWs = buildExportSheet(gWb, 'guests', [{ id: 'g1', firstName: 'A', lastName: 'B', arrivalDatetime: arrival }]);
    const gHeaders = MODULE_SHAPES.guests.columns.map((c) => c.header);
    const arrivalCol = gHeaders.indexOf('Arrival Date/Time') + 1;
    expect(gWs.getRow(2).getCell(arrivalCol).value, 'arrival must remain a Date cell').toBeInstanceOf(Date);

    // Budget: estimatedCost is a TEXT column → exported value stays the raw string.
    const bWb = new ExcelJS.Workbook();
    const bWs = buildExportSheet(bWb, 'budget', [{ id: 'b1', item: 'Cake', category: 'food', estimatedCost: '1200.50' }]);
    const bHeaders = MODULE_SHAPES.budget.columns.map((c) => c.header);
    const estCol = bHeaders.indexOf('Estimated Cost *') + 1;
    expect(bWs.getRow(2).getCell(estCol).value, 'text cost must export raw, not Number-coerced').toBe('1200.50');
  });

  it('buildExportSheet emits the SSOT headers in order, including every required field', async () => {
    for (const m of COMBINED) {
      const wb = new ExcelJS.Workbook();
      const ws = buildExportSheet(wb, m, [{}]); // one empty row exercises every formatter
      const headers: string[] = [];
      ws.getRow(1).eachCell((cell) => headers.push(String(cell.value ?? '')));
      expect(headers, `${m} export headers must match the SSOT order`).toEqual(
        MODULE_SHAPES[m].columns.map((c) => c.header),
      );
      // Required columns carry the '*' marker (C3) AND are cleaned-present.
      for (const c of MODULE_SHAPES[m].columns.filter((col) => col.required)) {
        expect(c.header, `${m} required header '${c.header}' must carry '*'`).toContain('*');
      }
    }
  });
});
