/**
 * Server-side Excel Import functions (with DB access)
 *
 * Separated from excel-parser.ts to prevent server-only `postgres` driver
 * from being bundled into client components that import the pure-parser functions.
 */
import ExcelJS from 'exceljs';
import { db, eq, and } from '@/lib/db';
import { budget, hotels, guestTransport, vendors, clientVendors } from '@/lib/db/schema';
import {
  validateExcelFile,
  parseExcelBoolean,
  parseExcelCurrency,
  parseExcelDate,
  parseExcelTime,
  parseExcelInteger,
  EXPECTED_BUDGET_HEADERS,
  REQUIRED_BUDGET_HEADERS,
  EXPECTED_HOTEL_HEADERS,
  REQUIRED_HOTEL_HEADERS,
  EXPECTED_TRANSPORT_HEADERS,
  REQUIRED_TRANSPORT_HEADERS,
  EXPECTED_VENDOR_HEADERS,
  REQUIRED_VENDOR_HEADERS,
} from './excel-parser';

/**
 * Import Budget from Excel
 * February 2026 - Full round-trip import with upsert support
 *
 * Reads budget rows from the 'Budget' sheet, validates headers,
 * and upserts into the budget table (update if ID matches, insert otherwise).
 */
export async function importBudgetExcel(
  buffer: Buffer,
  clientId: string,
  companyId: string,
): Promise<{ inserted: number; updated: number; skipped: number; errors: string[] }> {
  const results = { inserted: 0, updated: 0, skipped: 0, errors: [] as string[] };

  // ── Upfront header validation ──
  const { headerMap } = await validateExcelFile(
    buffer, EXPECTED_BUDGET_HEADERS, REQUIRED_BUDGET_HEADERS, 'Budget',
  );

  // ── Load workbook for data processing ──
  const workbook = new ExcelJS.Workbook();
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  await workbook.xlsx.load(ab as ArrayBuffer);
  const worksheet = workbook.getWorksheet('Budget') || workbook.getWorksheet(1);

  if (!worksheet) {
    results.errors.push('No worksheet found');
    return results;
  }

  // Helper to get raw cell value by header name (case-insensitive)
  const getRawCell = (row: ExcelJS.Row, header: string): any => {
    const colIndex = headerMap.get(header.toLowerCase());
    if (!colIndex) return null;
    return row.getCell(colIndex).value ?? null;
  };

  // Helper to get cell as trimmed string
  const getCell = (row: ExcelJS.Row, header: string): string => {
    const raw = getRawCell(row, header);
    if (raw === null || raw === undefined) return '';
    return String(raw).trim();
  };

  // Helper to parse date values (handles ExcelJS Date objects, ISO strings, formatted dates)
  const parseDate = (value: any): string | null => {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date) return value.toISOString().split('T')[0];
    const strVal = String(value).trim();
    if (!strVal) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(strVal)) return strVal;
    const parsed = new Date(strVal);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
  };

  // Helper to parse currency/numeric values (handles both string and number cell values)
  const parseCurrency = (value: any): string | null => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return String(value);
    const cleaned = String(value).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : String(num);
  };

  // ── Get existing budget items for upsert matching ──
  const existingItems = await db
    .select({ id: budget.id })
    .from(budget)
    .where(eq(budget.clientId, clientId));
  const existingIds = new Set(existingItems.map((b) => b.id));

  // ── Process data rows (row 1 = headers, row 2+ = data/hints) ──
  const totalRows = worksheet.rowCount;

  for (let rowIdx = 2; rowIdx <= totalRows; rowIdx++) {
    const row = worksheet.getRow(rowIdx);

    // Skip empty rows
    if (!row.hasValues) continue;

    // Skip hints row (row 2 in enhanced export format)
    const firstCellStr = String(row.getCell(1).value || '').toLowerCase();
    const secondCellStr = String(row.getCell(2).value || '').toLowerCase();
    const hintsPatterns = [
      'do not modify', 'required', 'yyyy-mm-dd', 'numbers only',
      'optional', 'e.g.', 'pending/', 'format:',
    ];
    if (hintsPatterns.some((p) => firstCellStr.includes(p) || secondCellStr.includes(p))) {
      continue;
    }

    try {
      const id = getCell(row, 'id');
      const item = getCell(row, 'item');
      const category = getCell(row, 'category');
      const description = getCell(row, 'description');
      const estimatedCost = parseCurrency(getRawCell(row, 'estimated cost'));
      const actualCost = parseCurrency(getRawCell(row, 'actual cost'));
      const paidAmount = parseCurrency(getRawCell(row, 'paid amount'));
      const paymentStatus = getCell(row, 'payment status');
      const transactionDate = parseDate(getRawCell(row, 'transaction date'));
      const perGuestCost = parseCurrency(getRawCell(row, 'per guest cost'));
      const notes = getCell(row, 'notes');

      // Skip rows where item is empty (required field)
      if (!item) {
        results.skipped++;
        continue;
      }

      const budgetData = {
        item,
        category: category || 'other',
        description: description || null,
        estimatedCost: estimatedCost || '0',
        actualCost,
        paidAmount: paidAmount || '0',
        paymentStatus: paymentStatus || 'pending',
        transactionDate,
        perGuestCost,
        notes: notes || null,
        updatedAt: new Date(),
      };

      // Upsert: if ID matches existing record for this clientId → UPDATE
      if (id && existingIds.has(id)) {
        await db.update(budget)
          .set(budgetData)
          .where(and(eq(budget.id, id), eq(budget.clientId, clientId)));
        results.updated++;
      } else {
        // INSERT with new generated ID
        await db.insert(budget).values({
          id: id || crypto.randomUUID(),
          clientId,
          companyId,
          ...budgetData,
        });
        results.inserted++;
      }
    } catch (error: any) {
      results.errors.push(`Row ${rowIdx}: ${error.message}`);
    }
  }

  return results;
}

