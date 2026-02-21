/**
 * Excel Export utilities
 * Uses ExcelJS for creating Excel exports (secure replacement for xlsx)
 */

import ExcelJS from 'exceljs';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  hint?: string; // Format hint for row 2
  validation?: {
    type: 'list' | 'boolean';
    options?: string[]; // For list type
  };
}

export interface ExcelSheet {
  name: string;
  columns: ExcelColumn[];
  data: Array<Record<string, any>>;
}

export interface ExcelOptions {
  filename?: string;
  sheetName?: string;
  includeDate?: boolean;
}

export interface EnhancedExcelOptions extends ExcelOptions {
  includeHints?: boolean; // Add format hints row
  freezeRows?: number; // Number of rows to freeze (default: 2 if hints enabled)
  autoFilter?: boolean; // Add auto-filter to headers
}

/**
 * Generate Excel workbook with single sheet
 */
export function generateExcel(
  columns: ExcelColumn[],
  data: Array<Record<string, any>>,
  options: ExcelOptions = {}
): ExcelJS.Workbook {
  const { sheetName = 'Sheet1' } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'WeddingFlo';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName);

  // Set columns with headers and widths
  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || 15,
  }));

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // Add data rows
  data.forEach((row) => {
    const rowData: Record<string, any> = {};
    columns.forEach((col) => {
      rowData[col.key] = row[col.key] ?? '';
    });
    worksheet.addRow(rowData);
  });

  return workbook;
}

/**
 * Generate Enhanced Excel workbook with format hints, data validation, frozen rows
 * January 2026 - Standard format for all WeddingFlo exports
 *
 * Features:
 * - Row 1: Header row (blue background, white text, bold)
 * - Row 2: Format hints row (yellow background, italic, explains how to fill each column)
 * - Data validation dropdowns for list/boolean columns
 * - Frozen header rows for easy scrolling
 * - Auto-filter for easy sorting/filtering
 */
export function generateExcelWithHints(
  columns: ExcelColumn[],
  data: Array<Record<string, any>>,
  options: EnhancedExcelOptions = {}
): ExcelJS.Workbook {
  const {
    sheetName = 'Sheet1',
    includeHints = true,
    freezeRows = includeHints ? 2 : 1,
    autoFilter = true,
  } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'WeddingFlo';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName);

  // Set columns with headers and widths
  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || 15,
  }));

  // Style header row (row 1) - Blue background, white text
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }, // Blue
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 25;

  // Add format hints row (row 2) if enabled
  if (includeHints) {
    const hintsData: Record<string, string> = {};
    columns.forEach((col) => {
      hintsData[col.key] = col.hint || '';
    });
    const hintsRow = worksheet.addRow(hintsData);
    hintsRow.font = { italic: true, size: 9, color: { argb: 'FF666666' } };
    hintsRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF2CC' }, // Light yellow
    };
    hintsRow.alignment = { vertical: 'middle', horizontal: 'center' };
    hintsRow.height = 20;
  }

  // Add data rows
  data.forEach((row) => {
    const rowData: Record<string, any> = {};
    columns.forEach((col) => {
      rowData[col.key] = row[col.key] ?? '';
    });
    worksheet.addRow(rowData);
  });

  // Add data validation for columns that specify it
  const dataRowStart = includeHints ? 3 : 2;
  const dataRowEnd = data.length + (includeHints ? 2 : 1);

  if (data.length > 0) {
    columns.forEach((col, colIndex) => {
      if (col.validation) {
        const colNum = colIndex + 1;
        for (let row = dataRowStart; row <= dataRowEnd; row++) {
          if (col.validation.type === 'boolean') {
            worksheet.getCell(row, colNum).dataValidation = {
              type: 'list',
              allowBlank: true,
              formulae: ['"TRUE,FALSE"'],
            };
          } else if (col.validation.type === 'list' && col.validation.options) {
            worksheet.getCell(row, colNum).dataValidation = {
              type: 'list',
              allowBlank: true,
              formulae: [`"${col.validation.options.join(',')}"`],
            };
          }
        }
      }
    });
  }

  // Freeze rows
  if (freezeRows > 0) {
    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: freezeRows }];
  }

  // Add auto-filter
  if (autoFilter && columns.length > 0) {
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };
  }

  return workbook;
}

/**
 * Generate Excel workbook with multiple sheets
 */
export function generateMultiSheetExcel(sheets: ExcelSheet[]): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'WeddingFlo';
  workbook.created = new Date();

  sheets.forEach((sheet) => {
    const worksheet = workbook.addWorksheet(sheet.name);

    // Set columns
    worksheet.columns = sheet.columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || 15,
    }));

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    sheet.data.forEach((row) => {
      const rowData: Record<string, any> = {};
      sheet.columns.forEach((col) => {
        rowData[col.key] = row[col.key] ?? '';
      });
      worksheet.addRow(rowData);
    });
  });

  return workbook;
}

/**
 * Download Excel file (browser)
 */
export async function downloadExcel(workbook: ExcelJS.Workbook, filename: string = 'export.xlsx'): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get Excel buffer (for server-side use)
 */
export async function getExcelBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/**
 * Export guest list to Excel
 * Updated January 2026 - Comprehensive guest export with separate date/time columns
 * Includes per-member hotel/transport requirements and format instructions
 * Based on research from WeddingWire, The Knot, Vertex42, and top wedding planners
 * Accepts both camelCase (from Drizzle ORM) and snake_case field names
 */
