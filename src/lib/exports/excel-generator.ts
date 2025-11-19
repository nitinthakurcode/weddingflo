import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface ExcelSheetData {
  sheetName: string;
  data: any[];
  columns?: string[];
}

interface ExcelExportOptions {
  filename: string;
  sheets: ExcelSheetData[];
  author?: string;
  company?: string;
}

/**
 * Excel Generator
 * Session 54: Excel export system with multiple sheets
 */
export class ExcelGenerator {
  private workbook: XLSX.WorkBook;

  constructor() {
    this.workbook = XLSX.utils.book_new();
  }

  /**
   * Add a sheet with data
   */
  addSheet(sheetData: ExcelSheetData) {
    const { sheetName, data, columns } = sheetData;

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data, {
      header: columns,
    });

    // Auto-size columns
    const colWidths = this.calculateColumnWidths(data, columns);
    worksheet['!cols'] = colWidths;

    // Add to workbook
    XLSX.utils.book_append_sheet(this.workbook, worksheet, sheetName);
  }

  /**
   * Calculate optimal column widths
   */
  private calculateColumnWidths(data: any[], columns?: string[]) {
    const keys = columns || Object.keys(data[0] || {});

    return keys.map((key) => {
      const maxLength = Math.max(
        key.length,
        ...data.map((row) => {
          const value = row[key];
          return value ? String(value).length : 0;
        })
      );

      return { wch: Math.min(maxLength + 2, 50) };
    });
  }

  /**
   * Add summary sheet with key metrics
   */
  addSummarySheet(summary: Record<string, any>) {
    const data = Object.entries(summary).map(([key, value]) => ({
      Metric: key,
      Value: value,
    }));

    this.addSheet({
      sheetName: 'Summary',
      data,
    });
  }

  /**
   * Generate buffer for download or storage
   */
  toBuffer(): Buffer {
    return XLSX.write(this.workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;
  }

  /**
   * Generate base64 string
   */
  toBase64(): string {
    const buffer = this.toBuffer();
    return buffer.toString('base64');
  }

  /**
   * Set workbook properties
   */
  setProperties(options: { author?: string; company?: string; title?: string }) {
    this.workbook.Props = {
      ...this.workbook.Props,
      ...options,
      CreatedDate: new Date(),
    };
  }
}

// ==========================================
// PRESET REPORT GENERATORS
// ==========================================

/**
 * Generate Client Summary Report
 */
export async function generateClientSummaryExcel(clientData: {
  client: any;
  guests: any[];
  budgetItems: any[];
  events: any[];
  timeline: any[];
}) {
  const generator = new ExcelGenerator();

  // Sheet 1: Client Overview
  generator.addSheet({
    sheetName: 'Client Overview',
    data: [
      {
        'Client Name': `${clientData.client.partner1_first_name || ''} ${clientData.client.partner1_last_name || ''}`,
        Email: clientData.client.partner1_email || '',
        Phone: clientData.client.partner1_phone || '',
        'Wedding Date': clientData.client.wedding_date
          ? format(new Date(clientData.client.wedding_date), 'PP')
          : 'TBD',
        Venue: clientData.client.venue || 'TBD',
        'Guest Count': clientData.guests.length,
        'Budget Total': `$${clientData.budgetItems
          .reduce((sum, item) => sum + (item.estimated_cost || 0), 0)
          .toFixed(2)}`,
      },
    ],
  });

  // Sheet 2: Guest List
  generator.addSheet({
    sheetName: 'Guest List',
    data: clientData.guests.map((guest) => ({
      'First Name': guest.first_name,
      'Last Name': guest.last_name,
      Email: guest.email || '',
      Phone: guest.phone || '',
      'RSVP Status': guest.rsvp_status || 'pending',
      'Plus Ones': guest.plus_ones || 0,
      'Dietary Restrictions': guest.dietary_restrictions?.join(', ') || 'None',
      'Table Assignment': guest.table_number || 'Unassigned',
    })),
  });

  // Sheet 3: Budget Breakdown
  generator.addSheet({
    sheetName: 'Budget',
    data: clientData.budgetItems.map((item) => ({
      Category: item.category || 'Uncategorized',
      Item: item.item_name || '',
      Vendor: item.vendor_name || 'TBD',
      Estimated: `$${(item.estimated_cost || 0).toFixed(2)}`,
      Actual: `$${(item.actual_cost || 0).toFixed(2)}`,
      Variance: `$${((item.actual_cost || 0) - (item.estimated_cost || 0)).toFixed(2)}`,
      Paid: item.paid_amount > 0 ? 'Yes' : 'No',
    })),
  });

  // Sheet 4: Timeline
  if (clientData.timeline && clientData.timeline.length > 0) {
    generator.addSheet({
      sheetName: 'Timeline',
      data: clientData.timeline.map((item) => ({
        Time: item.time || '',
        Event: item.title || '',
        Duration: item.duration ? `${item.duration} minutes` : '',
        Location: item.location || '',
        Notes: item.notes || '',
      })),
    });
  }

  // Sheet 5: Events
  if (clientData.events && clientData.events.length > 0) {
    generator.addSheet({
      sheetName: 'Events',
      data: clientData.events.map((event) => ({
        'Event Name': event.name || '',
        Date: event.date ? format(new Date(event.date), 'PP') : 'TBD',
        Time: event.time || '',
        Venue: event.venue || '',
        'Guest Count': event.guest_count || 0,
      })),
    });
  }

  // Add summary
  generator.addSummarySheet({
    'Total Guests': clientData.guests.length,
    'Confirmed Guests': clientData.guests.filter((g) => g.rsvp_status === 'confirmed').length,
    'Total Budget': `$${clientData.budgetItems
      .reduce((sum, item) => sum + (item.estimated_cost || 0), 0)
      .toFixed(2)}`,
    'Total Spent': `$${clientData.budgetItems
      .reduce((sum, item) => sum + (item.actual_cost || 0), 0)
      .toFixed(2)}`,
    'Paid Items': clientData.budgetItems.filter((item) => item.paid_amount > 0).length,
    'Upcoming Events': clientData.events?.filter((e) => new Date(e.date) > new Date()).length || 0,
  });

  generator.setProperties({
    title: `${clientData.client.partner1_first_name} ${clientData.client.partner1_last_name} - Wedding Summary`,
    author: 'WeddingFlow Pro',
    company: 'WeddingFlow',
  });

  return generator;
}

