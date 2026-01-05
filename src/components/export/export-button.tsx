'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Table, File, Loader2 } from 'lucide-react';
import { exportGuestListPDF } from '@/lib/export/pdf-generator';
import { exportGuestListExcel } from '@/lib/export/excel-exporter';
import { exportGuestListCSV } from '@/lib/export/csv-exporter';

export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface ExportButtonProps {
  data?: any[];
  dataType: 'guests' | 'budget' | 'vendors' | 'timeline' | 'hotels' | 'guestGifts' | 'creatives' | 'internalBudget' | 'eventFlow' | 'gifts' | 'documents' | 'transport';
  clientId?: string;
  clientName?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  onExportStart?: () => void;
  onExportComplete?: (format: ExportFormat) => void;
  onExportError?: (error: Error) => void;
}

/**
 * Generate a clean filename from client name and data type
 * Format: "{dataType} {clientName}.{extension}" e.g., "guestlist monica singh.xlsx"
 */
function generateFilename(clientName: string | undefined, dataType: string, extension: string): string {
  const date = new Date().toISOString().split('T')[0];
  const cleanClientName = clientName
    ? clientName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, ' ').toLowerCase().trim()
    : '';

  // Format: "dataType clientName" or just "dataType-date" if no client name
  if (cleanClientName) {
    return `${dataType} ${cleanClientName}.${extension}`;
  }
  return `${dataType}-${date}.${extension}`;
}

/**
 * Export Button Component
 * Dropdown button with multiple export format options
 */
