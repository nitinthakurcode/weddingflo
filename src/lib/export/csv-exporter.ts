/**
 * CSV Export utilities
 * Simple CSV generation and download
 */

export interface CSVColumn {
  header: string;
  key: string;
}

export interface CSVOptions {
  filename?: string;
  delimiter?: string;
  includeHeaders?: boolean;
  dateFormat?: string;
}

/**
 * Convert data to CSV string
 */
export function dataToCSV(
  columns: CSVColumn[],
  data: Array<Record<string, any>>,
  options: CSVOptions = {}
): string {
  const { delimiter = ',', includeHeaders = true } = options;

  const rows: string[] = [];

  // Add headers
  if (includeHeaders) {
    const headers = columns.map((col) => escapeCSVValue(col.header)).join(delimiter);
    rows.push(headers);
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
 */
export function exportGuestListCSV(
  guests: Array<{
    guest_name: string;
    number_of_packs: number;
    phone_number?: string;
    email?: string;
    checked_in: boolean;
    events_attending: string[];
    dietary_restrictions?: string[];
    special_needs?: string;
  }>,
  options: CSVOptions = {}
): void {
  const columns: CSVColumn[] = [
    { header: 'Guest Name', key: 'name' },
    { header: 'Party Size', key: 'partySize' },
    { header: 'Phone', key: 'phone' },
    { header: 'Email', key: 'email' },
    { header: 'Events Attending', key: 'events' },
    { header: 'Dietary Restrictions', key: 'dietary' },
    { header: 'Special Needs', key: 'specialNeeds' },
    { header: 'Checked In', key: 'checkedIn' },
  ];

  const data = guests.map((guest) => ({
    name: guest.guest_name,
    partySize: guest.number_of_packs,
    phone: guest.phone_number || '',
    email: guest.email || '',
    events: guest.events_attending.join(', '),
    dietary: guest.dietary_restrictions?.join(', ') || '',
    specialNeeds: guest.special_needs || '',
    checkedIn: guest.checked_in ? 'Yes' : 'No',
  }));

  generateAndDownloadCSV(columns, data, {
    filename: options.filename || `guest-list-${Date.now()}.csv`,
    ...options,
  });
}

/**
 * Export budget to CSV
 */
export function exportBudgetCSV(
  budgetItems: Array<{
    expense_details: string;
    category: string;
    subcategory?: string;
    budget: number;
    estimated_cost: number;
    actual_cost: number;
    paid_amount: number;
    pending_amount: number;
    variance: number;
    variance_percentage: number;
  }>,
  options: CSVOptions = {}
): void {
  const columns: CSVColumn[] = [
    { header: 'Expense', key: 'expense' },
    { header: 'Category', key: 'category' },
    { header: 'Subcategory', key: 'subcategory' },
    { header: 'Budget', key: 'budget' },
    { header: 'Estimated', key: 'estimated' },
    { header: 'Actual', key: 'actual' },
    { header: 'Paid', key: 'paid' },
    { header: 'Pending', key: 'pending' },
    { header: 'Variance', key: 'variance' },
    { header: 'Variance %', key: 'variancePercent' },
  ];

  const data = budgetItems.map((item) => ({
    expense: item.expense_details,
    category: item.category,
    subcategory: item.subcategory || '',
    budget: item.budget,
    estimated: item.estimated_cost,
    actual: item.actual_cost,
    paid: item.paid_amount,
    pending: item.pending_amount,
    variance: item.variance,
    variancePercent: `${item.variance_percentage.toFixed(1)}%`,
  }));

  generateAndDownloadCSV(columns, data, {
    filename: options.filename || `budget-report-${Date.now()}.csv`,
    ...options,
  });
}

/**
 * Export vendor list to CSV
 */
export function exportVendorListCSV(
  vendors: Array<{
    name: string;
    category: string;
    contactName?: string;
    phone?: string;
    email?: string;
    status: string;
    totalCost: number;
  }>,
  options: CSVOptions = {}
): void {
  const columns: CSVColumn[] = [
    { header: 'Vendor Name', key: 'name' },
    { header: 'Category', key: 'category' },
    { header: 'Contact Person', key: 'contact' },
    { header: 'Phone', key: 'phone' },
    { header: 'Email', key: 'email' },
    { header: 'Status', key: 'status' },
    { header: 'Total Cost', key: 'cost' },
  ];

  const data = vendors.map((vendor) => ({
    name: vendor.name,
    category: vendor.category,
    contact: vendor.contactName || '',
    phone: vendor.phone || '',
    email: vendor.email || '',
    status: vendor.status,
    cost: vendor.totalCost,
  }));

  generateAndDownloadCSV(columns, data, {
    filename: options.filename || `vendor-list-${Date.now()}.csv`,
    ...options,
  });
}

/**
 * Export timeline to CSV
 */
export function exportTimelineCSV(
  events: Array<{
    activity: string;
    start_time: string;
    end_time: string;
    location: string;
    manager: string;
    event: string;
  }>,
  options: CSVOptions = {}
): void {
  const columns: CSVColumn[] = [
    { header: 'Start Time', key: 'startTime' },
    { header: 'End Time', key: 'endTime' },
    { header: 'Activity', key: 'activity' },
    { header: 'Event', key: 'event' },
    { header: 'Location', key: 'location' },
    { header: 'Manager', key: 'manager' },
  ];

  const data = events.map((event) => ({
    startTime: event.start_time,
    endTime: event.end_time,
    activity: event.activity,
    event: event.event,
    location: event.location,
    manager: event.manager,
  }));

  generateAndDownloadCSV(columns, data, {
    filename: options.filename || `timeline-${Date.now()}.csv`,
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