export async function exportGuestListExcel(
  guests: Array<{
    // CamelCase (Drizzle ORM)
    id?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    checkedIn?: boolean;
    groupName?: string;
    guestSide?: string;
    dietaryRestrictions?: string;
    mealPreference?: string;
    plusOneAllowed?: boolean;
    plusOneName?: string;
    rsvpStatus?: string;
    hotelRequired?: boolean;
    transportRequired?: boolean;
    partySize?: number;
    additionalGuestNames?: string[];
    arrivalDatetime?: string | Date;
    arrivalMode?: string;
    departureDatetime?: string | Date;
    departureMode?: string;
    relationshipToFamily?: string;
    attendingEvents?: string[];
    giftToGive?: string;
    notes?: string;
    // Per-member requirements stored in metadata
    metadata?: {
      partyMemberRequirements?: Record<string, { hotelRequired?: boolean; transportRequired?: boolean }>;
      [key: string]: any;
    };
    // Snake_case (legacy/alternative)
    first_name?: string;
    last_name?: string;
    checked_in?: boolean;
    group_name?: string;
    guest_side?: string;
    dietary_restrictions?: string;
    meal_preference?: string;
    plus_one_allowed?: boolean;
    plus_one_name?: string;
    rsvp_status?: string;
    hotel_required?: boolean;
    transport_required?: boolean;
    party_size?: number;
    additional_guest_names?: string[];
    arrival_datetime?: string;
    arrival_mode?: string;
    departure_datetime?: string;
    departure_mode?: string;
    relationship_to_family?: string;
    attending_events?: string[];
    gift_to_give?: string;
  }>,
  options: ExcelOptions = {}
): Promise<void> {
  // Helper to extract date from datetime
  const extractDate = (val: string | Date | undefined): string => {
    if (!val) return '';
    if (val instanceof Date) return val.toISOString().split('T')[0];
    // Try to parse as date
    const dateStr = String(val);
    if (dateStr.includes('T')) return dateStr.split('T')[0];
    // If it's already just a date, return it
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    // Try to parse
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
  };

  // Helper to extract time from datetime (returns HH:mm format)
  const extractTime = (val: string | Date | undefined): string => {
    if (!val) return '';
    if (val instanceof Date) {
      const hours = val.getHours().toString().padStart(2, '0');
      const mins = val.getMinutes().toString().padStart(2, '0');
      return `${hours}:${mins}`;
    }
    // Try to parse as datetime
    const dateStr = String(val);
    if (dateStr.includes('T')) {
      const timePart = dateStr.split('T')[1];
      if (timePart) return timePart.substring(0, 5);
    }
    // Check if it looks like a time already
    if (/^\d{2}:\d{2}/.test(dateStr)) return dateStr.substring(0, 5);
    return '';
  };

  // Create workbook manually to add instructions row
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'WeddingFlo';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Guests');

  // Define columns with headers
  const columns = [
    { header: 'ID', key: 'id', width: 38, hint: 'Do not modify' },
    { header: 'Guest Name', key: 'name', width: 25, hint: 'Required - Full name' },
    { header: 'Email', key: 'email', width: 28, hint: 'email@example.com' },
    { header: 'Phone', key: 'phone', width: 18, hint: '+1234567890' },
    { header: 'Group', key: 'group', width: 18, hint: 'Family name or group' },
    { header: 'Side', key: 'side', width: 12, hint: 'bride_side/groom_side/mutual' },
    { header: 'RSVP', key: 'rsvp', width: 12, hint: 'pending/accepted/declined' },
    { header: 'Party Size', key: 'partySize', width: 12, hint: 'Number (1, 2, 3...)' },
    { header: 'Additional Guests', key: 'additionalGuests', width: 35, hint: 'Comma-separated names' },
    { header: 'Relationship', key: 'relationship', width: 20, hint: 'e.g. friend, cousin, uncle' },
    { header: 'Events', key: 'attendingEvents', width: 30, hint: 'Comma-separated event names' },
    { header: 'Arrival Date', key: 'arrivalDate', width: 14, hint: 'YYYY-MM-DD' },
    { header: 'Arrival Time', key: 'arrivalTime', width: 12, hint: 'HH:MM (24hr)' },
    { header: 'Arrival Mode', key: 'arrivalMode', width: 15, hint: 'flight/train/car/bus' },
    { header: 'Departure Date', key: 'departureDate', width: 14, hint: 'YYYY-MM-DD' },
    { header: 'Departure Time', key: 'departureTime', width: 12, hint: 'HH:MM (24hr)' },
    { header: 'Departure Mode', key: 'departureMode', width: 15, hint: 'flight/train/car/bus' },
    { header: 'Meal', key: 'mealPreference', width: 12, hint: 'veg/non-veg/vegan' },
    { header: 'Dietary', key: 'dietary', width: 25, hint: 'Allergies or restrictions' },
    { header: 'Hotel (Primary)', key: 'hotelPrimary', width: 15, hint: 'TRUE/FALSE' },
    { header: 'Transport (Primary)', key: 'transportPrimary', width: 18, hint: 'TRUE/FALSE' },
    { header: 'Per-Member Hotel', key: 'perMemberHotel', width: 40, hint: 'name1:TRUE, name2:FALSE' },
    { header: 'Per-Member Transport', key: 'perMemberTransport', width: 40, hint: 'name1:TRUE, name2:FALSE' },
    { header: 'Gift Received', key: 'gift', width: 25, hint: 'Gift description' },
    { header: 'Notes', key: 'notes', width: 35, hint: 'Special notes' },
    { header: 'Checked In', key: 'checkedIn', width: 12, hint: 'TRUE/FALSE' },
  ];

  // Set columns
  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width,
  }));

  // Style header row (row 1)
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }, // Blue header
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 30;

  // Add format hints row (row 2)
  const hintsRow = worksheet.addRow(columns.reduce((obj, col) => {
    obj[col.key] = col.hint;
    return obj;
  }, {} as Record<string, string>));
  hintsRow.font = { italic: true, size: 9, color: { argb: 'FF666666' } };
  hintsRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFF2CC' }, // Light yellow
  };
  hintsRow.alignment = { vertical: 'middle', horizontal: 'center' };
  hintsRow.height = 20;

  // Process guest data
  guests.forEach((guest: any) => {
    // Support both camelCase and snake_case
    const firstName = guest.firstName || guest.first_name || '';
    const lastName = guest.lastName || guest.last_name || '';
    const additionalNames = guest.additionalGuestNames || guest.additional_guest_names || [];
    const attendingEvents = guest.attendingEvents || guest.attending_events || [];
    const arrivalDt = guest.arrivalDatetime || guest.arrival_datetime;
    const departureDt = guest.departureDatetime || guest.departure_datetime;

    // Combine firstName and lastName into single Name field
    const fullName = [firstName, lastName].filter(Boolean).join(' ');

    // Extract per-member requirements from metadata
    const metadata = guest.metadata || {};
    const partyMemberReqs = metadata.partyMemberRequirements || {};

    // Format per-member hotel/transport requirements for ALL party members
    // Include primary guest + all additional guests for complete picture
    const perMemberHotelArr: string[] = [];
    const perMemberTransportArr: string[] = [];

    // Get primary guest's hotel/transport status
    const primaryHotel = guest.hotelRequired ?? guest.hotel_required ?? false;
    const primaryTransport = guest.transportRequired ?? guest.transport_required ?? false;

    // Only build per-member data if there's a party (partySize > 1 or has additional guests)
    const partySize = guest.partySize || guest.party_size || 1;
    const hasAdditionalGuests = Array.isArray(additionalNames) && additionalNames.length > 0;

    if (partySize > 1 || hasAdditionalGuests) {
      // Add primary guest first
      const primaryName = fullName || firstName || 'Primary';
      perMemberHotelArr.push(`${primaryName}:${primaryHotel ? 'TRUE' : 'FALSE'}`);
      perMemberTransportArr.push(`${primaryName}:${primaryTransport ? 'TRUE' : 'FALSE'}`);

      // Add all additional guests
      const additionalNamesList = Array.isArray(additionalNames) ? additionalNames : [];
      additionalNamesList.forEach((memberName: string) => {
        const memberReqs = partyMemberReqs[memberName] || {};
        // Default to FALSE if not explicitly set
        const memberHotel = memberReqs.hotelRequired ?? false;
        const memberTransport = memberReqs.transportRequired ?? false;
        perMemberHotelArr.push(`${memberName}:${memberHotel ? 'TRUE' : 'FALSE'}`);
        perMemberTransportArr.push(`${memberName}:${memberTransport ? 'TRUE' : 'FALSE'}`);
      });
    }

    worksheet.addRow({
      id: guest.id || '',
      name: fullName || '',
      email: guest.email || '',
      phone: guest.phone || '',
      group: guest.groupName || guest.group_name || '',
      side: guest.guestSide || guest.guest_side || '',
      rsvp: guest.rsvpStatus || guest.rsvp_status || 'pending',
      partySize: guest.partySize || guest.party_size || 1,
      additionalGuests: Array.isArray(additionalNames) ? additionalNames.join(', ') : (additionalNames || ''),
      relationship: guest.relationshipToFamily || guest.relationship_to_family || '',
      attendingEvents: Array.isArray(attendingEvents) ? attendingEvents.join(', ') : (attendingEvents || ''),
      arrivalDate: extractDate(arrivalDt),
      arrivalTime: extractTime(arrivalDt),
      arrivalMode: guest.arrivalMode || guest.arrival_mode || '',
      departureDate: extractDate(departureDt),
      departureTime: extractTime(departureDt),
      departureMode: guest.departureMode || guest.departure_mode || '',
      mealPreference: guest.mealPreference || guest.meal_preference || '',
      dietary: guest.dietaryRestrictions || guest.dietary_restrictions || '',
      hotelPrimary: (guest.hotelRequired ?? guest.hotel_required) ? 'TRUE' : 'FALSE',
      transportPrimary: (guest.transportRequired ?? guest.transport_required) ? 'TRUE' : 'FALSE',
      perMemberHotel: perMemberHotelArr.join(', '),
      perMemberTransport: perMemberTransportArr.join(', '),
      gift: guest.giftToGive || guest.gift_to_give || '',
      notes: guest.notes || '',
      checkedIn: (guest.checkedIn ?? guest.checked_in) ? 'TRUE' : 'FALSE',
    });
  });

  // Add data validation dropdowns for certain columns
  const dataRowStart = 3; // Data starts at row 3 (after header + hints)
  const dataRowEnd = guests.length + 2;

  if (guests.length > 0) {
    // RSVP status dropdown
    const rsvpCol = columns.findIndex(c => c.key === 'rsvp') + 1;
    if (rsvpCol > 0) {
      for (let row = dataRowStart; row <= dataRowEnd; row++) {
        worksheet.getCell(row, rsvpCol).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"pending,accepted,declined"'],
        };
      }
    }

    // Side dropdown
    const sideCol = columns.findIndex(c => c.key === 'side') + 1;
    if (sideCol > 0) {
      for (let row = dataRowStart; row <= dataRowEnd; row++) {
        worksheet.getCell(row, sideCol).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"bride_side,groom_side,mutual"'],
        };
      }
    }

    // Boolean dropdowns for hotel/transport/checkedIn
    const booleanCols = ['hotelPrimary', 'transportPrimary', 'checkedIn'];
    booleanCols.forEach(colKey => {
      const colIdx = columns.findIndex(c => c.key === colKey) + 1;
      if (colIdx > 0) {
        for (let row = dataRowStart; row <= dataRowEnd; row++) {
          worksheet.getCell(row, colIdx).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: ['"TRUE,FALSE"'],
          };
        }
      }
    });
  }

  // Freeze header and hints rows
  worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];

  // Add auto-filter to header row
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  await downloadExcel(workbook, options.filename || `guest-list-${Date.now()}.xlsx`);
}

/**
 * Export budget report to Excel
 * January 2026 - Enhanced with format hints and data validation
 */
export async function exportBudgetExcel(
  budgetItems: Array<{
    item?: string;
    expense_details?: string;
    category: string;
    estimated_cost?: number;
    actual_cost?: number;
    transaction_date?: string;
    events?: { title: string } | null;
    advance_payments?: Array<{
      amount: number;
      payment_date: string;
      paid_by: string;
      notes?: string | null;
    }>;
    total_advance?: number;
    balance_remaining?: number;
    payment_status?: string;
    notes?: string;
  }>,
  options: ExcelOptions = {}
): Promise<void> {
  const columns: ExcelColumn[] = [
    { header: 'Expense Name', key: 'expenseName', width: 30, hint: 'Required - Expense name' },
    { header: 'Expense Details', key: 'details', width: 35, hint: 'Description of expense' },
    { header: 'Category', key: 'category', width: 20, hint: 'venue/catering/decor/etc.', validation: { type: 'list', options: ['venue', 'catering', 'photography', 'videography', 'decor', 'entertainment', 'attire', 'beauty', 'transportation', 'stationery', 'gifts', 'other'] } },
    { header: 'Event', key: 'event', width: 20, hint: 'Associated event name' },
    { header: 'Budgeted Amount', key: 'budget', width: 18, hint: 'Numbers only' },
    { header: 'Transaction Date', key: 'transactionDate', width: 18, hint: 'YYYY-MM-DD' },
    { header: 'Total Paid', key: 'totalAdvance', width: 15, hint: 'Numbers only' },
    { header: 'Balance Due', key: 'balance', width: 15, hint: 'Auto-calculated' },
    { header: 'Payment History', key: 'advanceDetails', width: 45, hint: 'Payment details' },
    { header: 'Payment Status', key: 'status', width: 18, hint: 'pending/partial/paid/overdue', validation: { type: 'list', options: ['pending', 'partial', 'paid', 'overdue'] } },
    { header: 'Special Notes', key: 'notes', width: 40, hint: 'Additional notes' },
  ];

  const data = budgetItems.map((item) => {
    const advanceDetails = item.advance_payments?.map(adv =>
      `$${Number(adv.amount).toLocaleString()} on ${new Date(adv.payment_date).toLocaleDateString()} by ${adv.paid_by}${adv.notes ? ` (${adv.notes})` : ''}`
    ).join('; ') || '';

    return {
      expenseName: item.item || item.expense_details || '',
      details: item.expense_details || '',
      category: item.category,
      event: item.events?.title || '',
      budget: item.estimated_cost || 0,
      transactionDate: item.transaction_date ? new Date(item.transaction_date).toISOString().split('T')[0] : '',
      totalAdvance: item.total_advance || 0,
      balance: item.balance_remaining || (item.estimated_cost || 0),
      advanceDetails,
      status: item.payment_status || 'pending',
      notes: item.notes || '',
    };
  });

  // Add summary row
  const totalBudget = budgetItems.reduce((sum, item) => sum + (item.estimated_cost || 0), 0);
  const totalAdvances = budgetItems.reduce((sum, item) => sum + (item.total_advance || 0), 0);
  const totalBalance = totalBudget - totalAdvances;

  data.push({
    expenseName: 'TOTAL',
    details: '',
    category: '',
    event: '',
    budget: totalBudget,
    transactionDate: '',
    totalAdvance: totalAdvances,
    balance: totalBalance,
    advanceDetails: '',
    status: '',
    notes: '',
  });

  const workbook = generateExcelWithHints(columns, data, {
    sheetName: 'Budget',
    includeHints: true,
    ...options,
  });

  await downloadExcel(workbook, options.filename || `budget-report-${Date.now()}.xlsx`);
}