export function ExportButton({
  data = [],
  dataType,
  clientId,
  clientName,
  variant = 'outline',
  size = 'default',
  className = '',
  onExportStart,
  onExportComplete,
  onExportError,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [currentFormat, setCurrentFormat] = useState<ExportFormat | null>(null);
  const t = useTranslations('common');

  const isTemplate = data.length === 0;

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setCurrentFormat(format);

    if (onExportStart) {
      onExportStart();
    }

    try {
      switch (dataType) {
        case 'guests':
          await exportGuests(format, data);
          break;
        case 'budget':
          await exportBudget(format, data);
          break;
        case 'vendors':
          await exportVendors(format, data);
          break;
        case 'timeline':
          await exportTimeline(format, data);
          break;
        case 'hotels':
          await exportHotels(format, data);
          break;
        case 'guestGifts':
          await exportGuestGifts(format, data);
          break;
        case 'creatives':
          await exportCreatives(format, data);
          break;
        case 'internalBudget':
          await exportInternalBudget(format, data);
          break;
        case 'eventFlow':
          await exportEventFlow(format, data);
          break;
        case 'gifts':
          await exportGiftsRegistry(format, data);
          break;
        case 'documents':
          await exportDocuments(format, data);
          break;
        case 'transport':
          await exportTransport(format, data);
          break;
      }

      if (onExportComplete) {
        onExportComplete(format);
      }
    } catch (error) {
      console.error('Export failed:', error);
      if (onExportError) {
        onExportError(error as Error);
      }
    } finally {
      setIsExporting(false);
      setCurrentFormat(null);
    }
  };

  const exportGuests = async (format: ExportFormat, guests: any[]) => {
    const filename = generateFilename(clientName, 'guestlist', format === 'excel' ? 'xlsx' : format);
    switch (format) {
      case 'pdf':
        exportGuestListPDF(guests, { filename });
        break;
      case 'excel':
        exportGuestListExcel(guests, { filename });
        break;
      case 'csv':
        exportGuestListCSV(guests, { filename });
        break;
    }
  };

  const exportBudget = async (format: ExportFormat, budgetItems: any[]) => {
    const filename = generateFilename(clientName, 'budget', format === 'excel' ? 'xlsx' : format);
    // Import budget exporters dynamically
    const { exportBudgetReportPDF } = await import('@/lib/export/pdf-generator');
    const { exportBudgetExcel } = await import('@/lib/export/excel-exporter');
    const { exportBudgetCSV } = await import('@/lib/export/csv-exporter');

    const summary = {
      total_budget: budgetItems.reduce((sum, item) => sum + (item.budget || 0), 0),
      total_actual: budgetItems.reduce((sum, item) => sum + (item.actual_cost || 0), 0),
      total_variance: budgetItems.reduce((sum, item) => sum + (item.variance || 0), 0),
    };

    switch (format) {
      case 'pdf':
        exportBudgetReportPDF(budgetItems, summary, { filename });
        break;
      case 'excel':
        exportBudgetExcel(budgetItems, { filename });
        break;
      case 'csv':
        exportBudgetCSV(budgetItems, { filename });
        break;
    }
  };

  const exportVendors = async (format: ExportFormat, vendors: any[]) => {
    const filename = generateFilename(clientName, 'vendors', format === 'excel' ? 'xlsx' : format);
    const { exportVendorListPDF } = await import('@/lib/export/pdf-generator');
    const { exportVendorListExcel } = await import('@/lib/export/excel-exporter');
    const { exportVendorListCSV } = await import('@/lib/export/csv-exporter');

    switch (format) {
      case 'pdf':
        exportVendorListPDF(vendors, { filename });
        break;
      case 'excel':
        exportVendorListExcel(vendors, { filename });
        break;
      case 'csv':
        exportVendorListCSV(vendors, { filename });
        break;
    }
  };

  const exportTimeline = async (format: ExportFormat, events: any[]) => {
    const filename = generateFilename(clientName, 'timeline', format === 'excel' ? 'xlsx' : format);
    const { exportTimelinePDF } = await import('@/lib/export/pdf-generator');
    const { exportTimelineCSV } = await import('@/lib/export/csv-exporter');

    switch (format) {
      case 'pdf':
        exportTimelinePDF(events, { filename });
        break;
      case 'csv':
        exportTimelineCSV(events, { filename });
        break;
      case 'excel':
        // Timeline uses CSV format for Excel
        exportTimelineCSV(events, { filename: filename.replace('.xlsx', '.csv') });
        break;
    }
  };

  const exportHotels = async (format: ExportFormat, hotels: any[]) => {
    const filename = generateFilename(clientName, 'hotels', format === 'excel' ? 'xlsx' : format);
    const { exportHotelListExcel } = await import('@/lib/export/excel-exporter');
    const { exportHotelListCSV } = await import('@/lib/export/csv-exporter');

    switch (format) {
      case 'pdf':
        // Hotels uses Excel format for PDF (no dedicated PDF exporter)
        exportHotelListExcel(hotels, { filename: filename.replace('.pdf', '.xlsx') });
        break;
      case 'excel':
        exportHotelListExcel(hotels, { filename });
        break;
      case 'csv':
        exportHotelListCSV(hotels, { filename });
        break;
    }
  };

  const exportGuestGifts = async (format: ExportFormat, guestGifts: any[]) => {
    const filename = generateFilename(clientName, 'guest-gifts', format === 'excel' ? 'xlsx' : format);
    const { exportGuestGiftListExcel } = await import('@/lib/export/excel-exporter');
    const { exportGuestGiftListCSV } = await import('@/lib/export/csv-exporter');

    switch (format) {
      case 'pdf':
        // Guest gifts uses Excel format for PDF (no dedicated PDF exporter)
        exportGuestGiftListExcel(guestGifts, { filename: filename.replace('.pdf', '.xlsx') });
        break;
      case 'excel':
        exportGuestGiftListExcel(guestGifts, { filename });
        break;
      case 'csv':
        exportGuestGiftListCSV(guestGifts, { filename });
        break;
    }
  };

  const exportCreatives = async (format: ExportFormat, creatives: any[]) => {
    const filename = generateFilename(clientName, 'creatives', format === 'excel' ? 'xlsx' : format);
    const { exportCreativesListExcel } = await import('@/lib/export/excel-exporter');
    const { exportCreativesListCSV } = await import('@/lib/export/csv-exporter');

    switch (format) {
      case 'pdf':
        // Creatives uses Excel format for PDF (no dedicated PDF exporter)
        exportCreativesListExcel(creatives, { filename: filename.replace('.pdf', '.xlsx') });
        break;
      case 'excel':
        exportCreativesListExcel(creatives, { filename });
        break;
      case 'csv':
        exportCreativesListCSV(creatives, { filename });
        break;
    }
  };

  const exportInternalBudget = async (format: ExportFormat, budgetItems: any[]) => {
    const filename = generateFilename(clientName, 'internal-budget', format === 'excel' ? 'xlsx' : format);
    const { exportInternalBudgetExcel } = await import('@/lib/export/excel-exporter');
    const { exportInternalBudgetCSV } = await import('@/lib/export/csv-exporter');

    switch (format) {
      case 'pdf':
        // Internal budget uses Excel format for PDF (no dedicated PDF exporter)
        exportInternalBudgetExcel(budgetItems, { filename: filename.replace('.pdf', '.xlsx') });
        break;
      case 'excel':
        exportInternalBudgetExcel(budgetItems, { filename });
        break;
      case 'csv':
        exportInternalBudgetCSV(budgetItems, { filename });
        break;
    }
  };

  const exportEventFlow = async (format: ExportFormat, flowItems: any[]) => {
    const filename = generateFilename(clientName, 'event-flow', format === 'excel' ? 'xlsx' : format);
    const { exportEventFlowExcel } = await import('@/lib/export/excel-exporter');
    const { exportEventFlowCSV } = await import('@/lib/export/csv-exporter');

    switch (format) {
      case 'pdf':
        // Event flow uses Excel format for PDF (no dedicated PDF exporter)
        exportEventFlowExcel(flowItems, { filename: filename.replace('.pdf', '.xlsx') });
        break;
      case 'excel':
        exportEventFlowExcel(flowItems, { filename });
        break;
      case 'csv':
        exportEventFlowCSV(flowItems, { filename });
        break;
    }
  };

  const exportGiftsRegistry = async (format: ExportFormat, gifts: any[]) => {
    const filename = generateFilename(clientName, 'gift-registry', format === 'excel' ? 'xlsx' : format);
    const { exportGiftsRegistryExcel } = await import('@/lib/export/excel-exporter');
    const { exportGiftsRegistryCSV } = await import('@/lib/export/csv-exporter');

    switch (format) {
      case 'pdf':
        // Gifts registry uses Excel format for PDF (no dedicated PDF exporter)
        exportGiftsRegistryExcel(gifts, { filename: filename.replace('.pdf', '.xlsx') });
        break;
      case 'excel':
        exportGiftsRegistryExcel(gifts, { filename });
        break;
      case 'csv':
        exportGiftsRegistryCSV(gifts, { filename });
        break;
    }
  };

  const exportDocuments = async (format: ExportFormat, documents: any[]) => {
    const filename = generateFilename(clientName, 'documents', format === 'excel' ? 'xlsx' : format);
    const { exportDocumentsExcel } = await import('@/lib/export/excel-exporter');
    const { exportDocumentsCSV } = await import('@/lib/export/csv-exporter');

    switch (format) {
      case 'pdf':
        // Documents uses Excel format for PDF (no dedicated PDF exporter)
        exportDocumentsExcel(documents, { filename: filename.replace('.pdf', '.xlsx') });
        break;
      case 'excel':
        exportDocumentsExcel(documents, { filename });
        break;
      case 'csv':
        exportDocumentsCSV(documents, { filename });
        break;
    }
  };

  const exportTransport = async (format: ExportFormat, transports: any[]) => {
    const filename = generateFilename(clientName, 'guest-transport', format === 'excel' ? 'xlsx' : format);
    const { exportGuestTransportExcel } = await import('@/lib/export/excel-exporter');
    const { exportGuestTransportCSV } = await import('@/lib/export/csv-exporter');

    switch (format) {
      case 'pdf':
        // Transport uses Excel format for PDF (no dedicated PDF exporter)
        exportGuestTransportExcel(transports, { filename: filename.replace('.pdf', '.xlsx') });
        break;
      case 'excel':
        exportGuestTransportExcel(transports, { filename });
        break;
      case 'csv':
        exportGuestTransportCSV(transports, { filename });
        break;
    }
  };

  // No longer disable when no data - allow template export instead

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isExporting} className={className}>
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('exporting')}
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              {isTemplate ? t('exportTemplate') : t('export')}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{isTemplate ? t('exportTemplate') : t('exportFormat')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!isTemplate && (
          <DropdownMenuItem onClick={() => handleExport('pdf')} disabled={isExporting}>
            <FileText className="h-4 w-4 mr-2" />
            {t('exportAsPDF')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => handleExport('excel')} disabled={isExporting}>
          <Table className="h-4 w-4 mr-2" />
          {isTemplate ? t('excelTemplate') : t('exportAsExcel')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('csv')} disabled={isExporting}>
          <File className="h-4 w-4 mr-2" />
          {isTemplate ? t('csvTemplate') : t('exportAsCSV')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Simple Export Button (single format)
 */
export function SimpleExportButton({
  data,
  dataType,
  format = 'pdf',
  label,
  variant = 'outline',
  size = 'default',
  className = '',
}: Omit<ExportButtonProps, 'onExportStart' | 'onExportComplete' | 'onExportError'> & {
  format?: ExportFormat;
  label?: string;
}) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Reuse the export logic from ExportButton
      const exportButton = {
        data,
        dataType,
        variant,
        size,
        className,
      };

      // Call the appropriate export function based on format
      // This is a simplified version - in reality you'd call the actual export functions
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const Icon = format === 'pdf' ? FileText : format === 'excel' ? Table : File;

  return (
    <Button onClick={handleExport} variant={variant} size={size} disabled={isExporting || !data || data.length === 0} className={className}>
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <Icon className="h-4 w-4 mr-2" />
          {label || `Export ${format.toUpperCase()}`}
        </>
      )}
    </Button>
  );
}
