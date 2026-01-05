/**
 * CSV Export utilities
 * Simple CSV generation and download
 */

export interface CSVColumn {
  header: string;
  key: string;
  hint?: string; // Format hint for this column (January 2026 enhanced format)
}

export interface CSVOptions {
  filename?: string;
  delimiter?: string;
  includeHeaders?: boolean;
  includeHints?: boolean; // Add format hints row (January 2026)
  dateFormat?: string;
}

/**
 * Convert data to CSV string
 * January 2026 - Added optional hints row for format guidance
 */
export function dataToCSV(
  columns: CSVColumn[],
  data: Array<Record<string, any>>,
  options: CSVOptions = {}
): string {
  const { delimiter = ',', includeHeaders = true, includeHints = false } = options;

  const rows: string[] = [];

  // Add headers
  if (includeHeaders) {
    const headers = columns.map((col) => escapeCSVValue(col.header)).join(delimiter);
    rows.push(headers);
  }

  // Add hints row (January 2026 enhanced format)
  if (includeHints && includeHeaders) {
    const hints = columns.map((col) => escapeCSVValue(col.hint || '')).join(delimiter);
    rows.push(hints);
  }

  // Add data rows
  data.forEach((row) => {
    const values = columns.map((col) => {
      const value = row[col.key];
      return escapeCSVValue(formatValue(value));
    });
    rows.push(values.join(delimiter));
  });

  return rows.join('\n');
}

/**
 * Escape CSV value (handle commas, quotes, newlines)
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If value contains delimiter, quotes, or newlines, wrap in quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    // Escape existing quotes by doubling them
    const escapedValue = stringValue.replace(/"/g, '""');
    return `"${escapedValue}"`;
  }

  return stringValue;
}

/**
 * Format value for CSV
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (Array.isArray(value)) {
    return value.join('; ');
  }

  if (typeof value === 'object' && value instanceof Date) {
    return value.toLocaleString();
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string = 'export.csv'): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Generate and download CSV
 */
export function generateAndDownloadCSV(
  columns: CSVColumn[],
  data: Array<Record<string, any>>,
  options: CSVOptions = {}
): void {
  const csv = dataToCSV(columns, data, options);
  downloadCSV(csv, options.filename || `export-${Date.now()}.csv`);
}

/**
 * Export guest list to CSV
 * Updated December 2025 - Professional wedding planner terminology
 * Based on research from WeddingWire, The Knot, and top wedding planners
 * Accepts both camelCase (from Drizzle ORM) and snake_case field names
 */