/**
 * Export hotel accommodations to Excel
 * Updated December 2025 to support both camelCase and snake_case field names
 */
export async function exportHotelListExcel(
  hotels: Array<{
    // CamelCase (Drizzle ORM)
    id?: string;
    guestId?: string | null;
    guestName?: string;
    partySize?: number;
    guestNamesInRoom?: string | null;
    roomAssignments?: Record<string, { guests: string[]; roomType?: string }> | null; // Multi-room support
    accommodationNeeded?: boolean;
    hotelName?: string | null;
    roomNumber?: string | null;
    roomType?: string | null;
    checkInDate?: string | null;
    checkOutDate?: string | null;
    checkedIn?: boolean;
    bookingConfirmed?: boolean;
    cost?: string | number | null;
    paymentStatus?: string | null;
    notes?: string | null;
    // Snake_case (legacy)
    guest_id?: string;
    guest_name?: string;
    party_size?: number;
    guest_names_in_room?: string;
    room_assignments?: Record<string, { guests: string[]; roomType?: string }>;
    accommodation_needed?: boolean;
    hotel_name?: string;
    room_number?: string;
    room_type?: string;
    check_in_date?: string;
    check_out_date?: string;
    checked_in?: boolean;
    booking_confirmed?: boolean;
    payment_status?: string;
    // Nested guest data
    guests?: {
      email?: string | null;
      phone?: string | null;
      partySize?: number;
      party_size?: number;
      additionalGuestNames?: string[] | null;
      additional_guest_names?: string[] | null;
      arrivalDatetime?: string | null;
      arrival_datetime?: string | null;
      departureDatetime?: string | null;
      departure_datetime?: string | null;
      relationshipToFamily?: string | null;
      relationship_to_family?: string | null;
    } | null;
  }>,
  options: ExcelOptions = {}
): Promise<void> {
  // MUST match import template EXACTLY for round-trip editing
  const columns: ExcelColumn[] = [
    { header: 'ID (Do not modify)', key: 'id', width: 40 },
    { header: 'Guest ID (Do not modify)', key: 'guestId', width: 40 },
    { header: 'Guest Name * (Required)', key: 'guestName', width: 25 },
    { header: 'Relationship (from guest list)', key: 'relationship', width: 28 },
    { header: 'Additional Guest Names (from guest list)', key: 'additionalGuestNames', width: 35 },
    { header: 'Guests in Room (Single: john, mary | Multi: 143: john, mary | 144: sue)', key: 'guestNamesInRoom', width: 50 },
    { header: '# Total Party Size', key: 'partySize', width: 18 },
    { header: 'Email Address', key: 'email', width: 28 },
    { header: 'Phone Number', key: 'phone', width: 18 },
    { header: 'Need Hotel? (Yes/No)', key: 'accommodationNeeded', width: 18 },
    { header: 'Hotel Name', key: 'hotelName', width: 25 },
    { header: 'Room Number (Single: 143 | Multi: 143, 144)', key: 'roomNumber', width: 35 },
    { header: 'Room Type (Suite/Deluxe...)', key: 'roomType', width: 23 },
    { header: 'Check-In (YYYY-MM-DD)', key: 'checkInDate', width: 20 },
    { header: 'Check-Out (YYYY-MM-DD)', key: 'checkOutDate', width: 20 },
    { header: 'Booking Confirmed (Yes/No)', key: 'bookingConfirmed', width: 23 },
    { header: 'Checked In (Yes/No)', key: 'checkedIn', width: 18 },
    { header: 'Room Cost (numbers only)', key: 'cost', width: 22 },
    { header: 'Payment (pending/paid/overdue)', key: 'paymentStatus', width: 28 },
    { header: 'Special Notes', key: 'notes', width: 40 },
  ];

  const data = hotels.map((hotel) => {
    // Support both camelCase and snake_case
    const id = hotel.id || '';
    const guestId = hotel.guestId || hotel.guest_id || '';
    const guestName = hotel.guestName || hotel.guest_name || '';
    const accommodationNeeded = hotel.accommodationNeeded ?? hotel.accommodation_needed ?? true;
    const hotelName = hotel.hotelName || hotel.hotel_name || '';
    const bookingConfirmed = hotel.bookingConfirmed ?? hotel.booking_confirmed ?? false;
    const checkedIn = hotel.checkedIn ?? hotel.checked_in ?? false;
    const paymentStatus = hotel.paymentStatus || hotel.payment_status || '';

    // Check if multi-room assignments exist
    const roomAssignments = hotel.roomAssignments || hotel.room_assignments;
    const hasMultiRoom = roomAssignments && typeof roomAssignments === 'object' && Object.keys(roomAssignments).length > 0;

    // Handle room numbers and types
    let roomNumber = '';
    let roomType = '';
    let guestNamesInRoom = '';
    let partySize = hotel.partySize || hotel.party_size || 1;

    if (hasMultiRoom) {
      // Multi-room assignment: format as "143, 144" for room numbers
      const roomNums = Object.keys(roomAssignments);
      roomNumber = roomNums.join(', ');

      // Get room types (use first room's type or comma-separated if different)
      const roomTypes = roomNums.map(num => roomAssignments[num]?.roomType || '').filter(Boolean);
      roomType = roomTypes.length > 0 ? [...new Set(roomTypes)].join(', ') : '';

      // Format guest names per room: "143: first, ape | 144: monk"
      guestNamesInRoom = roomNums
        .map(num => `${num}: ${roomAssignments[num].guests.join(', ')}`)
        .join(' | ');

      // Calculate total party size from all rooms
      partySize = roomNums.reduce((total, num) => {
        return total + (roomAssignments[num]?.guests?.length || 0);
      }, 0);
    } else {
      // Single room or legacy format
      roomNumber = hotel.roomNumber || hotel.room_number || '';
      roomType = hotel.roomType || hotel.room_type || '';
      guestNamesInRoom = hotel.guestNamesInRoom || hotel.guest_names_in_room || '';
    }

    // Auto-populate check-in/check-out from guest arrival/departure if not set
    const arrivalDate = hotel.guests?.arrivalDatetime || hotel.guests?.arrival_datetime
    const departureDate = hotel.guests?.departureDatetime || hotel.guests?.departure_datetime
    const checkInDate = hotel.checkInDate || hotel.check_in_date ||
      (arrivalDate ? new Date(arrivalDate).toISOString().split('T')[0] : '')
    const checkOutDate = hotel.checkOutDate || hotel.check_out_date ||
      (departureDate ? new Date(departureDate).toISOString().split('T')[0] : '')

    // Get additional guest names from linked guest record
    const additionalGuestNames = hotel.guests?.additionalGuestNames || hotel.guests?.additional_guest_names || null
    const additionalNamesString = additionalGuestNames
      ? (Array.isArray(additionalGuestNames) ? additionalGuestNames.join(', ') : String(additionalGuestNames))
      : ''

    return {
      id,
      guestId,
      guestName,
      relationship: hotel.guests?.relationshipToFamily || hotel.guests?.relationship_to_family || '',
      additionalGuestNames: additionalNamesString,
      guestNamesInRoom, // Shows which specific guests are in which rooms
      partySize,
      email: hotel.guests?.email || '',
      phone: hotel.guests?.phone || '',
      accommodationNeeded: accommodationNeeded ? 'Yes' : 'No',
      hotelName,
      roomNumber,
      roomType,
      checkInDate,
      checkOutDate,
      bookingConfirmed: bookingConfirmed ? 'Yes' : 'No',
      checkedIn: checkedIn ? 'Yes' : 'No',
      cost: hotel.cost || '',
      paymentStatus,
      notes: hotel.notes || '',
    };
  });

  // Create workbook manually to add instructions
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'WeddingFlo';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Hotel Accommodations');

  // Add instruction rows at the top
  worksheet.addRow(['INSTRUCTIONS: Hotel Room Assignments']);
  worksheet.addRow(['']);
  worksheet.addRow(['Single Room Format:', 'Room Number: 143', 'Guests in Room: john, mary']);
  worksheet.addRow(['Multi-Room Format:', 'Room Number: 143, 144', 'Guests in Room: 143: john, mary | 144: sue']);
  worksheet.addRow(['']);
  worksheet.addRow(['Use the pipe character "|" to separate different rooms']);
  worksheet.addRow(['Use "RoomNumber: guest1, guest2" to show which guests are in each room']);
  worksheet.addRow(['']);

  // Style instruction rows
  worksheet.getRow(1).font = { bold: true, size: 14, color: { argb: 'FF0066CC' } };
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F2FF' } };
  worksheet.getRow(3).font = { italic: true };
  worksheet.getRow(4).font = { italic: true };
  worksheet.getRow(6).font = { italic: true, color: { argb: 'FF666666' } };
  worksheet.getRow(7).font = { italic: true, color: { argb: 'FF666666' } };

  // Merge cells for instruction header
  worksheet.mergeCells('A1:D1');

  // Add blank row before data
  worksheet.addRow(['']);

  // Set columns with headers and widths (row 10)
  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || 15,
  }));

  // Style header row
  const headerRow = worksheet.getRow(10);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // Add data rows
  data.forEach((row) => {
    const rowData: Record<string, any> = {};
    columns.forEach((col) => {
      rowData[col.key] = (row as Record<string, any>)[col.key] ?? '';
    });
    worksheet.addRow(rowData);
  });

  // Add cell comments to Room Number and Guests in Room columns
  const roomNumberCol = columns.findIndex(c => c.key === 'roomNumber') + 1;
  const guestsInRoomCol = columns.findIndex(c => c.key === 'guestNamesInRoom') + 1;

  if (roomNumberCol > 0) {
    const cell = worksheet.getCell(10, roomNumberCol);
    cell.note = {
      texts: [{ text: 'Single room: 143\nMultiple rooms: 143, 144 (comma-separated)' }],
      margins: { insetmode: 'auto' },
    };
  }

  if (guestsInRoomCol > 0) {
    const cell = worksheet.getCell(10, guestsInRoomCol);
    cell.note = {
      texts: [{ text: 'Single room: john, mary\nMultiple rooms: 143: john, mary | 144: sue\n\nFormat: RoomNumber: guest1, guest2 | RoomNumber: guest3' }],
      margins: { insetmode: 'auto' },
    };
  }

  await downloadExcel(workbook, options.filename || `hotel-accommodations-${Date.now()}.xlsx`);
}

