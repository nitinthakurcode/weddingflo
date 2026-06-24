/**
 * Server-side Excel Import functions (with DB access)
 *
 * Separated from excel-parser.ts to prevent server-only `postgres` driver
 * from being bundled into client components that import the pure-parser functions.
 */
import ExcelJS from 'exceljs';
import { db, eq, and } from '@/lib/db';
import { budget, hotels, guestTransport, vendors, clientVendors, events, timeline } from '@/lib/db/schema';
import { syncVendorBudgetItem, cascadeVendorLinkDelete } from '@/lib/sync/vendor-budget-sync';
import {
  validateExcelFile,
  buildPresentUpdate,
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
  EXPECTED_EVENT_HEADERS,
  REQUIRED_EVENT_HEADERS,
} from './excel-parser';

/**
 * A normalized Excel cell value: the primitive forms our importers understand.
 * ExcelJS's `.value` is a wider union (rich text, hyperlinks, formula results,
 * error cells) — feeding those straight into `String(...)` silently produced
 * "[object Object]" and corrupted the imported field. `normalizeCellValue`
 * unwraps the rich shapes to their underlying primitive and fails loud on any
 * shape we don't recognise, so a drift surfaces as a reported row error instead
 * of silent data loss.
 */
export type CellPrimitive = string | number | boolean | Date | null;

export function normalizeCellValue(value: ExcelJS.CellValue | undefined): CellPrimitive {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') {
    return value as CellPrimitive;
  }
  const obj = value as unknown as Record<string, unknown>;
  // Hyperlink cell: { text, hyperlink }
  if (typeof obj.text === 'string') return obj.text;
  // Rich text cell: { richText: [{ text }, ...] }
  if (Array.isArray(obj.richText)) {
    return (obj.richText as Array<{ text?: string }>).map((r) => r?.text ?? '').join('');
  }
  // Formula cell: { formula, result } — recurse on the computed result.
  if ('result' in obj) return normalizeCellValue(obj.result as ExcelJS.CellValue);
  // Error cell: { error } — treat as empty rather than importing "#REF!" etc.
  if ('error' in obj) return null;
  throw new Error(
    `Unsupported Excel cell value shape (refusing to import silently): ${JSON.stringify(value)}`,
  );
}

/**
 * Import Budget from Excel
 * February 2026 - Full round-trip import with upsert support
 *
 * Reads budget rows from the 'Budget' sheet, validates headers,
 * and upserts into the budget table (update if ID matches, insert otherwise).
 */
/**
 * Returns true when a spreadsheet row's "Action" column marks it for deletion.
 * Mirrors the explicit, opt-in delete pattern (no row is ever deleted unless the
 * user types DELETE/REMOVE in the Action column for a row that has a matching ID).
 */
function isDeleteMarker(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v === 'delete' || v === 'remove';
}

