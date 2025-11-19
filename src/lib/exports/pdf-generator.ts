import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface PDFOptions {
  title: string;
  subtitle?: string;
  author?: string;
  companyLogo?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

/**
 * PDF Generator
 * Session 54: PDF export with branding and charts
 */
export class PDFGenerator {
  private doc: jsPDF;
  private options: PDFOptions;
  private yPosition: number = 20;

  constructor(options: PDFOptions) {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    this.options = options;
    this.addHeader();
  }

  /**
   * Add header with logo and title
   */
  private addHeader() {
    const { title, subtitle, companyLogo, primaryColor = '#4F46E5' } = this.options;

    // Add logo if provided
    if (companyLogo) {
      // TODO: Add logo image
      // this.doc.addImage(companyLogo, 'PNG', 15, 15, 30, 30)
      this.yPosition = 50;
    }

    // Title
    this.doc.setFontSize(24);
    this.doc.setTextColor(primaryColor);
    this.doc.text(title, 15, this.yPosition);
    this.yPosition += 10;

    // Subtitle
    if (subtitle) {
      this.doc.setFontSize(12);
      this.doc.setTextColor('#6B7280');
      this.doc.text(subtitle, 15, this.yPosition);
      this.yPosition += 8;
    }

    // Date
    this.doc.setFontSize(10);
    this.doc.setTextColor('#9CA3AF');
    this.doc.text(`Generated: ${format(new Date(), 'PPP')}`, 15, this.yPosition);
    this.yPosition += 15;
  }

  /**
   * Add section header
   */
  addSectionHeader(text: string) {
    this.checkPageBreak(15);

    this.doc.setFontSize(16);
    this.doc.setTextColor(this.options.primaryColor || '#4F46E5');
    this.doc.text(text, 15, this.yPosition);
    this.yPosition += 8;

    // Underline
    this.doc.setDrawColor('#E5E7EB');
    this.doc.line(15, this.yPosition, 195, this.yPosition);
    this.yPosition += 5;
  }

  /**
   * Add paragraph text
   */
  addParagraph(text: string) {
    this.checkPageBreak(20);

    this.doc.setFontSize(11);
    this.doc.setTextColor('#374151');

    const splitText = this.doc.splitTextToSize(text, 180);
    this.doc.text(splitText, 15, this.yPosition);
    this.yPosition += splitText.length * 5 + 5;
  }

  /**
   * Add key-value pair
   */
  addKeyValue(key: string, value: string) {
    this.checkPageBreak(8);

    this.doc.setFontSize(11);
    this.doc.setTextColor('#6B7280');
    this.doc.text(key + ':', 15, this.yPosition);

    this.doc.setTextColor('#111827');
    this.doc.text(value, 70, this.yPosition);
    this.yPosition += 6;
  }

  /**
   * Add table
   */
  addTable(headers: string[], data: any[][]) {
    this.checkPageBreak(40);

    autoTable(this.doc, {
      head: [headers],
      body: data,
      startY: this.yPosition,
      theme: 'grid',
      headStyles: {
        fillColor: this.hexToRgb(this.options.primaryColor || '#4F46E5'),
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [55, 65, 81],
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
    });

    // @ts-ignore - autoTable updates cursor position
    this.yPosition = this.doc.lastAutoTable.finalY + 10;
  }

  /**
   * Add chart image (requires pre-generated chart)
   */
  addChart(chartImageBase64: string, width: number = 180, height: number = 100) {
    this.checkPageBreak(height + 10);

    this.doc.addImage(chartImageBase64, 'PNG', 15, this.yPosition, width, height);
    this.yPosition += height + 10;
  }

  /**
   * Add summary box
   */
  addSummaryBox(items: Array<{ label: string; value: string }>) {
    this.checkPageBreak(items.length * 10 + 20);

    // Draw box
    this.doc.setDrawColor(this.options.primaryColor || '#4F46E5');
    this.doc.setLineWidth(0.5);
    this.doc.rect(15, this.yPosition, 180, items.length * 10 + 10);

    this.yPosition += 8;

    // Add items
    items.forEach((item) => {
      this.doc.setFontSize(11);
      this.doc.setTextColor('#6B7280');
      this.doc.text(item.label, 20, this.yPosition);

      this.doc.setTextColor('#111827');
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(item.value, 130, this.yPosition);
      this.doc.setFont('helvetica', 'normal');

      this.yPosition += 8;
    });

    this.yPosition += 12;
  }

  /**
   * Check if we need a page break
   */
  private checkPageBreak(requiredSpace: number) {
    if (this.yPosition + requiredSpace > 280) {
      this.doc.addPage();
      this.yPosition = 20;
    }
  }

  /**
   * Add footer to all pages
   */
  private addFooter() {
    const pageCount = this.doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(9);
      this.doc.setTextColor('#9CA3AF');
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.doc.internal.pageSize.width / 2,
        this.doc.internal.pageSize.height - 10,
        { align: 'center' }
      );

      if (this.options.author) {
        this.doc.text(this.options.author, 15, this.doc.internal.pageSize.height - 10);
      }
    }
  }

  /**
   * Utility: Convert hex color to RGB
   */
  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [79, 70, 229];
  }

  /**
   * Generate buffer
   */
  toBuffer(): Buffer {
    this.addFooter();
    return Buffer.from(this.doc.output('arraybuffer'));
  }

  /**
   * Generate base64
   */
  toBase64(): string {
    this.addFooter();
    return this.doc.output('dataurlstring').split(',')[1];
  }

  /**
   * Save to file (for testing)
   */
  save(filename: string) {
    this.addFooter();
    this.doc.save(filename);
  }
}

