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

  // FIXED (D1): the inline guests importer now calls validateExcelFile up front, so a file
  // whose 'Guests' sheet is missing the required name column is REJECTED (CLAUDE rule 28).
  // H4: assert the SPECIFIC up-front validation rejection ("Missing required column …"),
  // not merely "some throw" — an unrelated failure (NOT-NULL insert, FORBIDDEN, missing
  // worksheet) must NOT be able to masquerade as "D1 fixed".
  it('guests REJECTS a file missing required header (D1 fixed)', async () => {
    const fileData = await malformedFile('Guests', ['Email']); // no name column
    await expect(
      caller.import.importData({ module: 'guests', clientId: IDS.clientId, fileData }),
    ).rejects.toThrow(/Missing required column/i);
  });

  // FIXED (D1): gifts inline importer likewise validates — a 'Gifts' sheet missing the
  // required 'Gift Name' column is rejected before any parsing (H4: specific message).
  it('gifts REJECTS a file missing required header (D1 fixed)', async () => {
    const fileData = await malformedFile('Gifts', ['Value']); // no gift name column
    await expect(
      caller.import.importData({ module: 'gifts', clientId: IDS.clientId, fileData }),
    ).rejects.toThrow(/Missing required column/i);
  });
});