export async function importBudgetExcel(
  buffer: Buffer,
  clientId: string,
  companyId: string,
): Promise<{ inserted: number; updated: number; deleted: number; skipped: number; errors: string[] }> {
  const results = { inserted: 0, updated: 0, deleted: 0, skipped: 0, errors: [] as string[] };

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
  const getRawCell = (row: ExcelJS.Row, header: string): CellPrimitive => {
    const colIndex = headerMap.get(header.toLowerCase());
    if (!colIndex) return null;
    return normalizeCellValue(row.getCell(colIndex).value);
  };

  // Helper to get cell as trimmed string
  const getCell = (row: ExcelJS.Row, header: string): string => {
    const raw = getRawCell(row, header);
    if (raw === null || raw === undefined) return '';
    return String(raw).trim();
  };

  // Helper to parse date values (handles ExcelJS Date objects, ISO strings, formatted dates)
  const parseDate = (value: CellPrimitive): string | null => {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date) return value.toISOString().split('T')[0];
    const strVal = String(value).trim();
    if (!strVal) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(strVal)) return strVal;
    const parsed = new Date(strVal);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
  };

  // Helper to parse currency/numeric values (handles both string and number cell values)
  const parseCurrency = (value: CellPrimitive): string | null => {
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

      // Explicit delete: row marked DELETE in the Action column with a matching ID
      if (isDeleteMarker(getCell(row, 'action'))) {
        if (id && existingIds.has(id)) {
          await db.delete(budget).where(and(eq(budget.id, id), eq(budget.clientId, clientId)));
          results.deleted++;
        } else {
          results.skipped++;
        }
        continue;
      }

      const item = getCell(row, 'item');
      const category = getCell(row, 'category');
      const segment = getCell(row, 'segment');
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

      // Skip the export's "TOTAL" summary row (no ID, no category) so re-import
      // doesn't materialize a phantom budget item.
      if (item.toLowerCase() === 'total' && !id && !category) {
        results.skipped++;
        continue;
      }

      const budgetData = {
        item,
        category: category || 'other',
        segment: segment || null,
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

      // Upsert: if ID matches existing record for this clientId → UPDATE.
      // Only overwrite columns present in the uploaded file (non-destructive).
      if (id && existingIds.has(id)) {
        await db.update(budget)
          .set(buildPresentUpdate(headerMap, budgetData, {
            item: 'item',
            category: 'category',
            segment: 'segment',
            description: 'description',
            estimatedCost: 'estimated cost',
            actualCost: 'actual cost',
            paidAmount: 'paid amount',
            paymentStatus: 'payment status',
            transactionDate: 'transaction date',
            perGuestCost: 'per guest cost',
            notes: 'notes',
          }))
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
    } catch (error: unknown) {
      results.errors.push(`Row ${rowIdx}: ${error instanceof Error ? error.message : String(error)}`);
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
): Promise<{ inserted: number; updated: number; deleted: number; skipped: number; errors: string[] }> {
  const results = { inserted: 0, updated: 0, deleted: 0, skipped: 0, errors: [] as string[] };

  // Support both "Hotels" (master export / standard) and "Hotel Accommodations" (individual export)
  let headerMap: Map<string, number>;
  let hotelSheetName = 'Hotels';
  try {
    ({ headerMap } = await validateExcelFile(
      buffer, EXPECTED_HOTEL_HEADERS, REQUIRED_HOTEL_HEADERS, 'Hotels',
    ));
  } catch (e: unknown) {
    if (!(e instanceof Error) || !e.message.includes('not found')) throw e;
    ({ headerMap } = await validateExcelFile(
      buffer, EXPECTED_HOTEL_HEADERS, REQUIRED_HOTEL_HEADERS, 'Hotel Accommodations',
    ));
    hotelSheetName = 'Hotel Accommodations';
  }

  const workbook = new ExcelJS.Workbook();
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  await workbook.xlsx.load(ab as ArrayBuffer);
  const worksheet = workbook.getWorksheet(hotelSheetName);

  if (!worksheet) {
    results.errors.push(`No "${hotelSheetName}" sheet found`);
    return results;
  }

  const getRawCell = (row: ExcelJS.Row, header: string): CellPrimitive => {
    const colIndex = headerMap.get(header.toLowerCase());
    if (!colIndex) return null;
    return normalizeCellValue(row.getCell(colIndex).value);
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

      // Explicit delete: row marked DELETE in the Action column with a matching ID
      if (isDeleteMarker(getCell(row, 'action'))) {
        if (id && existingIds.has(id)) {
          await db.delete(hotels).where(and(eq(hotels.id, id), eq(hotels.clientId, clientId)));
          results.deleted++;
        } else {
          results.skipped++;
        }
        continue;
      }

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
          .set(buildPresentUpdate(headerMap, hotelData, {
            guestName: 'guest name',
            hotelName: 'hotel name',
            roomNumber: 'room number',
            roomType: 'room type',
            checkInDate: 'check in date',
            checkOutDate: 'check out date',
            accommodationNeeded: 'accommodation needed',
            bookingConfirmed: 'booking confirmed',
            checkedIn: 'checked in',
            cost: 'cost',
            currency: 'currency',
            paymentStatus: 'payment status',
            partySize: 'party size',
            notes: 'notes',
          }))
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
    } catch (error: unknown) {
      results.errors.push(`Row ${rowIdx}: ${error instanceof Error ? error.message : String(error)}`);
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
): Promise<{ inserted: number; updated: number; deleted: number; skipped: number; errors: string[] }> {
  const results = { inserted: 0, updated: 0, deleted: 0, skipped: 0, errors: [] as string[] };

  let headerMap: Map<string, number>;
  let sheetName = 'Guest Transport';
  try {
    ({ headerMap } = await validateExcelFile(
      buffer, EXPECTED_TRANSPORT_HEADERS, REQUIRED_TRANSPORT_HEADERS, 'Guest Transport',
    ));
  } catch (e: unknown) {
    if (!(e instanceof Error) || !e.message.includes('not found')) throw e;
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

  const getRawCell = (row: ExcelJS.Row, header: string): CellPrimitive => {
    const colIndex = headerMap.get(header.toLowerCase());
    if (!colIndex) return null;
    return normalizeCellValue(row.getCell(colIndex).value);
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

      // Explicit delete: row marked DELETE in the Action column with a matching ID
      if (isDeleteMarker(getCell(row, 'action'))) {
        if (id && existingIds.has(id)) {
          await db.delete(guestTransport).where(and(eq(guestTransport.id, id), eq(guestTransport.clientId, clientId)));
          results.deleted++;
        } else {
          results.skipped++;
        }
        continue;
      }

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
          .set(buildPresentUpdate(headerMap, transportData, {
            guestName: 'guest name',
            pickupDate: 'pickup date',
            pickupTime: 'pickup time',
            pickupFrom: 'pickup from',
            dropTo: 'drop to',
            transportStatus: 'transport status',
            vehicleInfo: 'vehicle info',
            vehicleType: 'vehicle type',
            driverPhone: 'driver phone',
            legType: 'leg type',
            legSequence: 'leg sequence',
            notes: 'notes',
          }))
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
    } catch (error: unknown) {
      results.errors.push(`Row ${rowIdx}: ${error instanceof Error ? error.message : String(error)}`);
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
): Promise<{ inserted: number; updated: number; deleted: number; skipped: number; errors: string[] }> {
  const results = { inserted: 0, updated: 0, deleted: 0, skipped: 0, errors: [] as string[] };

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

  const getRawCell = (row: ExcelJS.Row, header: string): CellPrimitive => {
    const colIndex = headerMap.get(header.toLowerCase());
    if (!colIndex) return null;
    return normalizeCellValue(row.getCell(colIndex).value);
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

  // Event lookup for the "Event" column round-trip: title → eventId. The export
  // writes the event title; importing it back must re-link the vendor to the
  // correct event (clientVendors.eventId + the linked budget item's eventId).
  const eventRows = await db
    .select({ id: events.id, title: events.title })
    .from(events)
    .where(eq(events.clientId, clientId));
  const eventByTitle = new Map(
    eventRows
      .filter((e) => !!e.title)
      .map((e) => [e.title!.toLowerCase().trim(), e.id]),
  );
  const hasEventCol = headerMap.has('event');

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

      // Explicit delete: row marked DELETE in the Action column removes this
      // vendor's association with the client (the global vendor record is kept).
      if (isDeleteMarker(getCell(row, 'action'))) {
        if (id) {
          const removed = await db
            .delete(clientVendors)
            .where(and(
              eq(clientVendors.vendorId, id),
              eq(clientVendors.clientId, clientId),
              eq(clientVendors.companyId, companyId),
            ))
            .returning({ id: clientVendors.id });
          if (removed.length > 0) {
            results.deleted++;
            // Fire the same cascade as vendors.router.delete: remove the linked
            // budget line + timeline entry so the delete propagates cross-module.
            await cascadeVendorLinkDelete(db, {
              clientId,
              vendorId: id,
              clientVendorId: removed[0].id,
            });
            linkedVendorIds.delete(id);
          } else {
            results.skipped++;
          }
        } else {
          results.skipped++;
        }
        continue;
      }

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

      const isExistingVendor = !!(id && existingIds.has(id));
      const vendorId = isExistingVendor ? id : (id || crypto.randomUUID());

      // ── Global vendor record (vendors table) ──
      if (isExistingVendor) {
        // Non-destructive: only overwrite columns present in the uploaded file.
        await db.update(vendors)
          .set(buildPresentUpdate(headerMap, vendorData, {
            name: 'name',
            category: 'category',
            contactName: 'contact name',
            email: 'email',
            phone: 'phone',
            website: 'website',
            address: 'address',
            contractSigned: 'contract signed',
            contractDate: 'contract date',
            rating: 'rating',
            isPreferred: 'is preferred',
            notes: 'notes',
          }))
          .where(and(eq(vendors.id, vendorId), eq(vendors.companyId, companyId)));
        results.updated++;
      } else {
        await db.insert(vendors).values({
          id: vendorId,
          companyId,
          ...vendorData,
        });
        results.inserted++;
      }

      // ── Per-client relationship (client_vendors junction) — full fidelity ──
      // Payment/approval/service-date/on-site fields live here, not on `vendors`.
      const clientVendorData = {
        venueAddress: getCell(row, 'venue address') || null,
        onsitePocName: getCell(row, 'onsite poc name') || null,
        onsitePocPhone: getCell(row, 'onsite poc phone') || null,
        onsitePocNotes: getCell(row, 'onsite poc notes') || null,
        deliverables: getCell(row, 'deliverables') || null,
        contractAmount: parseExcelCurrency(getRawCell(row, 'contract amount')),
        depositAmount: parseExcelCurrency(getRawCell(row, 'deposit amount')),
        serviceDate: getCell(row, 'service date') || null,
        paymentStatus: getCell(row, 'payment status') || null,
        approvalStatus: getCell(row, 'approval status') || null,
        approvalComments: getCell(row, 'approval comments') || null,
        updatedAt: new Date(),
      };
      const cvPresent = buildPresentUpdate(headerMap, clientVendorData, {
        venueAddress: 'venue address',
        onsitePocName: 'onsite poc name',
        onsitePocPhone: 'onsite poc phone',
        onsitePocNotes: 'onsite poc notes',
        deliverables: 'deliverables',
        contractAmount: 'contract amount',
        depositAmount: 'deposit amount',
        serviceDate: 'service date',
        paymentStatus: 'payment status',
        approvalStatus: 'approval status',
        approvalComments: 'approval comments',
      });

      // Resolve the "Event" column → eventId for round-trip event re-linking.
      //   undefined = column absent          → leave existing event link untouched
      //   null      = column present + blank  → unassign
      //   <id>      = column present + match  → link to that event
      let resolvedEventId: string | null | undefined = undefined;
      if (hasEventCol) {
        const eventName = getCell(row, 'event');
        if (!eventName) {
          resolvedEventId = null;
        } else {
          const match = eventByTitle.get(eventName.toLowerCase());
          if (match) {
            resolvedEventId = match;
          } else {
            results.errors.push(`Row ${rowIdx}: event "${eventName}" not found — vendor's event left unchanged`);
          }
        }
      }
      if (resolvedEventId !== undefined) {
        (cvPresent as Record<string, unknown>).eventId = resolvedEventId;
      }

      if (linkedVendorIds.has(vendorId)) {
        // Only touch the link when the file actually carries per-client columns.
        if (Object.keys(cvPresent).length > 1) {
          await db.update(clientVendors)
            .set(cvPresent)
            .where(and(
              eq(clientVendors.clientId, clientId),
              eq(clientVendors.vendorId, vendorId),
              eq(clientVendors.companyId, companyId),
            ));
        }
      } else {
        await db.insert(clientVendors).values({
          id: crypto.randomUUID(),
          clientId,
          vendorId,
          companyId,
          ...cvPresent,
        }).onConflictDoNothing();
        linkedVendorIds.add(vendorId);
      }

      // Vendor → budget automation (parity with vendors.router create/update):
      // keep the linked budget item's cost / deposit / payment / event in sync,
      // creating it when missing. Only pass columns actually present in the file
      // so the import stays non-destructive. recalcClientStats runs in the caller.
      await syncVendorBudgetItem(db, {
        clientId,
        companyId,
        vendorId,
        vendorName: name,
        ...(headerMap.has('contract amount') ? { cost: clientVendorData.contractAmount } : {}),
        ...(headerMap.has('deposit amount') ? { depositAmount: clientVendorData.depositAmount } : {}),
        ...(headerMap.has('payment status') ? { paymentStatus: clientVendorData.paymentStatus } : {}),
        ...(resolvedEventId !== undefined ? { eventId: resolvedEventId } : {}),
      });
    } catch (error: unknown) {
      results.errors.push(`Row ${rowIdx}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return results;
}

/**
 * Import Events from Excel
 * June 2026 - Full round-trip import with upsert + delete-on-Action support.
 *
 * Reads event rows from the 'Events' sheet, validates headers, and upserts into
 * the events table (update if ID matches, insert otherwise). A DELETE-marked row
 * (matching ID) is hard-deleted; the schema's onDelete:'set null' FKs unassign
 * any linked vendors/budget/timeline rather than orphaning them, and we also
 * remove the event's auto-generated timeline items to match the UI delete.
 */
export async function importEventsExcel(
  buffer: Buffer,
  clientId: string,
  companyId: string,
): Promise<{ inserted: number; updated: number; deleted: number; skipped: number; errors: string[] }> {
  const results = { inserted: 0, updated: 0, deleted: 0, skipped: 0, errors: [] as string[] };

  // ── Upfront header validation ──
  const { headerMap } = await validateExcelFile(
    buffer, EXPECTED_EVENT_HEADERS, REQUIRED_EVENT_HEADERS, 'Events',
  );

  // ── Load workbook for data processing ──
  const workbook = new ExcelJS.Workbook();
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  await workbook.xlsx.load(ab as ArrayBuffer);
  const worksheet = workbook.getWorksheet('Events') || workbook.getWorksheet(1);

  if (!worksheet) {
    results.errors.push('No worksheet found');
    return results;
  }

  const getRawCell = (row: ExcelJS.Row, header: string): CellPrimitive => {
    const colIndex = headerMap.get(header.toLowerCase());
    if (!colIndex) return null;
    return normalizeCellValue(row.getCell(colIndex).value);
  };
  const getCell = (row: ExcelJS.Row, header: string): string => {
    const raw = getRawCell(row, header);
    if (raw === null || raw === undefined) return '';
    return String(raw).trim();
  };
  const parseDate = (value: CellPrimitive): string | null => {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date) return value.toISOString().split('T')[0];
    const strVal = String(value).trim();
    if (!strVal) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(strVal)) return strVal;
    const parsed = new Date(strVal);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
  };
  const parseIntOrNull = (value: CellPrimitive): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const num = parseInt(String(value).replace(/[^0-9-]/g, ''), 10);
    return isNaN(num) ? null : num;
  };

  // ── Existing event IDs for upsert matching (events are client-owned) ──
  const existingItems = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.clientId, clientId));
  const existingIds = new Set(existingItems.map((e) => e.id));

  const totalRows = worksheet.rowCount;

  for (let rowIdx = 2; rowIdx <= totalRows; rowIdx++) {
    const row = worksheet.getRow(rowIdx);
    if (!row.hasValues) continue;

    // Skip the hints row (row 2 in enhanced export format)
    const firstCellStr = String(row.getCell(1).value || '').toLowerCase();
    const secondCellStr = String(row.getCell(2).value || '').toLowerCase();
    const hintsPatterns = [
      'do not modify', 'required', 'yyyy-mm-dd', 'hh:mm', 'numbers only',
      'optional', 'e.g.', 'planned/', 'format:',
    ];
    if (hintsPatterns.some((p) => firstCellStr.includes(p) || secondCellStr.includes(p))) {
      continue;
    }

    try {
      const id = getCell(row, 'id');

      // Explicit delete: row marked DELETE in the Action column with a matching ID
      if (isDeleteMarker(getCell(row, 'action'))) {
        if (id && existingIds.has(id)) {
          // Remove the event's auto-generated timeline items first (UI-delete parity);
          // FK set-null handles vendor/budget/timeline.eventId unassignment.
          await db.delete(timeline).where(
            and(
              eq(timeline.sourceModule, 'events'),
              eq(timeline.sourceId, id),
              eq(timeline.clientId, clientId),
            ),
          );
          await db.delete(events).where(and(eq(events.id, id), eq(events.clientId, clientId)));
          results.deleted++;
        } else {
          results.skipped++;
        }
        continue;
      }

      const title = getCell(row, 'title');

      // Skip rows where title is empty (required field)
      if (!title) {
        results.skipped++;
        continue;
      }

      const eventData = {
        title,
        eventType: getCell(row, 'event type') || null,
        eventDate: parseDate(getRawCell(row, 'event date')),
        startTime: getCell(row, 'start time') || null,
        endTime: getCell(row, 'end time') || null,
        location: getCell(row, 'location') || null,
        venueName: getCell(row, 'venue name') || null,
        address: getCell(row, 'address') || null,
        guestCount: parseIntOrNull(getRawCell(row, 'guest count')),
        status: getCell(row, 'status') || 'planned',
        description: getCell(row, 'description') || null,
        notes: getCell(row, 'notes') || null,
        updatedAt: new Date(),
      };

      // Upsert: ID matches existing record for this clientId → non-destructive UPDATE.
      if (id && existingIds.has(id)) {
        await db.update(events)
          .set(buildPresentUpdate(headerMap, eventData, {
            title: 'title',
            eventType: 'event type',
            eventDate: 'event date',
            startTime: 'start time',
            endTime: 'end time',
            location: 'location',
            venueName: 'venue name',
            address: 'address',
            guestCount: 'guest count',
            status: 'status',
            description: 'description',
            notes: 'notes',
          }))
          .where(and(eq(events.id, id), eq(events.clientId, clientId)));
        results.updated++;
      } else {
        await db.insert(events).values({
          id: id || crypto.randomUUID(),
          clientId,
          companyId,
          ...eventData,
        });
        results.inserted++;
      }
    } catch (error: unknown) {
      results.errors.push(`Row ${rowIdx}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return results;
}
