/**
 * C1a.6 — validateExcelFile() coverage (defect D1), asserted by RUNNING.
 *
 * Server parsers (budget/hotels/transport/vendors/events) call validateExcelFile() and
 * REJECT a file missing a REQUIRED header. The inline guests/guestGifts importers
 * (import.router.ts importGuest/importGuestGift) do NOT — they parse without upfront
 * validation (CLAUDE rule 28 violation).
 *
 * - `budget rejects malformed` is GREEN: proves the validated path works.
 * - `guests rejects malformed` is wrapped in it.fails(): it documents that guests
 *   currently does NOT reject. When Prompt 3 adds validateExcelFile to the inline
 *   importer, this it.fails() will start FAILING — a signal to flip it to it().
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import ExcelJS from 'exceljs';
import { IDS, resetDeterministic, teardownTenant } from '@/test-support/seed/deterministic-seed';
import { callerFor } from '@/test-support/audit-caller';

const caller = callerFor({ companyId: IDS.companyId, userId: IDS.userId });

/** Build a one-sheet .xlsx whose header row is MISSING the module's required column. */
async function malformedFile(sheetName: string, headers: string[]): Promise<string> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.addRow(headers);
  ws.addRow(headers.map(() => 'x')); // one junk data row
  const out = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  return Buffer.from(out).toString('base64');
}

describe('C1a.6 validateExcelFile coverage (D1)', () => {
  beforeAll(async () => {
    await resetDeterministic();
  });
  afterAll(async () => {
    await teardownTenant(IDS.companyId);
  });

  it('budget REJECTS a file missing required header (validated path works)', async () => {
    // Budget required header is "Item"; omit it.
    const fileData = await malformedFile('Budget', ['Category', 'Estimated Cost']);
    await expect(
      caller.import.importData({ module: 'budget', clientId: IDS.clientId, fileData }),
    ).rejects.toThrow();
  });

  // EXPECTED-FAIL scaffold: guests import lacks validateExcelFile, so a malformed file is
  // NOT rejected. it.fails() passes while the defect exists; it FAILS once D1 is fixed.
  it.fails('guests REJECTS a file missing required header (D1: currently does NOT)', async () => {
    const fileData = await malformedFile('Guests', ['Email']); // no name column
    await expect(
      caller.import.importData({ module: 'guests', clientId: IDS.clientId, fileData }),
    ).rejects.toThrow();
  });
});