/**
 * Import Hotels from Excel
 * February 2026 - Full round-trip import with upsert support
 */
export async function importHotelsExcel(
  buffer: Buffer,
  clientId: string,
  companyId: string,
): Promise<{ inserted: number; updated: number; skipped: number; errors: string[] }> {
  const results = { inserted: 0, updated: 0, skipped: 0, errors: [] as string[] };

  const { headerMap } = await validateExcelFile(
    buffer, EXPECTED_HOTEL_HEADERS, REQUIRED_HOTEL_HEADERS, 'Hotels',
  );

  const workbook = new ExcelJS.Workbook();
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  await workbook.xlsx.load(ab as ArrayBuffer);
  const worksheet = workbook.getWorksheet('Hotels');

  if (!worksheet) {
    results.errors.push('No "Hotels" sheet found');
    return results;
  }

  const getRawCell = (row: ExcelJS.Row, header: string): any => {
    const colIndex = headerMap.get(header.toLowerCase());
    if (!colIndex) return null;
    return row.getCell(colIndex).value ?? null;
  };

  const getCell = (row: ExcelJS.Row, header: string): string => {
    const raw = getRawCell(row, header);
    if (raw === null || raw === undefined) return '';
    return String(raw).trim();
  };

  const existingItems = await db
    .select({ id: hotels.id })
    .from(hotels)
    .where(eq(hotels.clientId, clientId));
  const existingIds = new Set(existingItems.map((h) => h.id));

  const totalRows = worksheet.rowCount;

  for (let rowIdx = 2; rowIdx <= totalRows; rowIdx++) {
    const row = worksheet.getRow(rowIdx);
    if (!row.hasValues) continue;

    const firstCellStr = String(row.getCell(1).value || '').toLowerCase();
    const secondCellStr = String(row.getCell(2).value || '').toLowerCase();
    const hintsPatterns = [
      'do not modify', 'required', 'yyyy-mm-dd', 'numbers only',
      'optional', 'e.g.', 'true/false', 'format:',
    ];
    if (hintsPatterns.some((p) => firstCellStr.includes(p) || secondCellStr.includes(p))) {
      continue;
    }

    try {
      const id = getCell(row, 'id');
      const guestName = getCell(row, 'guest name');

      if (!guestName) {
        results.skipped++;
        continue;
      }

      const hotelData = {
        guestName,
        hotelName: getCell(row, 'hotel name') || null,
        roomNumber: getCell(row, 'room number') || null,
        roomType: getCell(row, 'room type') || null,
        checkInDate: parseExcelDate(getRawCell(row, 'check in date')),
        checkOutDate: parseExcelDate(getRawCell(row, 'check out date')),
        accommodationNeeded: parseExcelBoolean(getRawCell(row, 'accommodation needed')) ?? true,
        bookingConfirmed: parseExcelBoolean(getRawCell(row, 'booking confirmed')) ?? false,
        checkedIn: parseExcelBoolean(getRawCell(row, 'checked in')) ?? false,
        cost: parseExcelCurrency(getRawCell(row, 'cost')),
        currency: getCell(row, 'currency') || 'USD',
        paymentStatus: getCell(row, 'payment status') || 'pending',
        partySize: parseExcelInteger(getRawCell(row, 'party size'), 1),
        notes: getCell(row, 'notes') || null,
        updatedAt: new Date(),
      };

      if (id && existingIds.has(id)) {
        await db.update(hotels)
          .set(hotelData)
          .where(and(eq(hotels.id, id), eq(hotels.clientId, clientId)));
        results.updated++;
      } else {
        await db.insert(hotels).values({
          id: id || crypto.randomUUID(),
          clientId,
          companyId,
          ...hotelData,
        });
        results.inserted++;
      }
    } catch (error: any) {
      results.errors.push(`Row ${rowIdx}: ${error.message}`);
    }
  }

  return results;
}

