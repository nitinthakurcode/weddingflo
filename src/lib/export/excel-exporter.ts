/**
 * Excel Export utilities
 * Uses XLSX (SheetJS) for creating Excel exports
 */

import * as XLSX from 'xlsx';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
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

/**
 * Generate Excel file with single sheet
 */
export function generateExcel(
  columns: ExcelColumn[],
  data: Array<Record<string, any>>,
  options: ExcelOptions = {}
): XLSX.WorkBook {
  const { sheetName = 'Sheet1' } = options;

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Prepare data with headers
  const headers = columns.map((col) => col.header);
  const rows = data.map((row) => columns.map((col) => row[col.key] ?? ''));

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Set column widths
  const colWidths = columns.map((col) => ({
    wch: col.width || 15,
  }));
  worksheet['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  return workbook;
}

/**
 * Generate Excel file with multiple sheets
 */
export function generateMultiSheetExcel(sheets: ExcelSheet[]): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    // Prepare data with headers
    const headers = sheet.columns.map((col) => col.header);
    const rows = sheet.data.map((row) => sheet.columns.map((col) => row[col.key] ?? ''));

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Set column widths
    const colWidths = sheet.columns.map((col) => ({
      wch: col.width || 15,
    }));
    worksheet['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  });

  return workbook;
}

/**
 * Download Excel file
 */
export function downloadExcel(workbook: XLSX.WorkBook, filename: string = 'export.xlsx'): void {
  XLSX.writeFile(workbook, filename);
}

/**
 * Export guest list to Excel
 */
export function exportGuestListExcel(
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
  options: ExcelOptions = {}
): void {
  const columns: ExcelColumn[] = [
    { header: 'Guest Name', key: 'name', width: 25 },
    { header: 'Party Size', key: 'partySize', width: 12 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Events Attending', key: 'events', width: 30 },
    { header: 'Dietary Restrictions', key: 'dietary', width: 25 },
    { header: 'Special Needs', key: 'specialNeeds', width: 25 },
    { header: 'Checked In', key: 'checkedIn', width: 12 },
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

  const workbook = generateExcel(columns, data, {
    sheetName: 'Guests',
    ...options,
  });

  downloadExcel(workbook, options.filename || `guest-list-${Date.now()}.xlsx`);
}

/**
 * Export budget report to Excel
 */
export function exportBudgetExcel(
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
  options: ExcelOptions = {}
): void {
  const columns: ExcelColumn[] = [
    { header: 'Expense', key: 'expense', width: 30 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Subcategory', key: 'subcategory', width: 20 },
    { header: 'Budget', key: 'budget', width: 15 },
    { header: 'Estimated', key: 'estimated', width: 15 },
    { header: 'Actual', key: 'actual', width: 15 },
    { header: 'Paid', key: 'paid', width: 15 },
    { header: 'Pending', key: 'pending', width: 15 },
    { header: 'Variance', key: 'variance', width: 15 },
    { header: 'Variance %', key: 'variancePercent', width: 12 },
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

  // Add summary row
  const summary = {
    expense: 'TOTAL',
    category: '',
    subcategory: '',
    budget: budgetItems.reduce((sum, item) => sum + item.budget, 0),
    estimated: budgetItems.reduce((sum, item) => sum + item.estimated_cost, 0),
    actual: budgetItems.reduce((sum, item) => sum + item.actual_cost, 0),
    paid: budgetItems.reduce((sum, item) => sum + item.paid_amount, 0),
    pending: budgetItems.reduce((sum, item) => sum + item.pending_amount, 0),
    variance: budgetItems.reduce((sum, item) => sum + item.variance, 0),
    variancePercent: '',
  };

  data.push(summary);

  const workbook = generateExcel(columns, data, {
    sheetName: 'Budget',
    ...options,
  });

  downloadExcel(workbook, options.filename || `budget-report-${Date.now()}.xlsx`);
}

/**
 * Export vendor list to Excel
 */
export function exportVendorListExcel(
  vendors: Array<{
    name: string;
    category: string;
    contactName?: string;
    phone?: string;
    email?: string;
    status: string;
    totalCost: number;
    depositAmount?: number;
    balance?: number;
    contractDate?: string;
    serviceDate?: string;
  }>,
  options: ExcelOptions = {}
): void {
  const columns: ExcelColumn[] = [
    { header: 'Vendor Name', key: 'name', width: 25 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Contact Person', key: 'contact', width: 20 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Total Cost', key: 'cost', width: 15 },
    { header: 'Deposit', key: 'deposit', width: 15 },
    { header: 'Balance', key: 'balance', width: 15 },
    { header: 'Contract Date', key: 'contractDate', width: 15 },
    { header: 'Service Date', key: 'serviceDate', width: 15 },
  ];

  const data = vendors.map((vendor) => ({
    name: vendor.name,
    category: vendor.category,
    contact: vendor.contactName || '',
    phone: vendor.phone || '',
    email: vendor.email || '',
    status: vendor.status,
    cost: vendor.totalCost,
    deposit: vendor.depositAmount || 0,
    balance: vendor.balance || 0,
    contractDate: vendor.contractDate || '',
    serviceDate: vendor.serviceDate || '',
  }));

  const workbook = generateExcel(columns, data, {
    sheetName: 'Vendors',
    ...options,
  });

  downloadExcel(workbook, options.filename || `vendor-list-${Date.now()}.xlsx`);
}

/**
 * Export comprehensive wedding data to Excel (multi-sheet)
 */
export function exportComprehensiveWeddingData(
  data: {
    guests: any[];
    budget: any[];
    vendors: any[];
    timeline: any[];
  },
  options: ExcelOptions = {}
): void {
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
  downloadExcel(workbook, options.filename || `wedding-data-${Date.now()}.xlsx`);
}
