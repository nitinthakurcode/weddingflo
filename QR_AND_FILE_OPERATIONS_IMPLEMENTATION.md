# QR Code System and File Operations Implementation

## Overview
This document provides a comprehensive guide to the QR code system and file operations that have been implemented in the WeddingFlow Pro application.

---

## 1. QR Code System

### Components Implemented

#### QR Generation (`src/lib/qr/`)
- **qr-encryptor.ts**: Token encryption/decryption with expiry
  - `encryptQRToken()`: Encrypt guest data into QR token
  - `decryptQRToken()`: Decrypt and validate QR token
  - `generateGuestQRToken()`: Generate token for a specific guest
  - `isTokenValid()`: Check token validity

- **qr-generator.ts**: QR code URL and data generation
  - `generateGuestQRCode()`: Generate QR for individual guest
  - `generateBulkGuestQRCodes()`: Generate QR codes for multiple guests
  - `generateCheckInQRCode()`: Specific check-in QR
  - `generateRSVPQRCode()`: RSVP-specific QR
  - `parseQRCodeURL()`: Extract token from QR URL

#### QR Display Components (`src/components/qr/`)
- **qr-code-display.tsx**: Single QR code display with download
  - `QRCodeDisplay`: Main display component
  - `RegenerableQRCode`: QR with regeneration option

- **qr-code-grid.tsx**: Multiple QR codes in grid layout
  - `QRCodeGrid`: Display multiple QR codes
  - Bulk download as ZIP functionality

- **qr-download-button.tsx**: Download QR in various formats
  - Support for PNG, JPG, SVG formats
  - `QRDownloadButton`: Multi-format download
  - `SimpleQRDownloadButton`: Single format download

#### QR Scanning (`src/lib/qr/` & `src/components/qr/`)
- **qr-scanner.ts**: Scanner logic using html5-qrcode
  - `QRScanner` class: Complete scanner management
  - `parseQRScanResult()`: Parse scanned QR data
  - `scanQRCodeOnce()`: Single scan utility

- **qr-scanner-component.tsx**: Camera interface
  - `QRScannerComponent`: Full scanner UI
  - `CompactQRScanner`: Inline scanner
  - Camera permission handling
  - File upload scanning

#### Convex Functions (`convex/qr.ts`)
- `generateGuestQRToken`: Generate QR token for guest
- `validateQRToken`: Validate token and get guest info
- `recordQRScan`: Track QR scan events
- `checkInGuestViaQR`: Check in guest using QR
- `getQRScanStats`: Get scan statistics
- `getRecentQRScans`: Recent scan activity
- `regenerateGuestQRToken`: Regenerate expired tokens
- `bulkGenerateQRTokens`: Generate tokens for all guests

#### Pages
- **app/check-in/page.tsx**: Dedicated check-in station
  - Scan QR codes
  - Check in guests
  - Location tracking
  - Success/error states

- **app/qr/[token]/page.tsx**: QR landing page
  - Guest form for RSVP
  - Check-in instructions
  - Gift registry access
  - Token validation

### Usage Examples

#### Generate QR Code
```typescript
import { generateGuestQRCode } from '@/lib/qr/qr-generator';
import { QRCodeDisplay } from '@/components/qr/qr-code-display';

// Generate QR data
const qrData = generateGuestQRCode(guestId, weddingId);

// Display QR
<QRCodeDisplay
  value={qrData.url}
  title="Guest Check-In QR"
  description="Scan this code at the event"
  showDownload={true}
/>
```

#### Scan QR Code
```typescript
import { QRScannerComponent } from '@/components/qr/qr-scanner-component';

<QRScannerComponent
  onScanSuccess={(token) => handleCheckIn(token)}
  autoStart={true}
/>
```

#### Bulk QR Generation
```typescript
import { QRCodeGrid } from '@/components/qr/qr-code-grid';
import { generateBulkGuestQRCodes } from '@/lib/qr/qr-generator';

const qrCodes = generateBulkGuestQRCodes(guests, weddingId);

<QRCodeGrid
  items={qrCodes.map(qr => ({
    id: qr.guestId,
    value: qr.url,
    label: qr.guestName,
  }))}
  showDownloadAll={true}
/>
```

---

## 2. File Export System

### Export Utilities (`src/lib/export/`)

#### PDF Generation (`pdf-generator.ts`)
- **jsPDF + jspdf-autotable** for PDF creation
- Functions:
  - `generatePDFWithTable()`: Generic table PDF
  - `exportGuestListPDF()`: Guest list report
  - `exportBudgetReportPDF()`: Budget report with summary
  - `exportVendorListPDF()`: Vendor list
  - `exportTimelinePDF()`: Event timeline
  - `generateCustomPDFReport()`: Custom multi-section reports

#### Excel Generation (`excel-exporter.ts`)
- **XLSX (SheetJS)** for Excel files
- Functions:
  - `generateExcel()`: Single sheet workbook
  - `generateMultiSheetExcel()`: Multiple sheets
  - `exportGuestListExcel()`: Guest data to Excel
  - `exportBudgetExcel()`: Budget with formulas
  - `exportVendorListExcel()`: Vendor details
  - `exportComprehensiveWeddingData()`: Multi-sheet export