/**
 * Import Transport from Excel
 * February 2026 - Full round-trip import with upsert support
 */
export async function importTransportExcel(
  buffer: Buffer,
  clientId: string,
  companyId: string,
): Promise<{ inserted: number; updated: number; skipped: number; errors: string[] }> {
  const results = { inserted: 0, updated: 0, skipped: 0, errors: [] as string[] };

  let headerMap: Map<string, number>;
  let sheetName = 'Guest Transport';
  try {
    ({ headerMap } = await validateExcelFile(
      buffer, EXPECTED_TRANSPORT_HEADERS, REQUIRED_TRANSPORT_HEADERS, 'Guest Transport',
    ));
  } catch (e: any) {
    if (!e.message?.includes('not found')) throw e;
    ({ headerMap } = await validateExcelFile(
      buffer, EXPECTED_TRANSPORT_HEADERS, REQUIRED_TRANSPORT_HEADERS, 'Transport',
    ));
    sheetName = 'Transport';
  }

  const workbook = new ExcelJS.Workbook();
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  await workbook.xlsx.load(ab as ArrayBuffer);
  const worksheet = workbook.getWorksheet(sheetName);

  if (!worksheet) {
    results.errors.push(`No "${sheetName}" sheet found`);
    return results;
  }

  const getRawCell = (row: ExcelJS.Row, header: string): any => {
    const colIndex = headerMap.get(header.toLowerCase());
    if (!colIndex) return null;
    return row.getCell(colIndex).value ?? null;
  };

  const getCell = (row: ExcelJS.Row, header: string): string => {
    const raw = getRawCell(row, header);
    if (raw === null || raw === undefined) return '';
    return String(raw).trim();
  };

  const VALID_LEG_TYPES = ['arrival', 'departure', 'inter_event'];

  const existingItems = await db
    .select({ id: guestTransport.id })
    .from(guestTransport)
    .where(eq(guestTransport.clientId, clientId));
  const existingIds = new Set(existingItems.map((t) => t.id));

  const totalRows = worksheet.rowCount;

  for (let rowIdx = 2; rowIdx <= totalRows; rowIdx++) {
    const row = worksheet.getRow(rowIdx);
    if (!row.hasValues) continue;

    const firstCellStr = String(row.getCell(1).value || '').toLowerCase();
    const secondCellStr = String(row.getCell(2).value || '').toLowerCase();
    const hintsPatterns = [
      'do not modify', 'required', 'yyyy-mm-dd', 'hh:mm',
      'optional', 'e.g.', 'format:', 'arrival/',
    ];
    if (hintsPatterns.some((p) => firstCellStr.includes(p) || secondCellStr.includes(p))) {
      continue;
    }

    try {
      const id = getCell(row, 'id');
      const guestName = getCell(row, 'guest name');

      if (!guestName) {
        results.skipped++;
        continue;
      }

      const rawLegType = getCell(row, 'leg type').toLowerCase();
      const legType = VALID_LEG_TYPES.includes(rawLegType)
        ? (rawLegType as 'arrival' | 'departure' | 'inter_event')
        : 'arrival';

      const transportData = {
        guestName,
        pickupDate: parseExcelDate(getRawCell(row, 'pickup date')),
        pickupTime: parseExcelTime(getRawCell(row, 'pickup time')),
        pickupFrom: getCell(row, 'pickup from') || null,
        dropTo: getCell(row, 'drop to') || null,
        transportStatus: getCell(row, 'transport status') || 'scheduled',
        vehicleInfo: getCell(row, 'vehicle info') || null,
        vehicleType: getCell(row, 'vehicle type') || null,
        driverPhone: getCell(row, 'driver phone') || null,
        legType,
        legSequence: parseExcelInteger(getRawCell(row, 'leg sequence'), 1),
        notes: getCell(row, 'notes') || null,
        updatedAt: new Date(),
      };

      if (id && existingIds.has(id)) {
        await db.update(guestTransport)
          .set(transportData)
          .where(and(eq(guestTransport.id, id), eq(guestTransport.clientId, clientId)));
        results.updated++;
      } else {
        await db.insert(guestTransport).values({
          id: id || crypto.randomUUID(),
          clientId,
          companyId,
          ...transportData,
        });
        results.inserted++;
      }
    } catch (error: any) {
      results.errors.push(`Row ${rowIdx}: ${error.message}`);
    }
  }

  return results;
}