export function exportGuestListCSV(
  guests: Array<{
    // CamelCase (Drizzle ORM)
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    checkedIn?: boolean;
    groupName?: string;
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
    // Snake_case (legacy/alternative)
    first_name?: string;
    last_name?: string;
    checked_in?: boolean;
    group_name?: string;
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
    accessibility_needs?: string;
  }>,
  options: CSVOptions = {}
): void {
  // Columns match import template format for seamless round-trip editing
  // January 2026 - Added hints for user guidance
  const columns: CSVColumn[] = [
    { header: 'ID (Do Not Edit)', key: 'id', hint: 'Do not modify - system ID' },
    { header: 'Guest Name *', key: 'name', hint: 'Required - Full name' },
    { header: 'Email Address', key: 'email', hint: 'email@example.com' },
    { header: 'Phone Number', key: 'phone', hint: '+1234567890' },
    { header: 'Guest Group', key: 'group', hint: 'e.g. Family, Friends' },
    { header: 'RSVP Status', key: 'rsvp', hint: 'pending/accepted/declined' },
    { header: '# of Guests', key: 'partySize', hint: 'Numbers only (1+)' },
    { header: 'Additional Guests', key: 'additionalGuests', hint: 'Name1, Name2, ...' },
    { header: 'Relationship', key: 'relationship', hint: 'e.g. Cousin, Friend' },
    { header: 'Events Attending', key: 'attendingEvents', hint: 'Event1, Event2, ...' },
    { header: 'Arrival Date & Time', key: 'arrivalDatetime', hint: 'YYYY-MM-DD HH:MM' },
    { header: 'Arrival Transportation', key: 'arrivalMode', hint: 'e.g. Flight, Car' },
    { header: 'Departure Date & Time', key: 'departureDatetime', hint: 'YYYY-MM-DD HH:MM' },
    { header: 'Departure Transportation', key: 'departureMode', hint: 'e.g. Flight, Car' },
    { header: 'Meal Choice', key: 'mealPreference', hint: 'e.g. Veg, Non-Veg' },
    { header: 'Dietary Needs', key: 'dietary', hint: 'e.g. Gluten-free' },
    { header: 'Hotel Needed', key: 'hotel', hint: 'TRUE/FALSE' },
    { header: 'Shuttle Needed', key: 'transport', hint: 'TRUE/FALSE' },
    { header: 'Gift Received', key: 'gift', hint: 'Description of gift' },
    { header: 'Special Notes', key: 'notes', hint: 'Any special notes' },
    { header: 'Checked In', key: 'checkedIn', hint: 'Yes/No' },
  ];

  // Helper to format datetime
  const formatDatetime = (val: string | Date | undefined): string => {
    if (!val) return '';
    if (val instanceof Date) return val.toISOString().slice(0, 16).replace('T', ' ');
    return val;
  };

  const data = guests.map((guest: any) => {
    // Support both camelCase and snake_case
    const firstName = guest.firstName || guest.first_name || '';
    const lastName = guest.lastName || guest.last_name || '';
    const additionalNames = guest.additionalGuestNames || guest.additional_guest_names || [];
    const attendingEvents = guest.attendingEvents || guest.attending_events || [];

    // Combine firstName and lastName into single Name field
    const fullName = [firstName, lastName].filter(Boolean).join(' ');

    return {
      id: guest.id || '',
      name: fullName || '',
      email: guest.email || '',
      phone: guest.phone || '',
      group: guest.groupName || guest.group_name || '',
      rsvp: guest.rsvpStatus || guest.rsvp_status || 'pending',
      partySize: guest.partySize || guest.party_size || 1,
      additionalGuests: Array.isArray(additionalNames) ? additionalNames.join(', ') : (additionalNames || ''),
      relationship: guest.relationshipToFamily || guest.relationship_to_family || '',
      attendingEvents: Array.isArray(attendingEvents) ? attendingEvents.join(', ') : (attendingEvents || ''),
      arrivalDatetime: formatDatetime(guest.arrivalDatetime || guest.arrival_datetime),
      arrivalMode: guest.arrivalMode || guest.arrival_mode || '',
      departureDatetime: formatDatetime(guest.departureDatetime || guest.departure_datetime),
      departureMode: guest.departureMode || guest.departure_mode || '',
      mealPreference: guest.mealPreference || guest.meal_preference || '',
      dietary: guest.dietaryRestrictions || guest.dietary_restrictions || '',
      hotel: (guest.hotelRequired ?? guest.hotel_required) ? 'TRUE' : 'FALSE',
      transport: (guest.transportRequired ?? guest.transport_required) ? 'TRUE' : 'FALSE',
      gift: guest.giftToGive || guest.gift_to_give || '',
      notes: guest.notes || '',
      checkedIn: (guest.checkedIn ?? guest.checked_in) ? 'Yes' : 'No',
    };
  });

  generateAndDownloadCSV(columns, data, {
    filename: options.filename || `guest-list-${Date.now()}.csv`,
    includeHints: true, // January 2026 - Enable hints by default
    ...options,
  });
}

/**
 * Export budget to CSV
 */
