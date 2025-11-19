import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePDF } from './templates/invoice-pdf';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  companyName: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  notes?: string;
  paymentTerms?: string;
}

/**
 * Generate invoice PDF buffer
 * @param data Invoice data
 * @returns PDF buffer
 */
export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  try {
    const document = <InvoicePDF data={data} />;
    const buffer = await renderToBuffer(document);
    return buffer;
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    throw new Error('Failed to generate invoice PDF');
  }
}

/**
 * Generate invoice filename
 * @param invoiceNumber Invoice number
 * @returns Filename string
 */
export function generateInvoiceFilename(invoiceNumber: string): string {
  return `invoice-${invoiceNumber}-${Date.now()}.pdf`;
}

/**
 * Calculate invoice totals
 * @param items Invoice items
 * @param taxRate Tax rate (e.g., 0.1 for 10%)
 * @param discountAmount Discount amount
 * @returns Calculated totals
 */
export function calculateInvoiceTotals(
  items: InvoiceItem[],
  taxRate: number = 0,
  discountAmount: number = 0
) {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const discount = discountAmount;
  const subtotalAfterDiscount = subtotal - discount;
  const tax = subtotalAfterDiscount * taxRate;
  const total = subtotalAfterDiscount + tax;

  return {
    subtotal,
    discount,
    tax,
    total,
  };
}
