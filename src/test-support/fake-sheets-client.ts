/**
 * In-memory FakeSheetsClient — implements the minimal googleapis `sheets_v4.Sheets`
 * surface the sync engine actually uses (values.get/update/clear, batchUpdate, create),
 * backed by a per-sheet-name map. Injected via the authorized `SheetsClientFactory`
 * seam (sheets-client.ts) so Google Sheets sync is deterministically testable offline —
 * no real OAuth, network, or quota.
 *
 * Ranges look like `Budget!A:Z` / `Budget!A1`; we key state by the sheet name (before !).
 */
type Rows = unknown[][];

export class FakeSheetsClient {
  readonly sheets = new Map<string, Rows>();

  private name(range: string): string {
    return range.split('!')[0].replace(/^'|'$/g, '');
  }

  /** Seed/replace a sheet's contents directly (test helper). */
  setSheet(name: string, rows: Rows) {
    this.sheets.set(name, rows);
  }
  getSheet(name: string): Rows {
    return this.sheets.get(name) ?? [];
  }

  spreadsheets = {
    values: {
      get: async ({ range }: { spreadsheetId: string; range: string }) => ({
        data: { values: this.sheets.get(this.name(range)) ?? [] },
      }),
      clear: async ({ range }: { spreadsheetId: string; range: string }) => {
        this.sheets.delete(this.name(range));
        return { data: {} };
      },
      update: async ({
        range,
        requestBody,
      }: {
        spreadsheetId: string;
        range: string;
        valueInputOption?: string;
        requestBody: { values: Rows };
      }) => {
        this.sheets.set(this.name(range), requestBody.values ?? []);
        return { data: { updatedCells: (requestBody.values ?? []).length } };
      },
      append: async ({
        range,
        requestBody,
      }: {
        spreadsheetId: string;
        range: string;
        requestBody: { values: Rows };
      }) => {
        const cur = this.sheets.get(this.name(range)) ?? [];
        this.sheets.set(this.name(range), [...cur, ...(requestBody.values ?? [])]);
        return { data: {} };
      },
    },
    batchUpdate: async () => ({ data: {} }), // formatting (bold/freeze) — no-op offline
    create: async () => ({ data: { spreadsheetId: 'fake-spreadsheet-id' } }),
    get: async () => ({ data: { properties: { title: 'Fake' }, sheets: [] } }),
  };
}