export function exportBudgetCSV(
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
  options: CSVOptions = {}
): void {
  // January 2026 - Added hints for user guidance
  const columns: CSVColumn[] = [
    { header: 'Expense Name', key: 'expenseName', hint: 'Required - Name of expense' },
    { header: 'Expense Details', key: 'details', hint: 'Description' },
    { header: 'Category', key: 'category', hint: 'venue/catering/decor/etc.' },
    { header: 'Event', key: 'event', hint: 'Event name' },
    { header: 'Budgeted Amount', key: 'budget', hint: 'Numbers only' },
    { header: 'Transaction Date', key: 'transactionDate', hint: 'YYYY-MM-DD' },
    { header: 'Total Paid', key: 'totalAdvance', hint: 'Numbers only' },
    { header: 'Balance Due', key: 'balance', hint: 'Auto-calculated' },
    { header: 'Payment History', key: 'advanceDetails', hint: 'Payment records' },
    { header: 'Payment Status', key: 'status', hint: 'pending/partial/paid' },
    { header: 'Special Notes', key: 'notes', hint: 'Any notes' },
  ];

  const data = budgetItems.map((item) => {
    // Format advance payments as a summary string
    const advanceDetails = item.advance_payments?.map(adv =>
      `$${Number(adv.amount).toLocaleString()} on ${new Date(adv.payment_date).toLocaleDateString()} by ${adv.paid_by}${adv.notes ? ` (${adv.notes})` : ''}`
    ).join('; ') || '';

    return {
      expenseName: item.item || item.expense_details || '',
      details: item.expense_details || '',
      category: item.category,
      event: item.events?.title || '',
      budget: item.estimated_cost || 0,
      transactionDate: item.transaction_date ? new Date(item.transaction_date).toLocaleDateString() : '',
      totalAdvance: item.total_advance || 0,
      balance: item.balance_remaining || (item.estimated_cost || 0),
      advanceDetails,
      status: item.payment_status || 'pending',
      notes: item.notes || '',
    };
  });

  generateAndDownloadCSV(columns, data, {
    filename: options.filename || `budget-report-${Date.now()}.csv`,
    includeHints: true, // January 2026 - Enable hints by default
    ...options,
  });
}

/**
 * Export vendor list to CSV (Enhanced with all fields)
 */