// ==========================================
// PRESET PDF REPORT GENERATORS
// ==========================================

/**
 * Generate Client Summary PDF
 */
export async function generateClientSummaryPDF(clientData: {
  client: any;
  guests: any[];
  budgetItems: any[];
  events: any[];
  timeline: any[];
}) {
  const pdf = new PDFGenerator({
    title: 'Wedding Summary Report',
    subtitle: `${clientData.client.partner1_first_name} ${clientData.client.partner1_last_name}`,
    author: 'WeddingFlow Pro',
  });

  // Client Overview Section
  pdf.addSectionHeader('Client Overview');
  pdf.addKeyValue('Couple', `${clientData.client.partner1_first_name} ${clientData.client.partner1_last_name}`);
  pdf.addKeyValue('Email', clientData.client.partner1_email);
  pdf.addKeyValue('Phone', clientData.client.partner1_phone || 'N/A');
  pdf.addKeyValue(
    'Wedding Date',
    clientData.client.wedding_date ? format(new Date(clientData.client.wedding_date), 'PPP') : 'TBD'
  );
  pdf.addKeyValue('Venue', clientData.client.venue || 'To be determined');

  // Summary Box
  pdf.addSummaryBox([
    { label: 'Total Guests', value: clientData.guests.length.toString() },
    {
      label: 'Confirmed',
      value: clientData.guests.filter((g) => g.rsvp_status === 'confirmed').length.toString(),
    },
    {
      label: 'Total Budget',
      value: `$${clientData.budgetItems.reduce((sum, item) => sum + (item.estimated_cost || 0), 0).toFixed(2)}`,
    },
    {
      label: 'Total Spent',
      value: `$${clientData.budgetItems.reduce((sum, item) => sum + (item.actual_cost || 0), 0).toFixed(2)}`,
    },
  ]);

  // Guest List Section
  pdf.addSectionHeader('Guest List Breakdown');
  const guestTableData = clientData.guests.slice(0, 20).map((guest) => [
    `${guest.first_name} ${guest.last_name}`,
    guest.email || '',
    guest.rsvp_status,
    (guest.plus_ones || 0).toString(),
    guest.dietary_restrictions?.join(', ') || 'None',
  ]);

  pdf.addTable(['Name', 'Email', 'RSVP', '+1s', 'Dietary'], guestTableData);

  if (clientData.guests.length > 20) {
    pdf.addParagraph(`Note: Showing 20 of ${clientData.guests.length} guests. Full list available in Excel export.`);
  }

  // Budget Section
  pdf.addSectionHeader('Budget Summary');
  const budgetTableData = clientData.budgetItems.map((item) => [
    item.category || 'Uncategorized',
    item.item_name || '',
    `$${(item.estimated_cost || 0).toFixed(2)}`,
    `$${(item.actual_cost || 0).toFixed(2)}`,
    item.paid_amount > 0 ? 'Paid' : 'Unpaid',
  ]);

  pdf.addTable(['Category', 'Item', 'Estimated', 'Actual', 'Status'], budgetTableData);

  return pdf;
}

/**
 * Generate Guest Analytics PDF
 */
export async function generateGuestAnalyticsPDF(analyticsData: any) {
  const pdf = new PDFGenerator({
    title: 'Guest Analytics Report',
    subtitle: `Total Guests: ${analyticsData.total}`,
    author: 'WeddingFlow Pro',
  });

  // RSVP Summary
  pdf.addSectionHeader('RSVP Summary');
  pdf.addSummaryBox([
    {
      label: 'Confirmed',
      value: `${analyticsData.confirmed} (${((analyticsData.confirmed / analyticsData.total) * 100).toFixed(1)}%)`,
    },
    {
      label: 'Declined',
      value: `${analyticsData.declined} (${((analyticsData.declined / analyticsData.total) * 100).toFixed(1)}%)`,
    },
    {
      label: 'Pending',
      value: `${analyticsData.pending} (${((analyticsData.pending / analyticsData.total) * 100).toFixed(1)}%)`,
    },
  ]);

  // Dietary Restrictions
  if (analyticsData.dietaryRestrictions && Object.keys(analyticsData.dietaryRestrictions).length > 0) {
    pdf.addSectionHeader('Dietary Restrictions');
    const dietaryData = Object.entries(analyticsData.dietaryRestrictions).map(([restriction, count]) => [
      restriction,
      String(count),
    ]);
    pdf.addTable(['Restriction', 'Count'], dietaryData as any);
  }

  // By Event
  if (analyticsData.byEvent) {
    pdf.addSectionHeader('Guests by Event');
    const eventData = Object.entries(analyticsData.byEvent).map(([event, data]: [string, any]) => [
      event,
      data.total.toString(),
      data.confirmed.toString(),
      data.declined.toString(),
      data.pending.toString(),
    ]);
    pdf.addTable(['Event', 'Total', 'Confirmed', 'Declined', 'Pending'], eventData);
  }

  return pdf;
}