#### CSV Generation (`csv-exporter.ts`)
- Pure JavaScript CSV generation
- Functions:
  - `dataToCSV()`: Convert data to CSV string
  - `downloadCSV()`: Trigger CSV download
  - `exportGuestListCSV()`: Guest list CSV
  - `exportBudgetCSV()`: Budget CSV
  - `exportVendorListCSV()`: Vendor CSV
  - `exportTimelineCSV()`: Timeline CSV
  - `parseCSV()`: Parse CSV back to data

### Export Components (`src/components/export/`)

#### export-dialog.tsx
- `ExportDialog`: Full export dialog with format selection
- `QuickExportButton`: Single-click export button
- Format options: PDF, Excel, CSV
- Export options (headers, etc.)

#### export-button.tsx
- `ExportButton`: Dropdown with multiple formats
- `SimpleExportButton`: Single format export
- Automatic format detection based on data type
- Progress indicators

### Usage Examples

#### Export Guest List
```typescript
import { ExportButton } from '@/components/export/export-button';

<ExportButton
  data={guests}
  dataType="guests"
  variant="outline"
/>
```

#### Export with Dialog
```typescript
import { ExportDialog } from '@/components/export/export-dialog';

<ExportDialog
  title="Export Guest List"
  onExport={async (format, options) => {
    if (format === 'pdf') {
      exportGuestListPDF(guests, options);
    }
    // ... handle other formats
  }}
/>
```

#### Programmatic Export
```typescript
import { exportBudgetReportPDF } from '@/lib/export/pdf-generator';

// Export directly
exportBudgetReportPDF(budgetItems, summary, {
  filename: 'budget-2024.pdf',
  orientation: 'landscape'
});
```

---

## 3. File Import System

### Import Utilities (`src/lib/import/`)

#### CSV Parser (`csv-parser.ts`)
- Parse CSV with validation
- Functions:
  - `parseCSV()`: Parse CSV content
  - `importCSVWithMapping()`: Import with field mapping
  - `importGuestListCSV()`: Guest list import
  - `readFileAsText()`: File reader utility

#### Excel Parser (`excel-parser.ts`)
- Parse Excel files with XLSX
- Functions:
  - `parseExcelFile()`: Parse Excel workbook
  - `importExcelWithMapping()`: Import with validation
  - `importGuestListExcel()`: Guest list from Excel
  - `getExcelSheetNames()`: List available sheets

### Import Components (`src/components/import/`)

#### import-dialog.tsx
- `ImportDialog`: File upload and preview
- File validation
- Error display
- Preview before import

### Usage Examples

#### Import Guests
```typescript
import { ImportDialog } from '@/components/import/import-dialog';

<ImportDialog
  title="Import Guests"
  onImportComplete={async (guests) => {
    // Save guests to database
    for (const guest of guests) {
      await createGuest(guest);
    }
  }}
/>
```

#### Parse CSV Manually
```typescript
import { importGuestListCSV } from '@/lib/import/csv-parser';

const result = importGuestListCSV(csvContent);

console.log(`Valid: ${result.validRows}, Errors: ${result.errors.length}`);
console.log('Data:', result.data);
console.log('Errors:', result.errors);
```

---

## 4. Receipt OCR System

### OCR Utilities (`src/lib/ocr/`)

#### receipt-scanner.ts
- **Tesseract.js** for OCR
- Functions:
  - `scanReceiptImage()`: Scan receipt and extract text
  - `parseReceiptText()`: Extract structured data
  - `validateReceiptData()`: Validate extracted data
  - `scanReceiptBatch()`: Scan multiple receipts
  - `createImagePreview()`: Image preview utility

### Extracted Data
- Total amount
- Date
- Vendor name
- Line items (description + amount)
- Raw text

### Usage Example
```typescript
import { scanReceiptImage } from '@/lib/ocr/receipt-scanner';

const result = await scanReceiptImage(imageFile, (progress) => {
  console.log(`Scanning: ${progress}%`);
});

if (result.success && result.data) {
  console.log('Total:', result.data.total);
  console.log('Date:', result.data.date);
  console.log('Vendor:', result.data.vendorName);
}
```

---

## 5. Integration Guide

### Add Export to Guest List Page
```typescript
import { ExportButton } from '@/components/export/export-button';

function GuestListPage() {
  const guests = useQuery(api.guests.list, { clientId });

  return (
    <div>
      <div className="flex justify-between">
        <h1>Guest List</h1>
        <ExportButton data={guests} dataType="guests" />
      </div>
      {/* Guest list table */}
    </div>
  );
}
```

### Add QR Section to Guest Details
```typescript
import { QRCodeDisplay } from '@/components/qr/qr-code-display';
import { generateGuestQRCode } from '@/lib/qr/qr-generator';

function GuestDetailsPage({ guestId, weddingId }) {
  const qrData = generateGuestQRCode(guestId, weddingId);

  return (
    <div>
      {/* Guest details */}

      <section>
        <h2>Check-In QR Code</h2>
        <QRCodeDisplay
          value={qrData.url}
          title={`QR Code for ${guest.name}`}
          showDownload={true}
        />
      </section>
    </div>
  );
}
```

