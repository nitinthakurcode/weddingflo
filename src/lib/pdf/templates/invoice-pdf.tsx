import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { pdfStyles } from '../styles';
import { format } from 'date-fns';

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoiceData {
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

export const InvoicePDF: React.FC<{ data: InvoiceData }> = ({ data }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.currency || 'USD',
    }).format(amount);
  };

  const getStatusStyle = () => {
    switch (data.status) {
      case 'paid':
        return pdfStyles.statusPaid;
      case 'overdue':
        return pdfStyles.statusOverdue;
      default:
        return pdfStyles.statusPending;
    }
  };

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header}>
          <View style={pdfStyles.headerRow}>
            <View style={pdfStyles.companyInfo}>
              <Text style={pdfStyles.companyName}>{data.companyName}</Text>
              <Text style={pdfStyles.companyDetails}>
                {data.companyAddress && `${data.companyAddress}\n`}
                {data.companyEmail && `Email: ${data.companyEmail}\n`}
                {data.companyPhone && `Phone: ${data.companyPhone}`}
              </Text>
            </View>
            <View>
              <Text style={pdfStyles.invoiceTitle}>INVOICE</Text>
            </View>
          </View>
        </View>

        {/* Invoice Info */}
        <View style={pdfStyles.invoiceInfoSection}>
          <View style={pdfStyles.infoBlock}>
            <Text style={pdfStyles.infoLabel}>Invoice Number</Text>
            <Text style={pdfStyles.infoValue}>#{data.invoiceNumber}</Text>

            <Text style={pdfStyles.infoLabel}>Invoice Date</Text>
            <Text style={pdfStyles.infoValue}>
              {format(new Date(data.invoiceDate), 'MMM dd, yyyy')}
            </Text>

            <Text style={pdfStyles.infoLabel}>Due Date</Text>
            <Text style={pdfStyles.infoValue}>
              {format(new Date(data.dueDate), 'MMM dd, yyyy')}
            </Text>
          </View>

          <View style={pdfStyles.infoBlock}>
            <Text style={pdfStyles.infoLabel}>Status</Text>
            <View style={[pdfStyles.statusBadge, getStatusStyle()]}>
              <Text>{data.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Client Info */}
        <View style={pdfStyles.clientSection}>
          <Text style={pdfStyles.clientLabel}>Bill To</Text>
          <Text style={pdfStyles.clientName}>{data.clientName}</Text>
          <Text style={pdfStyles.clientDetails}>
            {data.clientAddress && `${data.clientAddress}\n`}
            {data.clientEmail && `Email: ${data.clientEmail}\n`}
            {data.clientPhone && `Phone: ${data.clientPhone}`}
          </Text>
        </View>

        {/* Items Table */}
        <View style={pdfStyles.table}>
          {/* Table Header */}
          <View style={pdfStyles.tableHeader}>
            <Text style={pdfStyles.tableCol1}>Description</Text>
            <Text style={pdfStyles.tableCol2}>Qty</Text>
            <Text style={pdfStyles.tableCol3}>Unit Price</Text>
            <Text style={pdfStyles.tableCol4}>Total</Text>
          </View>

          {/* Table Rows */}
          {data.items.map((item, index) => (
            <View
              key={index}
              style={index % 2 === 0 ? pdfStyles.tableRow : pdfStyles.tableRowAlt}
            >
              <Text style={pdfStyles.tableCol1}>{item.description}</Text>
              <Text style={pdfStyles.tableCol2}>{item.quantity}</Text>
              <Text style={pdfStyles.tableCol3}>{formatCurrency(item.unit_price)}</Text>
              <Text style={pdfStyles.tableCol4}>{formatCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={pdfStyles.summarySection}>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Subtotal:</Text>
            <Text style={pdfStyles.summaryValue}>{formatCurrency(data.subtotal)}</Text>
          </View>

          {data.discount > 0 && (
            <View style={pdfStyles.summaryRow}>
              <Text style={pdfStyles.summaryLabel}>Discount:</Text>
              <Text style={pdfStyles.summaryValue}>-{formatCurrency(data.discount)}</Text>
            </View>
          )}

          {data.tax > 0 && (
            <View style={pdfStyles.summaryRow}>
              <Text style={pdfStyles.summaryLabel}>Tax:</Text>
              <Text style={pdfStyles.summaryValue}>{formatCurrency(data.tax)}</Text>
            </View>
          )}

          <View style={pdfStyles.totalRow}>
            <Text style={pdfStyles.totalLabel}>Total:</Text>
            <Text style={pdfStyles.totalValue}>{formatCurrency(data.total)}</Text>
          </View>
        </View>

        {/* Notes */}
        {(data.notes || data.paymentTerms) && (
          <View style={pdfStyles.notesSection}>
            {data.notes && (
              <>
                <Text style={pdfStyles.notesLabel}>Notes:</Text>
                <Text style={pdfStyles.notesText}>{data.notes}</Text>
              </>
            )}
            {data.paymentTerms && (
              <>
                <Text style={[pdfStyles.notesLabel, { marginTop: 10 }]}>
                  Payment Terms:
                </Text>
                <Text style={pdfStyles.notesText}>{data.paymentTerms}</Text>
              </>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={pdfStyles.footer}>
          <Text>Thank you for your business!</Text>
          <Text style={{ marginTop: 5 }}>
            Generated on {format(new Date(), 'MMM dd, yyyy')}
          </Text>
        </View>
      </Page>
    </Document>
  );
};