/**
 * Export vendor list to Excel
 * January 2026 - Enhanced with format hints and data validation
 */
export async function exportVendorListExcel(
  vendors: Array<{
    name: string;
    category: string;
    contact_name?: string;
    phone?: string;
    email?: string;
    payment_status?: string;
    contract_amount?: number;
    deposit_amount?: number;
    service_date?: string;
    event_title?: string;
    venue_address?: string;
    onsite_poc_name?: string;
    onsite_poc_phone?: string;
    onsite_poc_notes?: string;
    deliverables?: string;
    approval_status?: string;
    approval_comments?: string;
  }>,
  options: ExcelOptions = {}
): Promise<void> {
  const columns: ExcelColumn[] = [
    { header: 'Vendor Name', key: 'name', width: 30, hint: 'Required - Vendor/company name' },
    { header: 'Service Category', key: 'category', width: 20, hint: 'catering/photo/video/etc.', validation: { type: 'list', options: ['venue', 'catering', 'photography', 'videography', 'florist', 'dj', 'band', 'makeup', 'mehendi', 'decor', 'lighting', 'transportation', 'cake', 'invitations', 'other'] } },
    { header: 'Contact Person', key: 'contact', width: 25, hint: 'Primary contact name' },
    { header: 'Phone Number', key: 'phone', width: 18, hint: '+1234567890' },
    { header: 'Email Address', key: 'email', width: 28, hint: 'email@example.com' },
    { header: 'Event', key: 'event', width: 20, hint: 'Associated event' },
    { header: 'Service Location', key: 'venueAddress', width: 35, hint: 'Full address' },
    { header: 'On-Site Contact', key: 'onsitePoc', width: 25, hint: 'Day-of contact person' },
    { header: 'Contact Phone', key: 'pocPhone', width: 18, hint: 'Day-of phone' },
    { header: 'Contact Notes', key: 'pocNotes', width: 30, hint: 'Special instructions' },
    { header: 'Services Provided', key: 'deliverables', width: 40, hint: 'List of services' },
    { header: 'Contract Amount', key: 'cost', width: 18, hint: 'Numbers only' },
    { header: 'Deposit Paid', key: 'deposit', width: 15, hint: 'Numbers only' },
    { header: 'Service Date', key: 'serviceDate', width: 15, hint: 'YYYY-MM-DD' },
    { header: 'Payment Status', key: 'paymentStatus', width: 18, hint: 'pending/partial/paid', validation: { type: 'list', options: ['pending', 'partial', 'paid', 'overdue'] } },
    { header: 'Approval Status', key: 'approvalStatus', width: 18, hint: 'pending/approved/rejected', validation: { type: 'list', options: ['pending', 'approved', 'rejected'] } },
    { header: 'Approval Notes', key: 'approvalComments', width: 35, hint: 'Comments on approval' },
  ];

  const data = vendors.map((vendor) => ({
    name: vendor.name,
    category: vendor.category,
    contact: vendor.contact_name || '',
    phone: vendor.phone || '',
    email: vendor.email || '',
    event: vendor.event_title || '',
    venueAddress: vendor.venue_address || '',
    onsitePoc: vendor.onsite_poc_name || '',
    pocPhone: vendor.onsite_poc_phone || '',
    pocNotes: vendor.onsite_poc_notes || '',
    deliverables: vendor.deliverables || '',
    cost: vendor.contract_amount || 0,
    deposit: vendor.deposit_amount || 0,
    serviceDate: vendor.service_date || '',
    paymentStatus: vendor.payment_status || 'pending',
    approvalStatus: vendor.approval_status || 'pending',
    approvalComments: vendor.approval_comments || '',
  }));

  const workbook = generateExcelWithHints(columns, data, {
    sheetName: 'Vendors',
    includeHints: true,
    ...options,
  });

  await downloadExcel(workbook, options.filename || `vendor-list-${Date.now()}.xlsx`);
}

/**
 * Export comprehensive wedding data to Excel (multi-sheet)
 */
export async function exportComprehensiveWeddingData(
  data: {
    guests: any[];
    budget: any[];
    vendors: any[];
    timeline: any[];
  },
  options: ExcelOptions = {}
): Promise<void> {
  const sheets: ExcelSheet[] = [
    {
      name: 'Guests',
      columns: [
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Party Size', key: 'partySize', width: 12 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Checked In', key: 'checkedIn', width: 12 },
      ],
      data: data.guests.map((g) => ({
        name: g.guest_name,
        partySize: g.number_of_packs,
        phone: g.phone_number || '',
        email: g.email || '',
        checkedIn: g.checked_in ? 'Yes' : 'No',
      })),
    },
    {
      name: 'Budget',
      columns: [
        { header: 'Expense', key: 'expense', width: 30 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Budget', key: 'budget', width: 15 },
        { header: 'Actual', key: 'actual', width: 15 },
        { header: 'Variance', key: 'variance', width: 15 },
      ],
      data: data.budget.map((b) => ({
        expense: b.expense_details,
        category: b.category,
        budget: b.budget,
        actual: b.actual_cost,
        variance: b.variance,
      })),
    },
    {
      name: 'Vendors',
      columns: [
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Total Cost', key: 'cost', width: 15 },
      ],
      data: data.vendors.map((v) => ({
        name: v.name,
        category: v.category,
        status: v.status,
        cost: v.totalCost,
      })),
    },
    {
      name: 'Timeline',
      columns: [
        { header: 'Time', key: 'time', width: 20 },
        { header: 'Activity', key: 'activity', width: 30 },
        { header: 'Location', key: 'location', width: 25 },
        { header: 'Manager', key: 'manager', width: 20 },
      ],
      data: data.timeline.map((t) => ({
        time: `${t.start_time} - ${t.end_time}`,
        activity: t.activity,
        location: t.location,
        manager: t.manager,
      })),
    },
  ];

  const workbook = generateMultiSheetExcel(sheets);
  await downloadExcel(workbook, options.filename || `wedding-data-${Date.now()}.xlsx`);
}

/**
 * Export guest gifts to Excel
 * Updated December 2025 to match new API data structure
 */
export async function exportGuestGiftListExcel(
  guestGifts: Array<{
    // Core gift assignment data
    id?: string;
    giftName?: string | null;
    quantity?: number;
    deliveryDate?: string | null;
    deliveryTime?: string | null;
    deliveryLocation?: string | null;
    deliveryStatus?: string;
    deliveredBy?: string | null;
    deliveredAt?: Date | string | null;
    deliveryNotes?: string | null;
    notes?: string | null;
    // Nested guest data
    guest?: {
      id?: string;
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      phone?: string | null;
      groupName?: string | null;
    } | null;
    // Nested gift item data
    giftItem?: {
      id?: string;
      name?: string | null;
      giftTypeId?: string | null;
    } | null;
    // Nested gift type data
    giftType?: {
      id?: string;
      name?: string | null;
      deliveryDate?: string | null;
      deliveryTime?: string | null;
      deliveryLocation?: string | null;
    } | null;
  }>,
  options: ExcelOptions = {}
): Promise<void> {
  const columns: ExcelColumn[] = [
    { header: 'Guest Name', key: 'guestName', width: 25 },
    { header: 'Guest Group', key: 'group', width: 18 },
    { header: 'Email Address', key: 'email', width: 28 },
    { header: 'Phone Number', key: 'phone', width: 18 },
    { header: 'Gift Item', key: 'giftName', width: 30 },
    { header: 'Gift Category', key: 'giftType', width: 20 },
    { header: 'Quantity', key: 'quantity', width: 12 },
    { header: 'Delivery Date', key: 'deliveryDate', width: 15 },
    { header: 'Delivery Time', key: 'deliveryTime', width: 15 },
    { header: 'Delivery Location', key: 'deliveryLocation', width: 30 },
    { header: 'Delivery Status', key: 'deliveryStatus', width: 18 },
    { header: 'Delivered By', key: 'deliveredBy', width: 20 },
    { header: 'Special Notes', key: 'notes', width: 40 },
  ];

  // Helper to format time to 12-hour format
  // Handles Date objects, time strings "17:00:00", and ISO datetime "2025-12-29T03:30:00.000Z"
  const formatTime = (time: string | Date | null | undefined): string => {
    if (!time) return '';

    // Handle Date objects directly
    if (time instanceof Date) {
      if (isNaN(time.getTime())) return '';
      let hours = time.getHours();
      const minutes = time.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}:${minutes} ${ampm}`;
    }

    // Convert to string if not already
    const timeStr = String(time);

    // Check if it's an ISO datetime string (contains 'T')
    if (timeStr.includes('T')) {
      try {
        const d = new Date(timeStr);
        if (isNaN(d.getTime())) return '';
        let hours = d.getHours();
        const minutes = d.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${hours}:${minutes} ${ampm}`;
      } catch {
        return '';
      }
    }

    // Handle time-only string "HH:mm:ss"
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    let hours = parseInt(parts[0], 10);
    if (isNaN(hours)) return '';
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const data = guestGifts.map((gift) => {
    const guestName = [gift.guest?.firstName, gift.guest?.lastName].filter(Boolean).join(' ') || '-';
    const giftDisplayName = gift.giftName || gift.giftItem?.name || '-';

    return {
      guestName,
      group: gift.guest?.groupName || '',
      email: gift.guest?.email || '',
      phone: gift.guest?.phone || '',
      giftName: giftDisplayName,
      giftType: gift.giftType?.name || '',
      quantity: gift.quantity || 1,
      deliveryDate: gift.deliveryDate || '',
      deliveryTime: formatTime(gift.deliveryTime),
      deliveryLocation: gift.deliveryLocation || '',
      deliveryStatus: gift.deliveryStatus || 'pending',
      deliveredBy: gift.deliveredBy || '',
      notes: gift.notes || gift.deliveryNotes || '',
    };
  });

  const workbook = generateExcelWithHints(columns.map(c => ({
    ...c,
    hint: c.key === 'guestName' ? 'Required - Guest name' :
          c.key === 'giftName' ? 'Gift item name' :
          c.key === 'deliveryStatus' ? 'pending/delivered/failed' :
          c.key === 'deliveryDate' ? 'YYYY-MM-DD' :
          c.key === 'deliveryTime' ? 'HH:MM AM/PM' :
          c.key === 'quantity' ? 'Number (1, 2...)' : '',
    validation: c.key === 'deliveryStatus' ? { type: 'list', options: ['pending', 'in_transit', 'delivered', 'failed'] } : undefined,
  })), data, {
    sheetName: 'Gifts Given',
    includeHints: true,
    ...options,
  });

  await downloadExcel(workbook, options.filename || `guest-gifts-${Date.now()}.xlsx`);
}