/**
 * Import Vendors from Excel
 * February 2026 - Full round-trip import with upsert support
 */
export async function importVendorsExcel(
  buffer: Buffer,
  clientId: string,
  companyId: string,
): Promise<{ inserted: number; updated: number; skipped: number; errors: string[] }> {
  const results = { inserted: 0, updated: 0, skipped: 0, errors: [] as string[] };

  const { headerMap } = await validateExcelFile(
    buffer, EXPECTED_VENDOR_HEADERS, REQUIRED_VENDOR_HEADERS, 'Vendors',
  );

  const workbook = new ExcelJS.Workbook();
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  await workbook.xlsx.load(ab as ArrayBuffer);
  const worksheet = workbook.getWorksheet('Vendors');

  if (!worksheet) {
    results.errors.push('No "Vendors" sheet found');
    return results;
  }

  const getRawCell = (row: ExcelJS.Row, header: string): any => {
    const colIndex = headerMap.get(header.toLowerCase());
    if (!colIndex) return null;
    return row.getCell(colIndex).value ?? null;
  };

  const getCell = (row: ExcelJS.Row, header: string): string => {
    const raw = getRawCell(row, header);
    if (raw === null || raw === undefined) return '';
    return String(raw).trim();
  };

  const existingItems = await db
    .select({ id: vendors.id })
    .from(vendors)
    .where(eq(vendors.companyId, companyId));
  const existingIds = new Set(existingItems.map((v) => v.id));

  const existingLinks = await db
    .select({ vendorId: clientVendors.vendorId })
    .from(clientVendors)
    .where(eq(clientVendors.clientId, clientId));
  const linkedVendorIds = new Set(existingLinks.map((l) => l.vendorId));

  const totalRows = worksheet.rowCount;

  for (let rowIdx = 2; rowIdx <= totalRows; rowIdx++) {
    const row = worksheet.getRow(rowIdx);
    if (!row.hasValues) continue;

    const firstCellStr = String(row.getCell(1).value || '').toLowerCase();
    const secondCellStr = String(row.getCell(2).value || '').toLowerCase();
    const hintsPatterns = [
      'do not modify', 'required', 'yyyy-mm-dd', 'numbers only',
      'optional', 'e.g.', 'true/false', 'format:',
    ];
    if (hintsPatterns.some((p) => firstCellStr.includes(p) || secondCellStr.includes(p))) {
      continue;
    }

    try {
      const id = getCell(row, 'id');
      const name = getCell(row, 'name');

      if (!name) {
        results.skipped++;
        continue;
      }

      const rawRating = getRawCell(row, 'rating');
      let rating: number | null = null;
      if (rawRating !== null && rawRating !== undefined && rawRating !== '') {
        const parsed = typeof rawRating === 'number' ? rawRating : parseFloat(String(rawRating));
        if (!isNaN(parsed)) {
          rating = Math.round(Math.max(0, Math.min(5, parsed)));
        }
      }

      const vendorData = {
        name,
        category: getCell(row, 'category') || 'other',
        contactName: getCell(row, 'contact name') || null,
        email: getCell(row, 'email') || null,
        phone: getCell(row, 'phone') || null,
        website: getCell(row, 'website') || null,
        address: getCell(row, 'address') || null,
        contractSigned: parseExcelBoolean(getRawCell(row, 'contract signed')) ?? false,
        contractDate: parseExcelDate(getRawCell(row, 'contract date')),
        rating,
        isPreferred: parseExcelBoolean(getRawCell(row, 'is preferred')) ?? false,
        notes: getCell(row, 'notes') || null,
        updatedAt: new Date(),
      };

      if (id && existingIds.has(id)) {
        await db.update(vendors)
          .set(vendorData)
          .where(and(eq(vendors.id, id), eq(vendors.companyId, companyId)));
        results.updated++;
      } else {
        const newVendorId = id || crypto.randomUUID();
        await db.insert(vendors).values({
          id: newVendorId,
          companyId,
          ...vendorData,
        });

        if (!linkedVendorIds.has(newVendorId)) {
          await db.insert(clientVendors).values({
            id: crypto.randomUUID(),
            clientId,
            vendorId: newVendorId,
          }).onConflictDoNothing();
          linkedVendorIds.add(newVendorId);
        }

        results.inserted++;
      }
    } catch (error: any) {
      results.errors.push(`Row ${rowIdx}: ${error.message}`);
    }
  }

  return results;
}