### Check-In Flow
1. Guest goes to `/check-in` page
2. Staff scans guest QR code with camera
3. System validates token and checks in guest
4. Success message with guest details displayed
5. Ready for next guest

### Guest RSVP Flow
1. Guest receives QR code via email/text
2. Guest scans QR or clicks link
3. Opens `/qr/[token]` page
4. Guest fills in RSVP form
5. System records guest preferences
6. Thank you message displayed

---

## 6. File Structure

```
src/
├── lib/
│   ├── qr/
│   │   ├── qr-encryptor.ts
│   │   ├── qr-generator.ts
│   │   └── qr-scanner.ts
│   ├── export/
│   │   ├── pdf-generator.ts
│   │   ├── excel-exporter.ts
│   │   └── csv-exporter.ts
│   ├── import/
│   │   ├── csv-parser.ts
│   │   └── excel-parser.ts
│   └── ocr/
│       └── receipt-scanner.ts
├── components/
│   ├── qr/
│   │   ├── qr-code-display.tsx
│   │   ├── qr-code-grid.tsx
│   │   ├── qr-download-button.tsx
│   │   └── qr-scanner-component.tsx
│   ├── export/
│   │   ├── export-dialog.tsx
│   │   └── export-button.tsx
│   └── import/
│       └── import-dialog.tsx
└── app/
    ├── check-in/
    │   └── page.tsx
    └── qr/
        └── [token]/
            └── page.tsx

convex/
└── qr.ts
```

---

## 7. Dependencies

All required packages are installed:

```json
{
  "qrcode.react": "^4.2.0",
  "html5-qrcode": "^2.3.8",
  "jspdf": "^2.5.0",
  "jspdf-autotable": "^3.8.0",
  "xlsx": "^0.18.5",
  "tesseract.js": "^5.0.0",
  "jszip": "^3.10.1",
  "file-saver": "^2.0.5"
}
```

---

## 8. Testing Checklist

### QR Code System
- [ ] Generate QR code for a guest
- [ ] Download QR code as PNG
- [ ] Generate bulk QR codes for multiple guests
- [ ] Download all QR codes as ZIP
- [ ] Scan QR code with camera
- [ ] Upload QR code image to scan
- [ ] Check in guest via QR scan
- [ ] View QR scan statistics
- [ ] Test QR landing page (RSVP form)
- [ ] Test token expiry

### File Export
- [ ] Export guest list to PDF
- [ ] Export guest list to Excel
- [ ] Export guest list to CSV
- [ ] Export budget report to PDF
- [ ] Export budget to Excel
- [ ] Export vendor list (all formats)
- [ ] Export timeline to PDF
- [ ] Test multi-sheet Excel export
- [ ] Verify data formatting in exports

### File Import
- [ ] Import guests from CSV
- [ ] Import guests from Excel
- [ ] Test validation errors display
- [ ] Test file preview before import
- [ ] Test import with missing required fields
- [ ] Test import with invalid email format

### Receipt OCR
- [ ] Scan receipt image
- [ ] Extract total amount
- [ ] Extract date
- [ ] Extract vendor name
- [ ] Test with various receipt formats
- [ ] Test batch scanning

---

## 9. Known Limitations

1. **QR Token Security**: Current implementation uses a simple signature. For production, consider using proper encryption libraries like `crypto-js` or server-side JWT tokens.

2. **Receipt OCR Accuracy**: OCR accuracy depends on image quality. Works best with:
   - Clear, high-resolution images
   - Good lighting
   - Minimal background noise
   - Standard receipt formats

3. **Browser Compatibility**:
   - QR scanning requires camera access (not available in all browsers)
   - File operations work best in modern browsers (Chrome, Firefox, Safari, Edge)

4. **Performance**:
   - Bulk QR generation/download may take time for large guest lists
   - Excel files with many rows may be slow to generate
   - OCR processing is CPU-intensive

---

## 10. Future Enhancements

1. **QR System**:
   - SMS/Email QR code delivery
   - Dynamic QR codes that update in real-time
   - QR code analytics dashboard
   - Multi-event QR codes

2. **Export**:
   - Email reports directly
   - Scheduled exports
   - Custom report templates
   - Charts and graphs in PDF reports

3. **Import**:
   - Template download for imports
   - Data mapping UI for custom CSV formats
   - Import history and rollback

4. **OCR**:
   - Train custom models for specific receipt formats
   - Automatic categorization
   - Receipt image enhancement
   - Multi-language support

---

## 11. Support

For issues or questions:
- Check component documentation in source files
- Review usage examples in this document
- Test with the implementation checklist
- Consult the comprehensive guide in `docs/`

---

**Implementation Date**: October 2025
**Status**: Complete and Ready for Integration
**Next Steps**: Integrate components into existing pages and test thoroughly