export function exportVendorListCSV(
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
    // Enhanced fields
    event_title?: string;
    venue_address?: string;
    onsite_poc_name?: string;
    onsite_poc_phone?: string;
    onsite_poc_notes?: string;
    deliverables?: string;
    approval_status?: string;
    approval_comments?: string;
  }>,
  options: CSVOptions = {}
): void {
  // January 2026 - Added hints for user guidance
  const columns: CSVColumn[] = [
    { header: 'Vendor Name', key: 'name', hint: 'Required - Business name' },
    { header: 'Service Category', key: 'category', hint: 'photography/catering/etc.' },
    { header: 'Contact Person', key: 'contact', hint: 'Contact name' },
    { header: 'Phone Number', key: 'phone', hint: '+1234567890' },
    { header: 'Email Address', key: 'email', hint: 'email@example.com' },
    { header: 'Event', key: 'event', hint: 'Event name' },
    { header: 'Service Location', key: 'venueAddress', hint: 'Address' },
    { header: 'On-Site Contact', key: 'onsitePoc', hint: 'Day-of contact' },
    { header: 'Contact Phone', key: 'pocPhone', hint: '+1234567890' },
    { header: 'Contact Notes', key: 'pocNotes', hint: 'Notes' },
    { header: 'Services Provided', key: 'deliverables', hint: 'Description' },
    { header: 'Contract Amount', key: 'cost', hint: 'Numbers only' },
    { header: 'Deposit Paid', key: 'deposit', hint: 'Numbers only' },
    { header: 'Service Date', key: 'serviceDate', hint: 'YYYY-MM-DD' },
    { header: 'Payment Status', key: 'paymentStatus', hint: 'pending/partial/paid' },
    { header: 'Approval Status', key: 'approvalStatus', hint: 'pending/approved/rejected' },
    { header: 'Approval Notes', key: 'approvalComments', hint: 'Comments' },
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

  generateAndDownloadCSV(columns, data, {
    filename: options.filename || `vendor-list-${Date.now()}.csv`,
    includeHints: true, // January 2026 - Enable hints by default
    ...options,
  });
}

/**
 * Export hotel accommodations to CSV
 * Updated December 2025 to support both camelCase and snake_case field names
 */
export function exportHotelListCSV(
  hotels: Array<{
    // CamelCase (Drizzle ORM)
    guestName?: string;
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
    guest_name?: string;
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
    } | null;
  }>,
  options: CSVOptions = {}
): void {
  // January 2026 - Added hints for user guidance
  const columns: CSVColumn[] = [
    { header: 'Guest Name', key: 'guestName', hint: 'Required - Full name' },
    { header: '# of Guests', key: 'partySize', hint: 'Numbers only' },
    { header: 'Email Address', key: 'email', hint: 'email@example.com' },
    { header: 'Phone Number', key: 'phone', hint: '+1234567890' },
    { header: 'Hotel Needed', key: 'accommodationNeeded', hint: 'Yes/No' },
    { header: 'Hotel Name', key: 'hotelName', hint: 'Hotel name' },
    { header: 'Room Number', key: 'roomNumber', hint: 'e.g. 101' },
    { header: 'Room Type', key: 'roomType', hint: 'single/double/suite' },
    { header: 'Check-In', key: 'checkInDate', hint: 'YYYY-MM-DD' },
    { header: 'Check-Out', key: 'checkOutDate', hint: 'YYYY-MM-DD' },
    { header: 'Booking Confirmed', key: 'bookingConfirmed', hint: 'Yes/No' },
    { header: 'Checked In', key: 'checkedIn', hint: 'Yes/No' },
    { header: 'Room Cost', key: 'cost', hint: 'Numbers only' },
    { header: 'Payment Status', key: 'paymentStatus', hint: 'pending/paid' },
    { header: 'Special Notes', key: 'notes', hint: 'Any notes' },
  ];

  const data = hotels.map((hotel) => {
    // Support both camelCase and snake_case
    const guestName = hotel.guestName || hotel.guest_name || '';
    const accommodationNeeded = hotel.accommodationNeeded ?? hotel.accommodation_needed ?? true;
    const hotelName = hotel.hotelName || hotel.hotel_name || '';
    const roomNumber = hotel.roomNumber || hotel.room_number || '';
    const roomType = hotel.roomType || hotel.room_type || '';
    const checkInDate = hotel.checkInDate || hotel.check_in_date || '';
    const checkOutDate = hotel.checkOutDate || hotel.check_out_date || '';
    const bookingConfirmed = hotel.bookingConfirmed ?? hotel.booking_confirmed ?? false;
    const checkedIn = hotel.checkedIn ?? hotel.checked_in ?? false;
    const paymentStatus = hotel.paymentStatus || hotel.payment_status || '';
    const partySize = hotel.guests?.partySize || hotel.guests?.party_size || 1;

    return {
      guestName,
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

  generateAndDownloadCSV(columns, data, {
    filename: options.filename || `hotel-accommodations-${Date.now()}.csv`,
    includeHints: true, // January 2026 - Enable hints by default
    ...options,
  });
}

/**
 * Export timeline to CSV
 */
export function exportTimelineCSV(
  items: Array<{
    title: string;
    start_time: string;
    end_time?: string;
    duration_minutes?: number;
    location?: string;
    responsible_person?: string;
    description?: string;
    notes?: string;
    completed?: boolean;
  }>,
  options: CSVOptions = {}
): void {
  // January 2026 - Added hints for user guidance
  const columns: CSVColumn[] = [
    { header: 'Title', key: 'title', hint: 'Required - Activity name' },
    { header: 'Start Time', key: 'startTime', hint: 'HH:MM (24hr)' },
    { header: 'End Time', key: 'endTime', hint: 'HH:MM (24hr)' },
    { header: 'Duration (min)', key: 'duration', hint: 'Numbers only' },
    { header: 'Location', key: 'location', hint: 'Venue/room name' },
    { header: 'Responsible', key: 'responsible', hint: 'Person in charge' },
    { header: 'Description', key: 'description', hint: 'Details' },
    { header: 'Completed', key: 'completed', hint: 'Yes/No' },
  ];

  const data = items.map((item) => ({
    title: item.title,
    startTime: item.start_time,
    endTime: item.end_time || '',
    duration: item.duration_minutes ? item.duration_minutes.toString() : '',
    location: item.location || '',
    responsible: item.responsible_person || '',
    description: item.description || '',
    completed: item.completed ? 'Yes' : 'No',
  }));

  generateAndDownloadCSV(columns, data, {
    filename: options.filename || `timeline-${Date.now()}.csv`,
    includeHints: true, // January 2026 - Enable hints by default
    ...options,
  });
}

/**
 * Parse CSV string to data
 */
export function parseCSV(
  csvContent: string,
  options: { delimiter?: string; hasHeaders?: boolean } = {}
): Array<Record<string, string>> {
  const { delimiter = ',', hasHeaders = true } = options;

  const lines = csvContent.split('\n').filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return [];
  }

  let headers: string[] = [];
  let dataStartIndex = 0;

  if (hasHeaders) {
    headers = parseCSVLine(lines[0], delimiter);
    dataStartIndex = 1;
  } else {
    // Generate default headers (Column1, Column2, etc.)
    const firstLine = parseCSVLine(lines[0], delimiter);
    headers = firstLine.map((_, index) => `Column${index + 1}`);
  }

  const data: Array<Record<string, string>> = [];

  for (let i = dataStartIndex; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    data.push(row);
  }

  return data;
}

/**
 * Parse a single CSV line (handles quoted values)
 */
function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const values: string[] = [];
  let currentValue = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentValue += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      // End of value
      values.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  // Add last value
  values.push(currentValue.trim());

  return values;
}

/**
 * Export guest gifts to CSV
 * Updated December 2025 to match new API data structure
 */
export function exportGuestGiftListCSV(
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
  options: CSVOptions = {}
): void {
  // January 2026 - Added hints for user guidance
  const columns: CSVColumn[] = [
    { header: 'Guest Name', key: 'guestName', hint: 'Required - Full name' },
    { header: 'Guest Group', key: 'group', hint: 'e.g. Family, Friends' },
    { header: 'Email Address', key: 'email', hint: 'email@example.com' },
    { header: 'Phone Number', key: 'phone', hint: '+1234567890' },
    { header: 'Gift Item', key: 'giftName', hint: 'Gift name' },
    { header: 'Gift Category', key: 'giftType', hint: 'Category name' },
    { header: 'Quantity', key: 'quantity', hint: 'Numbers only' },
    { header: 'Delivery Date', key: 'deliveryDate', hint: 'YYYY-MM-DD' },
    { header: 'Delivery Time', key: 'deliveryTime', hint: 'HH:MM' },
    { header: 'Delivery Location', key: 'deliveryLocation', hint: 'Location name' },
    { header: 'Delivery Status', key: 'deliveryStatus', hint: 'pending/delivered' },
    { header: 'Delivered By', key: 'deliveredBy', hint: 'Person name' },
    { header: 'Special Notes', key: 'notes', hint: 'Any notes' },
  ];

  // Helper to format time to 12-hour format
  const formatTime = (time: string | null | undefined): string => {
    if (!time) return '';
    const parts = time.split(':');
    if (parts.length < 2) return time;
    let hours = parseInt(parts[0], 10);
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

  generateAndDownloadCSV(columns, data, {
    filename: options.filename || `guest-gifts-${Date.now()}.csv`,
    includeHints: true, // January 2026 - Enable hints by default
    ...options,
  });
}

/**
 * Export creatives list to CSV
 */
export function exportCreativesListCSV(
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
    revision_count?: number;
    notes?: string;
  }>,
  options: CSVOptions = {}
): void {
  // January 2026 - Added hints for user guidance
  const columns: CSVColumn[] = [
    { header: 'Design Name', key: 'title', hint: 'Required - Design title' },
    { header: 'Design Type', key: 'jobType', hint: 'e.g. invitation, menu' },
    { header: 'Quantity', key: 'quantity', hint: 'Numbers only' },
    { header: 'Start Date', key: 'startDate', hint: 'YYYY-MM-DD' },
    { header: 'Due Date', key: 'endDate', hint: 'YYYY-MM-DD' },
    { header: 'Status', key: 'status', hint: 'draft/in_progress/completed' },
    { header: 'Approval Status', key: 'approval', hint: 'pending/approved/rejected' },
    { header: 'Approval Notes', key: 'approvalComments', hint: 'Comments' },
    { header: 'Priority', key: 'priority', hint: 'low/medium/high' },
    { header: 'Design Details', key: 'description', hint: 'Description' },
    { header: 'Designer', key: 'assignedTo', hint: 'Person name' },
    { header: 'Revision Count', key: 'revisions', hint: 'Numbers only' },
    { header: 'Special Notes', key: 'notes', hint: 'Any notes' },
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

  generateAndDownloadCSV(columns, data, {
    filename: options.filename || `creatives-${Date.now()}.csv`,
    includeHints: true, // January 2026 - Enable hints by default
    ...options,
  });
}

/**
 * Export internal budget to CSV
 */
export function exportInternalBudgetCSV(
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
  options: CSVOptions = {}
): void {
  // January 2026 - Added hints for user guidance
  const columns: CSVColumn[] = [
    { header: 'Expense Details', key: 'expenseDetails', hint: 'Required - Description' },
    { header: 'Category', key: 'category', hint: 'venue/catering/decor/etc.' },
    { header: 'Event', key: 'event', hint: 'Event name' },
    { header: 'Budgeted Amount', key: 'budget', hint: 'Numbers only' },
    { header: 'Actual Spent', key: 'cost', hint: 'Numbers only' },
    { header: 'Variance', key: 'variance', hint: 'Auto-calculated' },
    { header: 'Transaction Date', key: 'transactionDate', hint: 'YYYY-MM-DD' },
    { header: 'Paid By', key: 'paidBy', hint: 'Person name' },
    { header: 'Special Notes', key: 'notes', hint: 'Any notes' },
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

  generateAndDownloadCSV(columns, data, {
    filename: options.filename || `internal-budget-${Date.now()}.csv`,
    includeHints: true, // January 2026 - Enable hints by default
    ...options,
  });
}

/**
 * Export event flow to CSV
 */
export function exportEventFlowCSV(
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
  options: CSVOptions = {}
): void {
  // Helper to calculate end time
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    if (!startTime) return '';
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  // January 2026 - Added hints for user guidance
  const columns: CSVColumn[] = [
    { header: 'Date', key: 'date', hint: 'YYYY-MM-DD' },
    { header: 'Activity', key: 'activity', hint: 'Required - Activity name' },
    { header: 'Activity Type', key: 'activityType', hint: 'ceremony/reception/etc.' },
    { header: 'Start Time', key: 'startTime', hint: 'HH:MM (24hr)' },
    { header: 'Duration (min)', key: 'duration', hint: 'Numbers only' },
    { header: 'End Time', key: 'endTime', hint: 'Auto-calculated' },
    { header: 'Event', key: 'event', hint: 'Event name' },
    { header: 'Location', key: 'location', hint: 'Venue/room name' },
    { header: 'Coordinator', key: 'manager', hint: 'Person in charge' },
    { header: 'Special Notes', key: 'notes', hint: 'Any notes' },
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

  generateAndDownloadCSV(columns, data, {
    filename: options.filename || `event-flow-${Date.now()}.csv`,
    includeHints: true, // January 2026 - Enable hints by default
    ...options,
  });
}

/**
 * Export gifts registry (gifts received from guests) to CSV
 */
export function exportGiftsRegistryCSV(
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
  options: CSVOptions = {}
): void {
  // January 2026 - Added hints for user guidance
  const columns: CSVColumn[] = [
    { header: 'Gift Received', key: 'giftName', hint: 'Required - Gift description' },
    { header: 'Guest Name', key: 'fromName', hint: 'Full name' },
    { header: 'Email Address', key: 'fromEmail', hint: 'email@example.com' },
    { header: 'Received On', key: 'deliveryDate', hint: 'YYYY-MM-DD' },
    { header: 'Status', key: 'deliveryStatus', hint: 'pending/received' },
    { header: 'Thank You Sent', key: 'thankYouSent', hint: 'Yes/No' },
    { header: 'Thank You Sent On', key: 'thankYouSentDate', hint: 'YYYY-MM-DD' },
    { header: 'Special Notes', key: 'notes', hint: 'Any notes' },
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

  generateAndDownloadCSV(columns, data, {
    filename: options.filename || `gift-registry-${Date.now()}.csv`,
    includeHints: true, // January 2026 - Enable hints by default
    ...options,
  });
}

/**
 * Export documents list to CSV
 */
export function exportDocumentsCSV(
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
  options: CSVOptions = {}
): void {
  // January 2026 - Added hints for user guidance
  const columns: CSVColumn[] = [
    { header: 'Document Name', key: 'name', hint: 'Required - File name' },
    { header: 'Document Type', key: 'documentType', hint: 'contract/invoice/etc.' },
    { header: 'Category', key: 'category', hint: 'Category name' },
    { header: 'Status', key: 'status', hint: 'active/archived' },
    { header: 'Uploaded By', key: 'uploadedBy', hint: 'Person name' },
    { header: 'Upload Date', key: 'createdAt', hint: 'YYYY-MM-DD' },
    { header: 'Signature Status', key: 'signatureStatus', hint: 'pending/signed/not_required' },
    { header: 'Signed By', key: 'signedBy', hint: 'Person name' },
    { header: 'Signed On', key: 'signedAt', hint: 'YYYY-MM-DD' },
    { header: 'Expires On', key: 'expiryDate', hint: 'YYYY-MM-DD' },
    { header: 'File Size (KB)', key: 'fileSize', hint: 'Numbers only' },
    { header: 'Tags', key: 'tags', hint: 'tag1, tag2, ...' },
    { header: 'Special Notes', key: 'notes', hint: 'Any notes' },
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
    tags: (doc.tags || []).join('; '),
    notes: doc.notes || '',
  }));

  generateAndDownloadCSV(columns, data, {
    filename: options.filename || `documents-${Date.now()}.csv`,
    includeHints: true, // January 2026 - Enable hints by default
    ...options,
  });
}

/**
 * Export guest transport to CSV
 * Updated December 2025 - Wedding planner-friendly terminology
 * Based on research from WeddingWire, The Knot, and professional wedding planners
 */
export function exportGuestTransportCSV(
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
  options: CSVOptions = {}
): void {
  // January 2026 - Added hints for user guidance
  const columns: CSVColumn[] = [
    { header: 'Guest Name', key: 'guestName', hint: 'Required - Full name' },
    { header: 'Guest Group', key: 'group', hint: 'e.g. Family, Friends' },
    { header: 'Email Address', key: 'email', hint: 'email@example.com' },
    { header: 'Phone Number', key: 'phone', hint: '+1234567890' },
    { header: 'Journey Type', key: 'legType', hint: 'arrival/departure/shuttle' },
    { header: 'Trip #', key: 'legSequence', hint: 'Numbers only' },
    { header: 'Pickup Date', key: 'pickupDate', hint: 'YYYY-MM-DD' },
    { header: 'Pickup Time', key: 'pickupTime', hint: 'HH:MM' },
    { header: 'Pickup Location', key: 'pickupFrom', hint: 'Location name' },
    { header: 'Drop-off Location', key: 'dropTo', hint: 'Location name' },
    { header: 'Status', key: 'transportStatus', hint: 'scheduled/completed/cancelled' },
    { header: 'Vehicle/Shuttle', key: 'vehicleInfo', hint: 'Vehicle details' },
    { header: 'Completed On', key: 'completedAt', hint: 'YYYY-MM-DD' },
    { header: 'Special Notes', key: 'notes', hint: 'Any notes' },
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

  generateAndDownloadCSV(columns, data, {
    filename: options.filename || `guest-transport-${Date.now()}.csv`,
    includeHints: true, // January 2026 - Enable hints by default
    ...options,
  });
}