/**
 * Export creatives list to Excel
 */
export async function exportCreativesListExcel(
  creatives: Array<{
    title: string;
    job_type: string;
    quantity: number;
    job_start_date?: string;
    due_date?: string;
    status: string;
    approval_status: string;
    approval_comments?: string;
    priority: string;
    description?: string;
    assigned_to?: string;
    file_url?: string;
    revision_count?: number;
    notes?: string;
  }>,
  options: ExcelOptions = {}
): Promise<void> {
  const columns: ExcelColumn[] = [
    { header: 'Design Name', key: 'title', width: 35 },
    { header: 'Design Type', key: 'jobType', width: 20 },
    { header: 'Quantity', key: 'quantity', width: 12 },
    { header: 'Start Date', key: 'startDate', width: 15 },
    { header: 'Due Date', key: 'endDate', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Approval Status', key: 'approval', width: 18 },
    { header: 'Approval Notes', key: 'approvalComments', width: 35 },
    { header: 'Priority', key: 'priority', width: 15 },
    { header: 'Design Details', key: 'description', width: 40 },
    { header: 'Designer', key: 'assignedTo', width: 20 },
    { header: 'Revision Count', key: 'revisions', width: 15 },
    { header: 'Special Notes', key: 'notes', width: 40 },
  ];

  const data = creatives.map((creative) => ({
    title: creative.title,
    jobType: creative.job_type,
    quantity: creative.quantity || 1,
    startDate: creative.job_start_date || '',
    endDate: creative.due_date || '',
    status: creative.status,
    approval: creative.approval_status || 'pending',
    approvalComments: creative.approval_comments || '',
    priority: creative.priority,
    description: creative.description || '',
    assignedTo: creative.assigned_to || '',
    revisions: creative.revision_count || 0,
    notes: creative.notes || '',
  }));

  const workbook = generateExcelWithHints(columns.map(c => ({
    ...c,
    hint: c.key === 'title' ? 'Required - Design name' :
          c.key === 'jobType' ? 'invite/save-the-date/etc.' :
          c.key === 'status' ? 'draft/in_progress/completed' :
          c.key === 'approval' ? 'pending/approved/rejected' :
          c.key === 'priority' ? 'low/medium/high' :
          c.key === 'startDate' ? 'YYYY-MM-DD' :
          c.key === 'endDate' ? 'YYYY-MM-DD' :
          c.key === 'quantity' ? 'Number (1, 2...)' : '',
    validation: c.key === 'status' ? { type: 'list', options: ['draft', 'in_progress', 'review', 'completed'] } :
                c.key === 'approval' ? { type: 'list', options: ['pending', 'approved', 'revision_needed', 'rejected'] } :
                c.key === 'priority' ? { type: 'list', options: ['low', 'medium', 'high', 'urgent'] } : undefined,
  })), data, {
    sheetName: 'Creatives',
    includeHints: true,
    ...options,
  });

  await downloadExcel(workbook, options.filename || `creatives-${Date.now()}.xlsx`);
}

/**
 * Export internal budget to Excel
 */
export async function exportInternalBudgetExcel(
  items: Array<{
    expense_details: string;
    category: string;
    events?: { title?: string } | null;
    budget_amount: number;
    cost?: number | null;
    transaction_date?: string | null;
    paid_by?: string | null;
    notes?: string | null;
  }>,
  options: ExcelOptions = {}
): Promise<void> {
  const columns: ExcelColumn[] = [
    { header: 'Expense Details', key: 'expenseDetails', width: 40 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Event', key: 'event', width: 20 },
    { header: 'Budgeted Amount', key: 'budget', width: 18 },
    { header: 'Actual Spent', key: 'cost', width: 18 },
    { header: 'Variance', key: 'variance', width: 15 },
    { header: 'Transaction Date', key: 'transactionDate', width: 18 },
    { header: 'Paid By', key: 'paidBy', width: 20 },
    { header: 'Special Notes', key: 'notes', width: 40 },
  ];

  const data = items.map((item) => {
    const budget = item.budget_amount || 0;
    const cost = item.cost || 0;
    return {
      expenseDetails: item.expense_details,
      category: item.category,
      event: item.events?.title || '',
      budget: budget,
      cost: cost,
      variance: cost - budget,
      transactionDate: item.transaction_date || '',
      paidBy: item.paid_by || '',
      notes: item.notes || '',
    };
  });

  const workbook = generateExcelWithHints(columns.map(c => ({
    ...c,
    hint: c.key === 'expenseDetails' ? 'Required - Expense description' :
          c.key === 'category' ? 'venue/catering/decor/etc.' :
          c.key === 'budget' ? 'Numbers only' :
          c.key === 'cost' ? 'Numbers only' :
          c.key === 'variance' ? 'Auto-calculated' :
          c.key === 'transactionDate' ? 'YYYY-MM-DD' : '',
    validation: c.key === 'category' ? { type: 'list', options: ['venue', 'catering', 'photography', 'videography', 'decor', 'entertainment', 'attire', 'beauty', 'transportation', 'stationery', 'gifts', 'other'] } : undefined,
  })), data, {
    sheetName: 'Internal Budget',
    includeHints: true,
    ...options,
  });

  await downloadExcel(workbook, options.filename || `internal-budget-${Date.now()}.xlsx`);
}

/**
 * Export event flow to Excel
 */
export async function exportEventFlowExcel(
  items: Array<{
    activity_date: string;
    activity: string;
    activity_type: string;
    start_time: string;
    duration_minutes: number;
    events?: { title?: string } | null;
    location?: string | null;
    manager?: string | null;
    notes?: string | null;
  }>,
  options: ExcelOptions = {}
): Promise<void> {
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    if (!startTime) return '';
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  const columns: ExcelColumn[] = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Activity', key: 'activity', width: 35 },
    { header: 'Activity Type', key: 'activityType', width: 18 },
    { header: 'Start Time', key: 'startTime', width: 15 },
    { header: 'Duration (min)', key: 'duration', width: 15 },
    { header: 'End Time', key: 'endTime', width: 15 },
    { header: 'Event', key: 'event', width: 20 },
    { header: 'Location', key: 'location', width: 30 },
    { header: 'Coordinator', key: 'manager', width: 20 },
    { header: 'Special Notes', key: 'notes', width: 40 },
  ];

  const data = items.map((item) => ({
    date: item.activity_date || '',
    activity: item.activity,
    activityType: item.activity_type,
    startTime: item.start_time || '',
    duration: item.duration_minutes,
    endTime: calculateEndTime(item.start_time, item.duration_minutes),
    event: item.events?.title || '',
    location: item.location || '',
    manager: item.manager || '',
    notes: item.notes || '',
  }));

  const workbook = generateExcelWithHints(columns.map(c => ({
    ...c,
    hint: c.key === 'activity' ? 'Required - Activity name' :
          c.key === 'date' ? 'YYYY-MM-DD' :
          c.key === 'startTime' ? 'HH:MM (24hr)' :
          c.key === 'duration' ? 'Minutes (30, 60...)' :
          c.key === 'endTime' ? 'Auto-calculated' :
          c.key === 'activityType' ? 'ceremony/reception/etc.' : '',
    validation: c.key === 'activityType' ? { type: 'list', options: ['ceremony', 'reception', 'cocktail', 'dinner', 'entertainment', 'photo_session', 'transition', 'setup', 'other'] } : undefined,
  })), data, {
    sheetName: 'Event Flow',
    includeHints: true,
    ...options,
  });

  await downloadExcel(workbook, options.filename || `event-flow-${Date.now()}.xlsx`);
}

/**
 * Export gifts registry to Excel
 */
export async function exportGiftsRegistryExcel(
  gifts: Array<{
    gift_name: string;
    from_name?: string | null;
    from_email?: string | null;
    delivery_date?: string | null;
    delivery_status?: string | null;
    thank_you_sent?: boolean | null;
    thank_you_sent_date?: string | null;
    notes?: string | null;
  }>,
  options: ExcelOptions = {}
): Promise<void> {
  const columns: ExcelColumn[] = [
    { header: 'Gift Received', key: 'giftName', width: 35 },
    { header: 'Guest Name', key: 'fromName', width: 25 },
    { header: 'Email Address', key: 'fromEmail', width: 28 },
    { header: 'Received On', key: 'deliveryDate', width: 15 },
    { header: 'Status', key: 'deliveryStatus', width: 15 },
    { header: 'Thank You Sent', key: 'thankYouSent', width: 18 },
    { header: 'Thank You Sent On', key: 'thankYouSentDate', width: 18 },
    { header: 'Special Notes', key: 'notes', width: 40 },
  ];

  const data = gifts.map((gift) => ({
    giftName: gift.gift_name,
    fromName: gift.from_name || '',
    fromEmail: gift.from_email || '',
    deliveryDate: gift.delivery_date || '',
    deliveryStatus: gift.delivery_status || 'pending',
    thankYouSent: gift.thank_you_sent ? 'Yes' : 'No',
    thankYouSentDate: gift.thank_you_sent_date || '',
    notes: gift.notes || '',
  }));

  const workbook = generateExcelWithHints(columns.map(c => ({
    ...c,
    hint: c.key === 'giftName' ? 'Required - Gift received' :
          c.key === 'fromName' ? 'Giver name' :
          c.key === 'deliveryDate' ? 'YYYY-MM-DD' :
          c.key === 'deliveryStatus' ? 'pending/received' :
          c.key === 'thankYouSent' ? 'Yes/No' :
          c.key === 'thankYouSentDate' ? 'YYYY-MM-DD' : '',
    validation: c.key === 'deliveryStatus' ? { type: 'list', options: ['pending', 'received', 'returned'] } :
                c.key === 'thankYouSent' ? { type: 'list', options: ['Yes', 'No'] } : undefined,
  })), data, {
    sheetName: 'Gift Registry',
    includeHints: true,
    ...options,
  });

  await downloadExcel(workbook, options.filename || `gift-registry-${Date.now()}.xlsx`);
}

/**
 * Export documents to Excel
 */
export async function exportDocumentsExcel(
  documents: Array<{
    name: string;
    document_type?: string | null;
    category?: string | null;
    status?: string | null;
    file_url?: string | null;
    file_size?: number | null;
    uploaded_by?: string | null;
    signature_status?: string | null;
    signed_by?: string | null;
    signed_at?: string | null;
    expiry_date?: string | null;
    created_at?: string | null;
    notes?: string | null;
    tags?: string[] | null;
  }>,
  options: ExcelOptions = {}
): Promise<void> {
  const columns: ExcelColumn[] = [
    { header: 'Document Name', key: 'name', width: 40 },
    { header: 'Document Type', key: 'documentType', width: 20 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Uploaded By', key: 'uploadedBy', width: 20 },
    { header: 'Upload Date', key: 'createdAt', width: 15 },
    { header: 'Signature Status', key: 'signatureStatus', width: 18 },
    { header: 'Signed By', key: 'signedBy', width: 20 },
    { header: 'Signed On', key: 'signedAt', width: 15 },
    { header: 'Expires On', key: 'expiryDate', width: 15 },
    { header: 'File Size (KB)', key: 'fileSize', width: 15 },
    { header: 'Tags', key: 'tags', width: 30 },
    { header: 'Special Notes', key: 'notes', width: 40 },
  ];

  const data = documents.map((doc) => ({
    name: doc.name,
    documentType: doc.document_type || '',
    category: doc.category || '',
    status: doc.status || 'active',
    uploadedBy: doc.uploaded_by || '',
    createdAt: doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '',
    signatureStatus: doc.signature_status || 'none',
    signedBy: doc.signed_by || '',
    signedAt: doc.signed_at ? new Date(doc.signed_at).toLocaleDateString() : '',
    expiryDate: doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : '',
    fileSize: doc.file_size ? Math.round(doc.file_size / 1024) : '',
    tags: (doc.tags || []).join(', '),
    notes: doc.notes || '',
  }));

  const workbook = generateExcelWithHints(columns.map(c => ({
    ...c,
    hint: c.key === 'name' ? 'Required - Document name' :
          c.key === 'documentType' ? 'contract/invoice/etc.' :
          c.key === 'status' ? 'active/archived' :
          c.key === 'signatureStatus' ? 'none/pending/signed' :
          c.key === 'createdAt' ? 'YYYY-MM-DD' :
          c.key === 'expiryDate' ? 'YYYY-MM-DD' : '',
    validation: c.key === 'status' ? { type: 'list', options: ['active', 'archived', 'deleted'] } :
                c.key === 'signatureStatus' ? { type: 'list', options: ['none', 'pending', 'signed', 'rejected'] } :
                c.key === 'documentType' ? { type: 'list', options: ['contract', 'invoice', 'receipt', 'license', 'permit', 'insurance', 'other'] } : undefined,
  })), data, {
    sheetName: 'Documents',
    includeHints: true,
    ...options,
  });

  await downloadExcel(workbook, options.filename || `documents-${Date.now()}.xlsx`);
}

/**
 * Export guest transport to Excel
 * Updated December 2025 - Wedding planner-friendly terminology
 * Based on research from WeddingWire, The Knot, and professional wedding planners
 */
export async function exportGuestTransportExcel(
  transports: Array<{
    id?: string;
    guestId?: string;
    guestName?: string;
    legType?: string | null;
    legSequence?: number | null;
    pickupDate?: string | null;
    pickupTime?: string | null;
    pickupFrom?: string | null;
    dropTo?: string | null;
    transportStatus?: string;
    vehicleInfo?: string | null;
    notes?: string | null;
    completedAt?: Date | string | null;
    guest?: {
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      phone?: string | null;
      groupName?: string | null;
    } | null;
  }>,
  options: ExcelOptions = {}
): Promise<void> {
  const columns: ExcelColumn[] = [
    { header: 'Guest Name', key: 'guestName', width: 25 },
    { header: 'Guest Group', key: 'group', width: 15 },
    { header: 'Email Address', key: 'email', width: 28 },
    { header: 'Phone Number', key: 'phone', width: 18 },
    { header: 'Journey Type', key: 'legType', width: 18 },
    { header: 'Trip #', key: 'legSequence', width: 10 },
    { header: 'Pickup Date', key: 'pickupDate', width: 15 },
    { header: 'Pickup Time', key: 'pickupTime', width: 12 },
    { header: 'Pickup Location', key: 'pickupFrom', width: 28 },
    { header: 'Drop-off Location', key: 'dropTo', width: 28 },
    { header: 'Status', key: 'transportStatus', width: 15 },
    { header: 'Vehicle/Shuttle', key: 'vehicleInfo', width: 25 },
    { header: 'Completed On', key: 'completedAt', width: 18 },
    { header: 'Special Notes', key: 'notes', width: 40 },
  ];

  // Helper to format time to 12-hour format
  const formatTime = (time: string | null | undefined): string => {
    if (!time) return '';
    const parts = time.split(':');
    if (parts.length < 2) return time;
    let hours = parseInt(parts[0], 10);
    if (isNaN(hours)) return '';
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const data = transports.map((transport) => {
    const guestName = transport.guestName ||
      (transport.guest ? [transport.guest.firstName, transport.guest.lastName].filter(Boolean).join(' ') : '-');

    return {
      guestName,
      group: transport.guest?.groupName || '',
      email: transport.guest?.email || '',
      phone: transport.guest?.phone || '',
      legType: transport.legType || '',
      legSequence: transport.legSequence || 1,
      pickupDate: transport.pickupDate || '',
      pickupTime: formatTime(transport.pickupTime),
      pickupFrom: transport.pickupFrom || '',
      dropTo: transport.dropTo || '',
      transportStatus: transport.transportStatus || 'scheduled',
      vehicleInfo: transport.vehicleInfo || '',
      completedAt: formatDate(transport.completedAt),
      notes: transport.notes || '',
    };
  });

  const workbook = generateExcelWithHints(columns.map(c => ({
    ...c,
    hint: c.key === 'guestName' ? 'Required - Guest name' :
          c.key === 'legType' ? 'airport_pickup/hotel_drop/etc.' :
          c.key === 'pickupDate' ? 'YYYY-MM-DD' :
          c.key === 'pickupTime' ? 'HH:MM AM/PM' :
          c.key === 'transportStatus' ? 'scheduled/completed' :
          c.key === 'legSequence' ? 'Trip number (1, 2...)' : '',
    validation: c.key === 'transportStatus' ? { type: 'list', options: ['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'] } :
                c.key === 'legType' ? { type: 'list', options: ['airport_pickup', 'airport_drop', 'hotel_pickup', 'hotel_drop', 'venue_transfer', 'custom'] } : undefined,
  })), data, {
    sheetName: 'Guest Transport',
    includeHints: true,
    ...options,
  });

  await downloadExcel(workbook, options.filename || `guest-transport-${Date.now()}.xlsx`);
}

/**
 * ============================================================================
 * MASTER MULTI-SHEET EXCEL EXPORT
 * ============================================================================
 *
 * Creates a comprehensive Excel workbook with all planning module data.
 * This is the "source of truth" file that can be edited and re-imported.
 *
 * Architecture based on best practices from:
 * - Event-driven sync patterns
 * - Bi-directional data flow
 * - Cross-module reference integrity via IDs
 *
 * December 2025 - WeddingFlo Pro
 */

export interface MasterExportData {
  clientName: string;
  weddingDate?: string;
  guests: Array<{
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    groupName?: string | null;
    rsvpStatus?: string;
    partySize?: number;
    dietaryRestrictions?: string | null;
    mealPreference?: string | null;
    hotelRequired?: boolean;
    transportRequired?: boolean;
    notes?: string | null;
    updatedAt?: Date | string | null;
  }>;
  hotels: Array<{
    id: string;
    guestId?: string | null;
    guestName?: string;
    accommodationNeeded?: boolean;
    hotelName?: string | null;
    roomNumber?: string | null;
    roomType?: string | null;
    checkInDate?: string | null;
    checkOutDate?: string | null;
    bookingConfirmed?: boolean;
    checkedIn?: boolean;
    notes?: string | null;
    updatedAt?: Date | string | null;
  }>;
  guestGifts: Array<{
    id: string;
    guestId?: string | null;
    giftName?: string | null;
    giftType?: { name?: string | null } | null;
    quantity?: number;
    deliveryDate?: string | null;
    deliveryTime?: string | null;
    deliveryLocation?: string | null;
    deliveryStatus?: string;
    deliveredBy?: string | null;
    notes?: string | null;
    guest?: { firstName?: string | null; lastName?: string | null } | null;
    updatedAt?: Date | string | null;
  }>;
  timeline: Array<{
    id: string;
    title?: string;
    startTime?: string | null;
    endTime?: string | null;
    durationMinutes?: number;
    location?: string | null;
    responsiblePerson?: string | null;
    description?: string | null;
    completed?: boolean;
    updatedAt?: Date | string | null;
  }>;
  budget: Array<{
    id: string;
    item?: string;
    category?: string;
    estimatedCost?: number | null;
    actualCost?: number | null;
    paymentStatus?: string;
    notes?: string | null;
    events?: { title?: string } | null;
    updatedAt?: Date | string | null;
  }>;
  vendors: Array<{
    id: string;
    name?: string;
    category?: string;
    contactName?: string | null;
    phone?: string | null;
    email?: string | null;
    contractAmount?: number | null;
    paymentStatus?: string;
    serviceDate?: string | null;
    notes?: string | null;
    updatedAt?: Date | string | null;
  }>;
  events: Array<{
    id: string;
    title?: string;
    eventDate?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    venue?: string | null;
    description?: string | null;
    updatedAt?: Date | string | null;
  }>;
}

/**
 * Export all planning modules to a single Master Excel workbook
 * This creates a comprehensive file that serves as the data hub for all modules
 */
export async function exportMasterPlanningExcel(
  data: MasterExportData,
  options: ExcelOptions = {}
): Promise<void> {
  // Helper to format time to 12-hour format
  // Handles Date objects, time strings "17:00:00", and ISO datetime "2025-12-29T03:30:00.000Z"
  const formatTime = (time: string | Date | null | undefined): string => {
    if (!time) return '';

    // Handle Date objects directly
    if (time instanceof Date) {
      if (isNaN(time.getTime())) return '';
      let hours = time.getHours();
      const minutes = time.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}:${minutes} ${ampm}`;
    }

    // Convert to string if not already
    const timeStr = String(time);

    // Check if it's an ISO datetime string (contains 'T')
    if (timeStr.includes('T')) {
      try {
        const d = new Date(timeStr);
        if (isNaN(d.getTime())) return '';
        let hours = d.getHours();
        const minutes = d.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${hours}:${minutes} ${ampm}`;
      } catch {
        return '';
      }
    }

    // Handle time-only string "HH:mm:ss"
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    let hours = parseInt(parts[0], 10);
    if (isNaN(hours)) return '';
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  // Helper to format date for display
  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const sheets: Array<{
    name: string;
    columns: ExcelColumn[];
    data: Array<Record<string, any>>;
  }> = [];

  // ============= SHEET 1: GUESTS (Master List) =============
  sheets.push({
    name: 'Guests',
    columns: [
      { header: 'ID (Do Not Modify)', key: 'id', width: 38 },
      { header: 'First Name', key: 'firstName', width: 20 },
      { header: 'Last Name', key: 'lastName', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Group', key: 'group', width: 20 },
      { header: 'RSVP Status', key: 'rsvpStatus', width: 15 },
      { header: 'Party Size', key: 'partySize', width: 12 },
      { header: 'Dietary Restrictions', key: 'dietary', width: 25 },
      { header: 'Meal Preference', key: 'mealPref', width: 18 },
      { header: 'Hotel Required', key: 'hotelRequired', width: 15 },
      { header: 'Transport Required', key: 'transportRequired', width: 18 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Last Updated', key: 'updatedAt', width: 18 },
    ],
    data: data.guests.map((g) => ({
      id: g.id,
      firstName: g.firstName || '',
      lastName: g.lastName || '',
      email: g.email || '',
      phone: g.phone || '',
      group: g.groupName || '',
      rsvpStatus: g.rsvpStatus || 'pending',
      partySize: g.partySize || 1,
      dietary: g.dietaryRestrictions || '',
      mealPref: g.mealPreference || '',
      hotelRequired: g.hotelRequired ? 'Yes' : 'No',
      transportRequired: g.transportRequired ? 'Yes' : 'No',
      notes: g.notes || '',
      updatedAt: formatDate(g.updatedAt),
    })),
  });

  // ============= SHEET 2: HOTELS =============
  sheets.push({
    name: 'Hotels',
    columns: [
      { header: 'ID (Do Not Modify)', key: 'id', width: 38 },
      { header: 'Guest ID (Ref)', key: 'guestId', width: 38 },
      { header: 'Guest Name', key: 'guestName', width: 25 },
      { header: 'Accommodation Needed', key: 'accommodationNeeded', width: 22 },
      { header: 'Hotel Name', key: 'hotelName', width: 25 },
      { header: 'Room Number', key: 'roomNumber', width: 15 },
      { header: 'Room Type', key: 'roomType', width: 15 },
      { header: 'Check-in Date', key: 'checkInDate', width: 15 },
      { header: 'Check-out Date', key: 'checkOutDate', width: 15 },
      { header: 'Booking Confirmed', key: 'bookingConfirmed', width: 18 },
      { header: 'Checked In', key: 'checkedIn', width: 12 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Last Updated', key: 'updatedAt', width: 18 },
    ],
    data: data.hotels.map((h) => ({
      id: h.id,
      guestId: h.guestId || '',
      guestName: h.guestName || '',
      accommodationNeeded: h.accommodationNeeded ? 'Yes' : 'No',
      hotelName: h.hotelName || '',
      roomNumber: h.roomNumber || '',
      roomType: h.roomType || '',
      checkInDate: h.checkInDate || '',
      checkOutDate: h.checkOutDate || '',
      bookingConfirmed: h.bookingConfirmed ? 'Yes' : 'No',
      checkedIn: h.checkedIn ? 'Yes' : 'No',
      notes: h.notes || '',
      updatedAt: formatDate(h.updatedAt),
    })),
  });

  // ============= SHEET 3: GIFTS GIVEN =============
  sheets.push({
    name: 'Gifts Given',
    columns: [
      { header: 'ID (Do Not Modify)', key: 'id', width: 38 },
      { header: 'Guest ID (Ref)', key: 'guestId', width: 38 },
      { header: 'Guest Name', key: 'guestName', width: 25 },
      { header: 'Gift Name', key: 'giftName', width: 25 },
      { header: 'Gift Type', key: 'giftType', width: 20 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Delivery Date', key: 'deliveryDate', width: 15 },
      { header: 'Delivery Time', key: 'deliveryTime', width: 12 },
      { header: 'Delivery Location', key: 'deliveryLocation', width: 25 },
      { header: 'Delivery Status', key: 'deliveryStatus', width: 15 },
      { header: 'Delivered By', key: 'deliveredBy', width: 20 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Last Updated', key: 'updatedAt', width: 18 },
    ],
    data: data.guestGifts.map((g) => {
      const guestName = g.guest
        ? [g.guest.firstName, g.guest.lastName].filter(Boolean).join(' ')
        : '';
      return {
        id: g.id,
        guestId: g.guestId || '',
        guestName: guestName || '',
        giftName: g.giftName || '',
        giftType: g.giftType?.name || '',
        quantity: g.quantity || 1,
        deliveryDate: g.deliveryDate || '',
        deliveryTime: formatTime(g.deliveryTime),
        deliveryLocation: g.deliveryLocation || '',
        deliveryStatus: g.deliveryStatus || 'pending',
        deliveredBy: g.deliveredBy || '',
        notes: g.notes || '',
        updatedAt: formatDate(g.updatedAt),
      };
    }),
  });

  // ============= SHEET 4: EVENTS =============
  sheets.push({
    name: 'Events',
    columns: [
      { header: 'ID (Do Not Modify)', key: 'id', width: 38 },
      { header: 'Event Title', key: 'title', width: 30 },
      { header: 'Event Date', key: 'eventDate', width: 15 },
      { header: 'Start Time', key: 'startTime', width: 12 },
      { header: 'End Time', key: 'endTime', width: 12 },
      { header: 'Venue', key: 'venue', width: 30 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Last Updated', key: 'updatedAt', width: 18 },
    ],
    data: data.events.map((e) => ({
      id: e.id,
      title: e.title || '',
      eventDate: e.eventDate || '',
      startTime: formatTime(e.startTime),
      endTime: formatTime(e.endTime),
      venue: e.venue || '',
      description: e.description || '',
      updatedAt: formatDate(e.updatedAt),
    })),
  });

  // ============= SHEET 5: TIMELINE =============
  sheets.push({
    name: 'Timeline',
    columns: [
      { header: 'ID (Do Not Modify)', key: 'id', width: 38 },
      { header: 'Activity', key: 'title', width: 35 },
      { header: 'Start Time', key: 'startTime', width: 12 },
      { header: 'End Time', key: 'endTime', width: 12 },
      { header: 'Duration (min)', key: 'duration', width: 15 },
      { header: 'Location', key: 'location', width: 25 },
      { header: 'Responsible Person', key: 'responsible', width: 25 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Completed', key: 'completed', width: 12 },
      { header: 'Last Updated', key: 'updatedAt', width: 18 },
    ],
    data: data.timeline.map((t) => ({
      id: t.id,
      title: t.title || '',
      startTime: formatTime(t.startTime),
      endTime: formatTime(t.endTime),
      duration: t.durationMinutes || '',
      location: t.location || '',
      responsible: t.responsiblePerson || '',
      description: t.description || '',
      completed: t.completed ? 'Yes' : 'No',
      updatedAt: formatDate(t.updatedAt),
    })),
  });

  // ============= SHEET 6: BUDGET =============
  sheets.push({
    name: 'Budget',
    columns: [
      { header: 'ID (Do Not Modify)', key: 'id', width: 38 },
      { header: 'Expense Item', key: 'item', width: 35 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Event', key: 'event', width: 25 },
      { header: 'Estimated Cost', key: 'estimated', width: 18 },
      { header: 'Actual Cost', key: 'actual', width: 15 },
      { header: 'Variance', key: 'variance', width: 12 },
      { header: 'Payment Status', key: 'paymentStatus', width: 15 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Last Updated', key: 'updatedAt', width: 18 },
    ],
    data: data.budget.map((b) => {
      const estimated = b.estimatedCost || 0;
      const actual = b.actualCost || 0;
      return {
        id: b.id,
        item: b.item || '',
        category: b.category || '',
        event: b.events?.title || '',
        estimated: estimated,
        actual: actual,
        variance: actual - estimated,
        paymentStatus: b.paymentStatus || 'pending',
        notes: b.notes || '',
        updatedAt: formatDate(b.updatedAt),
      };
    }),
  });

  // ============= SHEET 7: VENDORS =============
  sheets.push({
    name: 'Vendors',
    columns: [
      { header: 'ID (Do Not Modify)', key: 'id', width: 38 },
      { header: 'Vendor Name', key: 'name', width: 30 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Contact Person', key: 'contactName', width: 25 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Contract Amount', key: 'contractAmount', width: 18 },
      { header: 'Service Date', key: 'serviceDate', width: 15 },
      { header: 'Payment Status', key: 'paymentStatus', width: 15 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Last Updated', key: 'updatedAt', width: 18 },
    ],
    data: data.vendors.map((v) => ({
      id: v.id,
      name: v.name || '',
      category: v.category || '',
      contactName: v.contactName || '',
      phone: v.phone || '',
      email: v.email || '',
      contractAmount: v.contractAmount || 0,
      serviceDate: v.serviceDate || '',
      paymentStatus: v.paymentStatus || 'pending',
      notes: v.notes || '',
      updatedAt: formatDate(v.updatedAt),
    })),
  });

  // ============= SHEET 8: METADATA (for sync tracking) =============
  const exportDate = new Date().toISOString();
  sheets.push({
    name: '_Metadata',
    columns: [
      { header: 'Property', key: 'property', width: 25 },
      { header: 'Value', key: 'value', width: 50 },
    ],
    data: [
      { property: 'Client Name', value: data.clientName },
      { property: 'Wedding Date', value: data.weddingDate || '' },
      { property: 'Export Date', value: exportDate },
      { property: 'Total Guests', value: data.guests.length },
      { property: 'Total Hotels', value: data.hotels.length },
      { property: 'Total Gifts', value: data.guestGifts.length },
      { property: 'Total Events', value: data.events.length },
      { property: 'Total Timeline Items', value: data.timeline.length },
      { property: 'Total Budget Items', value: data.budget.length },
      { property: 'Total Vendors', value: data.vendors.length },
      { property: 'Version', value: '2.0 (December 2025)' },
      { property: 'IMPORTANT', value: 'Do not modify ID columns - they are used for data sync' },
    ],
  });

  // Generate multi-sheet workbook
  const workbook = generateMultiSheetExcel(sheets);

  // Generate filename with client name and date
  const safeClientName = data.clientName.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30);
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = options.filename || `${safeClientName}-Master-Planning-${dateStr}.xlsx`;

  await downloadExcel(workbook, filename);
}

/**
 * Export Timeline to Excel with comprehensive fields for offline editing
 * January 2026 - Full round-trip import/export support
 *
 * Includes all fields needed to fully edit timeline offline and re-import
 */
export async function exportTimelineExcel(
  items: Array<{
    id: string;
    clientId?: string;
    eventId?: string | null;
    title: string;
    description?: string | null;
    phase?: string | null;
    startTime: Date | string;
    endTime?: Date | string | null;
    durationMinutes?: number | null;
    location?: string | null;
    participants?: string[] | null;
    responsiblePerson?: string | null;
    completed?: boolean | null;
    sortOrder?: number | null;
    notes?: string | null;
    sourceModule?: string | null;
    sourceId?: string | null;
  }>,
  events: Array<{
    id: string;
    title: string;
    eventDate?: string | null;
  }>,
  options: ExcelOptions = {}
): Promise<void> {
  // Create event lookup map for human-readable names
  const eventMap = new Map(events.map(e => [e.id, e]));

  // Columns designed for complete offline editing
  const columns: ExcelColumn[] = [
    { header: 'ID', key: 'id', width: 38, hint: 'Do not modify - used for updates' },
    { header: 'Event Name', key: 'eventName', width: 25, hint: 'Select from events list' },
    { header: 'Event ID', key: 'eventId', width: 38, hint: 'Do not modify - auto-filled' },
    { header: 'Title', key: 'title', width: 30, hint: 'Required - Activity name' },
    { header: 'Description', key: 'description', width: 40, hint: 'Details about the activity' },
    { header: 'Phase', key: 'phase', width: 12, hint: 'setup/showtime/wrapup', validation: { type: 'list', options: ['setup', 'showtime', 'wrapup'] } },
    { header: 'Date', key: 'date', width: 12, hint: 'YYYY-MM-DD' },
    { header: 'Start Time', key: 'startTime', width: 12, hint: 'HH:MM (24hr)' },
    { header: 'End Time', key: 'endTime', width: 12, hint: 'HH:MM (24hr)' },
    { header: 'Duration (min)', key: 'durationMinutes', width: 14, hint: 'Numbers only' },
    { header: 'Location', key: 'location', width: 25, hint: 'Venue/room name' },
    { header: 'Participants', key: 'participants', width: 30, hint: 'Comma-separated names' },
    { header: 'Responsible Person', key: 'responsiblePerson', width: 20, hint: 'Person in charge' },
    { header: 'Completed', key: 'completed', width: 12, hint: 'Yes/No', validation: { type: 'boolean' } },
    { header: 'Sort Order', key: 'sortOrder', width: 12, hint: 'Numbers (0, 1, 2...)' },
    { header: 'Notes', key: 'notes', width: 40, hint: 'Additional notes' },
    { header: 'Source', key: 'sourceModule', width: 15, hint: 'Read-only - Auto-generated items' },
  ];

  // Format data for export
  const data = items.map((item) => {
    // Parse start/end times
    const startDate = item.startTime ? new Date(item.startTime) : null;
    const endDate = item.endTime ? new Date(item.endTime) : null;

    // Format date and time separately for easy editing
    const dateStr = startDate ? startDate.toISOString().split('T')[0] : '';
    const startTimeStr = startDate ? startDate.toTimeString().slice(0, 5) : '';
    const endTimeStr = endDate ? endDate.toTimeString().slice(0, 5) : '';

    // Get event info
    const event = item.eventId ? eventMap.get(item.eventId) : null;

    return {
      id: item.id,
      eventName: event?.title || '',
      eventId: item.eventId || '',
      title: item.title,
      description: item.description || '',
      phase: item.phase || 'showtime',
      date: dateStr,
      startTime: startTimeStr,
      endTime: endTimeStr,
      durationMinutes: item.durationMinutes ?? '',
      location: item.location || '',
      participants: item.participants?.join(', ') || '',
      responsiblePerson: item.responsiblePerson || '',
      completed: item.completed ? 'Yes' : 'No',
      sortOrder: item.sortOrder ?? 0,
      notes: item.notes || '',
      sourceModule: item.sourceModule || '',
    };
  });

  // Generate workbook with hints
  const workbook = generateExcelWithHints(columns, data, {
    sheetName: 'Timeline',
    includeHints: true,
    autoFilter: true,
    freezeRows: 2,
  });

  // Add Events reference sheet for dropdown validation
  const eventsSheet = workbook.addWorksheet('Events (Reference)');
  eventsSheet.columns = [
    { header: 'Event Name', key: 'title', width: 30 },
    { header: 'Event ID', key: 'id', width: 40 },
    { header: 'Event Date', key: 'date', width: 15 },
  ];
  eventsSheet.getRow(1).font = { bold: true };
  eventsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  eventsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  events.forEach((event) => {
    eventsSheet.addRow({
      title: event.title,
      id: event.id,
      date: event.eventDate || '',
    });
  });

  // Add instructions sheet
  const instructionsSheet = workbook.addWorksheet('Instructions');
  instructionsSheet.columns = [{ header: 'Instructions', key: 'text', width: 100 }];
  instructionsSheet.getRow(1).font = { bold: true, size: 14 };
  instructionsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  instructionsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  const instructions = [
    'TIMELINE IMPORT/EXPORT INSTRUCTIONS',
    '',
    '1. EDITING EXISTING ITEMS:',
    '   - Keep the ID column unchanged - it links to existing records',
    '   - Modify any other fields as needed',
    '   - Leave ID blank for new items',
    '',
    '2. ADDING NEW ITEMS:',
    '   - Leave the ID column empty',
    '   - Fill in Title (required) and other fields',
    '   - Copy Event ID from "Events (Reference)" sheet or leave blank for general items',
    '',
    '3. DELETING ITEMS:',
    '   - Remove the entire row from the spreadsheet',
    '   - Or mark for deletion by adding "DELETE" in the Notes column',
    '',
    '4. FIELD FORMATS:',
    '   - Date: YYYY-MM-DD (e.g., 2026-03-15)',
    '   - Times: HH:MM in 24-hour format (e.g., 14:30)',
    '   - Phase: setup, showtime, or wrapup',
    '   - Completed: Yes or No',
    '   - Participants: Comma-separated names',
    '',
    '5. EVENTS:',
    '   - See "Events (Reference)" sheet for valid event names and IDs',
    '   - Use Event Name for readability, Event ID is auto-matched on import',
    '',
    '6. AUTO-GENERATED ITEMS:',
    '   - Items with Source column filled are auto-generated from other modules',
    '   - These can be edited but may be overwritten if source data changes',
    '',
    'After editing, save and import this file back into WeddingFlo.',
  ];

  instructions.forEach((text, index) => {
    const row = instructionsSheet.addRow({ text });
    if (index === 0) {
      row.font = { bold: true, size: 12 };
    }
  });

  // Download
  const filename = options.filename || `timeline-${new Date().toISOString().split('T')[0]}.xlsx`;
  await downloadExcel(workbook, filename);
}
