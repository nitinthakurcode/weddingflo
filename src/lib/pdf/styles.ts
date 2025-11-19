import { StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts (optional - using default fonts for simplicity)
// You can add custom fonts here if needed

export const pdfColors = {
  primary: '#3b82f6',
  secondary: '#6366f1',
  text: '#1f2937',
  textLight: '#6b7280',
  border: '#e5e7eb',
  background: '#f9fafb',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
};

export const pdfStyles = StyleSheet.create({
  // Page styles
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },

  // Header styles
  header: {
    marginBottom: 30,
    borderBottom: `2px solid ${pdfColors.primary}`,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: pdfColors.primary,
    marginBottom: 5,
  },
  companyDetails: {
    fontSize: 10,
    color: pdfColors.textLight,
    lineHeight: 1.5,
  },
  invoiceTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: pdfColors.text,
    textAlign: 'right',
  },

  // Invoice info section
  invoiceInfoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  infoBlock: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 9,
    color: pdfColors.textLight,
    marginBottom: 3,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  infoValue: {
    fontSize: 11,
    color: pdfColors.text,
    marginBottom: 8,
  },

  // Client info
  clientSection: {
    backgroundColor: pdfColors.background,
    padding: 15,
    borderRadius: 5,
    marginBottom: 30,
  },
  clientLabel: {
    fontSize: 9,
    color: pdfColors.textLight,
    marginBottom: 5,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  clientName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: pdfColors.text,
    marginBottom: 5,
  },
  clientDetails: {
    fontSize: 10,
    color: pdfColors.text,
    lineHeight: 1.5,
  },

  // Table styles
  table: {
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: pdfColors.primary,
    color: '#ffffff',
    padding: 10,
    fontWeight: 'bold',
    fontSize: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: `1px solid ${pdfColors.border}`,
    padding: 10,
    fontSize: 10,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottom: `1px solid ${pdfColors.border}`,
    backgroundColor: pdfColors.background,
    padding: 10,
    fontSize: 10,
  },
  tableCol1: {
    width: '50%',
  },
  tableCol2: {
    width: '15%',
    textAlign: 'center',
  },
  tableCol3: {
    width: '17.5%',
    textAlign: 'right',
  },
  tableCol4: {
    width: '17.5%',
    textAlign: 'right',
    fontWeight: 'bold',
  },

  // Summary styles
  summarySection: {
    marginTop: 20,
    marginLeft: 'auto',
    width: '40%',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    fontSize: 11,
  },
  summaryLabel: {
    color: pdfColors.textLight,
  },
  summaryValue: {
    fontWeight: 'bold',
    color: pdfColors.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: `2px solid ${pdfColors.primary}`,
    paddingTop: 10,
    marginTop: 10,
    fontSize: 14,
  },
  totalLabel: {
    fontWeight: 'bold',
    color: pdfColors.text,
  },
  totalValue: {
    fontWeight: 'bold',
    color: pdfColors.primary,
    fontSize: 16,
  },

  // Footer styles
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: `1px solid ${pdfColors.border}`,
    paddingTop: 15,
    fontSize: 9,
    color: pdfColors.textLight,
    textAlign: 'center',
  },

  // Notes section
  notesSection: {
    marginTop: 30,
    padding: 15,
    backgroundColor: pdfColors.background,
    borderRadius: 5,
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: pdfColors.text,
    marginBottom: 5,
  },
  notesText: {
    fontSize: 9,
    color: pdfColors.textLight,
    lineHeight: 1.6,
  },

  // Status badge
  statusBadge: {
    padding: '5 10',
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  statusPaid: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  statusOverdue: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
});