/**
 * Generate Guest Analytics Report
 */
export async function generateGuestAnalyticsExcel(analyticsData: any) {
  const generator = new ExcelGenerator();

  // Sheet 1: RSVP Summary
  generator.addSheet({
    sheetName: 'RSVP Summary',
    data: [
      {
        Status: 'Confirmed',
        Count: analyticsData.confirmed,
        Percentage: `${((analyticsData.confirmed / analyticsData.total) * 100).toFixed(1)}%`,
      },
      {
        Status: 'Declined',
        Count: analyticsData.declined,
        Percentage: `${((analyticsData.declined / analyticsData.total) * 100).toFixed(1)}%`,
      },
      {
        Status: 'Pending',
        Count: analyticsData.pending,
        Percentage: `${((analyticsData.pending / analyticsData.total) * 100).toFixed(1)}%`,
      },
      { Status: 'Total', Count: analyticsData.total, Percentage: '100%' },
    ],
  });

  // Sheet 2: Dietary Restrictions
  if (analyticsData.dietaryRestrictions) {
    generator.addSheet({
      sheetName: 'Dietary Restrictions',
      data: Object.entries(analyticsData.dietaryRestrictions).map(([restriction, count]) => ({
        Restriction: restriction,
        Count: count,
      })),
    });
  }

  // Sheet 3: By Event
  if (analyticsData.byEvent) {
    generator.addSheet({
      sheetName: 'By Event',
      data: Object.entries(analyticsData.byEvent).map(([event, data]: [string, any]) => ({
        Event: event,
        'Total Guests': data.total,
        Confirmed: data.confirmed,
        Declined: data.declined,
        Pending: data.pending,
      })),
    });
  }

  generator.setProperties({
    title: 'Guest Analytics Report',
    author: 'WeddingFlow Pro',
  });

  return generator;
}

/**
 * Generate Budget Report
 */
export async function generateBudgetReportExcel(budgetData: any) {
  const generator = new ExcelGenerator();

  // Sheet 1: Category Summary
  generator.addSheet({
    sheetName: 'By Category',
    data: Object.entries(budgetData.byCategory).map(([category, data]: [string, any]) => ({
      Category: category,
      Estimated: `$${data.estimated.toFixed(2)}`,
      Actual: `$${data.actual.toFixed(2)}`,
      Variance: `$${data.variance.toFixed(2)}`,
      'Item Count': data.count,
      'Percent of Budget': `${((data.estimated / budgetData.totalEstimated) * 100).toFixed(1)}%`,
    })),
  });

  // Sheet 2: Detailed Items
  generator.addSheet({
    sheetName: 'All Items',
    data: budgetData.items.map((item: any) => ({
      Category: item.category,
      Item: item.name,
      Vendor: item.vendorName || 'TBD',
      Estimated: `$${(item.estimatedCost || 0).toFixed(2)}`,
      Actual: `$${(item.actualCost || 0).toFixed(2)}`,
      Variance: `$${((item.actualCost || 0) - (item.estimatedCost || 0)).toFixed(2)}`,
      'Payment Status': item.paid ? 'Paid' : 'Unpaid',
      'Due Date': item.dueDate ? format(new Date(item.dueDate), 'PP') : 'TBD',
    })),
  });

  // Add summary
  generator.addSummarySheet({
    'Total Estimated': `$${budgetData.totalEstimated.toFixed(2)}`,
    'Total Actual': `$${budgetData.totalActual.toFixed(2)}`,
    'Total Variance': `$${(budgetData.totalActual - budgetData.totalEstimated).toFixed(2)}`,
    'Total Paid': `$${budgetData.totalPaid.toFixed(2)}`,
    'Total Outstanding': `$${(budgetData.totalActual - budgetData.totalPaid).toFixed(2)}`,
    'Number of Items': budgetData.items.length,
    'Paid Items': budgetData.items.filter((i: any) => i.paid).length,
  });

  generator.setProperties({
    title: 'Budget Report',
    author: 'WeddingFlow Pro',
  });

  return generator;
}
