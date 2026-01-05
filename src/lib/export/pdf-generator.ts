/**
 * PDF Generation utilities
 * Uses jsPDF and jspdf-autotable for creating PDF exports
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PDFOptions {
  title?: string;
  subtitle?: string;
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'a4' | 'letter';
  margins?: { top: number; right: number; bottom: number; left: number };
  filename?: string;
}

export interface TableColumn {
  header: string;
  dataKey: string;
  width?: number;
}

export interface TableData {
  [key: string]: any;
}

/**
 * Generate a PDF with a table
 */
export function generatePDFWithTable(
  columns: TableColumn[],
  data: TableData[],
  options: PDFOptions = {}
): jsPDF {
  const {
    title = 'Report',
    subtitle,
    orientation = 'portrait',
    pageSize = 'a4',
    margins = { top: 20, right: 14, bottom: 20, left: 14 },
  } = options;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: pageSize,
  });

  // Add title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margins.left, margins.top);

  let currentY = margins.top + 10;

  // Add subtitle if provided
  if (subtitle) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, margins.left, currentY);
    currentY += 8;
  }

  // Add generation date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, margins.left, currentY);
  currentY += 10;

  // Generate table
  autoTable(doc, {
    startY: currentY,
    head: [columns.map((col) => col.header)],
    body: data.map((row) => columns.map((col) => row[col.dataKey] || '')),
    margin: margins,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [66, 66, 66],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  return doc;
}

/**
 * Export guest list to PDF
 */
export function exportGuestListPDF(
  guests: Array<{
    first_name: string;
    last_name?: string;
    phone?: string;
    email?: string;
    checked_in?: boolean;
    group_name?: string;
    dietary_restrictions?: string;
    accessibility_needs?: string;
    plus_one_allowed?: boolean;
    rsvp_status?: string;
    hotel_required?: boolean;
    transport_required?: boolean;
  }>,
  options: PDFOptions = {}
): void {
  const columns: TableColumn[] = [
    { header: 'Name', dataKey: 'name' },
    { header: 'Group', dataKey: 'group' },
    { header: 'Phone', dataKey: 'phone' },
    { header: 'Email', dataKey: 'email' },
    { header: 'RSVP', dataKey: 'rsvp' },
    { header: 'Plus One', dataKey: 'plusOne' },
    { header: 'Checked In', dataKey: 'checkedIn' },
  ];

  const data = guests.map((guest) => ({
    name: `${guest.first_name} ${guest.last_name || ''}`.trim(),
    group: guest.group_name || 'N/A',
    phone: guest.phone || 'N/A',
    email: guest.email || 'N/A',
    rsvp: guest.rsvp_status || 'pending',
    plusOne: guest.plus_one_allowed ? 'Yes' : 'No',
    checkedIn: guest.checked_in ? 'Yes' : 'No',
  }));

  const attending = guests.filter(g => g.rsvp_status === 'accepted').length;

  const doc = generatePDFWithTable(columns, data, {
    title: 'Guest List',
    subtitle: `Total Guests: ${guests.length} | Attending: ${attending}`,
    ...options,
  });

  doc.save(options.filename || `guest-list-${Date.now()}.pdf`);
}

/**
 * Export budget report to PDF
 */
export function exportBudgetReportPDF(
  budgetItems: Array<{
    expense_details: string;
    category: string;
    budget: number;
    actual_cost: number;
    variance: number;
    variance_percentage: number;
  }>,
  summary: {
    total_budget: number;
    total_actual: number;
    total_variance: number;
  },
  options: PDFOptions = {}
): void {
  const columns: TableColumn[] = [
    { header: 'Expense', dataKey: 'expense' },
    { header: 'Category', dataKey: 'category' },
    { header: 'Budget', dataKey: 'budget' },
    { header: 'Actual', dataKey: 'actual' },
    { header: 'Variance', dataKey: 'variance' },
    { header: 'Variance %', dataKey: 'variancePercent' },
  ];

  const data = budgetItems.map((item) => ({
    expense: item.expense_details,
    category: item.category,
    budget: `$${item.budget.toFixed(2)}`,
    actual: `$${item.actual_cost.toFixed(2)}`,
    variance: `$${item.variance.toFixed(2)}`,
    variancePercent: `${item.variance_percentage.toFixed(1)}%`,
  }));

  const doc = generatePDFWithTable(columns, data, {
    title: 'Budget Report',
    subtitle: `Total Budget: $${summary.total_budget.toFixed(2)} | Actual: $${summary.total_actual.toFixed(2)} | Variance: $${summary.total_variance.toFixed(2)}`,
    orientation: 'landscape',
    ...options,
  });

  doc.save(options.filename || `budget-report-${Date.now()}.pdf`);
}

/**
 * Export vendor list to PDF
 */
export function exportVendorListPDF(
  vendors: Array<{
    name: string;
    category: string;
    contactName?: string;
    phone?: string;
    email?: string;
    status: string;
    totalCost: number;
  }>,
  options: PDFOptions = {}
): void {
  const columns: TableColumn[] = [
    { header: 'Vendor Name', dataKey: 'name' },
    { header: 'Category', dataKey: 'category' },
    { header: 'Contact', dataKey: 'contact' },
    { header: 'Phone', dataKey: 'phone' },
    { header: 'Status', dataKey: 'status' },
    { header: 'Total Cost', dataKey: 'cost' },
  ];

  const data = vendors.map((vendor) => ({
    name: vendor.name,
    category: vendor.category,
    contact: vendor.contactName || 'N/A',
    phone: vendor.phone || 'N/A',
    status: vendor.status,
    cost: `$${vendor.totalCost.toFixed(2)}`,
  }));

  const totalCost = vendors.reduce((sum, v) => sum + v.totalCost, 0);

  const doc = generatePDFWithTable(columns, data, {
    title: 'Vendor List',
    subtitle: `Total Vendors: ${vendors.length} | Total Cost: $${totalCost.toFixed(2)}`,
    orientation: 'landscape',
    ...options,
  });

  doc.save(options.filename || `vendor-list-${Date.now()}.pdf`);
}

/**
 * Export event timeline to PDF
 */
export function exportTimelinePDF(
  items: Array<{
    title: string;
    start_time: string;
    end_time?: string;
    duration_minutes?: number;
    location?: string;
    responsible_person?: string;
    description?: string;
    completed?: boolean;
  }>,
  options: PDFOptions = {}
): void {
  const columns: TableColumn[] = [
    { header: 'Time', dataKey: 'time' },
    { header: 'Title', dataKey: 'title' },
    { header: 'Location', dataKey: 'location' },
    { header: 'Responsible', dataKey: 'responsible' },
    { header: 'Status', dataKey: 'status' },
  ];

  const data = items.map((item) => ({
    time: item.end_time ? `${item.start_time} - ${item.end_time}` : item.start_time,
    title: item.title,
    location: item.location || 'N/A',
    responsible: item.responsible_person || 'N/A',
    status: item.completed ? 'Completed' : 'Pending',
  }));

  const completed = items.filter(i => i.completed).length;

  const doc = generatePDFWithTable(columns, data, {
    title: 'Wedding Day Timeline',
    subtitle: `Total Items: ${items.length} | Completed: ${completed}`,
    ...options,
  });

  doc.save(options.filename || `timeline-${Date.now()}.pdf`);
}

/**
 * Generate a custom PDF report
 */
export function generateCustomPDFReport(
  title: string,
  sections: Array<{
    title: string;
    content: string | { columns: TableColumn[]; data: TableData[] };
  }>,
  options: PDFOptions = {}
): jsPDF {
  const {
    orientation = 'portrait',
    pageSize = 'a4',
    margins = { top: 20, right: 14, bottom: 20, left: 14 },
  } = options;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: pageSize,
  });

  // Add main title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margins.left, margins.top);

  let currentY = margins.top + 15;

  // Add sections
  sections.forEach((section, index) => {
    // Check if we need a new page
    if (currentY > 250) {
      doc.addPage();
      currentY = margins.top;
    }

    // Section title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(section.title, margins.left, currentY);
    currentY += 8;

    // Section content
    if (typeof section.content === 'string') {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(section.content, 180);
      doc.text(lines, margins.left, currentY);
      currentY += lines.length * 5 + 10;
    } else {
      // Table content
      const tableContent = section.content;
      autoTable(doc, {
        startY: currentY,
        head: [tableContent.columns.map((col) => col.header)],
        body: tableContent.data.map((row) =>
          tableContent.columns.map((col: TableColumn) => row[col.dataKey] || '')
        ),
        margin: margins,
        styles: { fontSize: 9 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }
  });

  return doc;
}
