'use client';

import { useState } from 'react';
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
  data: any[];
  dataType: 'guests' | 'budget' | 'vendors' | 'timeline';
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  onExportStart?: () => void;
  onExportComplete?: (format: ExportFormat) => void;
  onExportError?: (error: Error) => void;
}

/**
 * Export Button Component
 * Dropdown button with multiple export format options
 */
export function ExportButton({
  data,
  dataType,
  variant = 'outline',
  size = 'default',
  className = '',
  onExportStart,
  onExportComplete,
  onExportError,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [currentFormat, setCurrentFormat] = useState<ExportFormat | null>(null);

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
    switch (format) {
      case 'pdf':
        exportGuestListPDF(guests);
        break;
      case 'excel':
        exportGuestListExcel(guests);
        break;
      case 'csv':
        exportGuestListCSV(guests);
        break;
    }
  };

  const exportBudget = async (format: ExportFormat, budgetItems: any[]) => {
    // Import budget exporters dynamically
    const { exportBudgetReportPDF } = await import('@/lib/export/pdf-generator');
    const { exportBudgetExcel } = await import('@/lib/export/excel-exporter');
    const { exportBudgetCSV } = await import('@/lib/export/csv-exporter');

    const summary = {
      total_budget: budgetItems.reduce((sum, item) => sum + item.budget, 0),
      total_actual: budgetItems.reduce((sum, item) => sum + item.actual_cost, 0),
      total_variance: budgetItems.reduce((sum, item) => sum + item.variance, 0),
    };

    switch (format) {
      case 'pdf':
        exportBudgetReportPDF(budgetItems, summary);
        break;
      case 'excel':
        exportBudgetExcel(budgetItems);
        break;
      case 'csv':
        exportBudgetCSV(budgetItems);
        break;
    }
  };

  const exportVendors = async (format: ExportFormat, vendors: any[]) => {
    const { exportVendorListPDF } = await import('@/lib/export/pdf-generator');
    const { exportVendorListExcel } = await import('@/lib/export/excel-exporter');
    const { exportVendorListCSV } = await import('@/lib/export/csv-exporter');

    switch (format) {
      case 'pdf':
        exportVendorListPDF(vendors);
        break;
      case 'excel':
        exportVendorListExcel(vendors);
        break;
      case 'csv':
        exportVendorListCSV(vendors);
        break;
    }
  };

  const exportTimeline = async (format: ExportFormat, events: any[]) => {
    const { exportTimelinePDF } = await import('@/lib/export/pdf-generator');
    const { exportTimelineCSV } = await import('@/lib/export/csv-exporter');

    switch (format) {
      case 'pdf':
        exportTimelinePDF(events);
        break;
      case 'csv':
        exportTimelineCSV(events);
        break;
      case 'excel':
        // Timeline doesn't have a dedicated Excel export yet
        exportTimelineCSV(events);
        break;
    }
  };

  if (data.length === 0) {
    return (
      <Button variant={variant} size={size} disabled className={className}>
        <Download className="h-4 w-4 mr-2" />
        No Data to Export
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isExporting} className={className}>
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport('pdf')} disabled={isExporting}>
          <FileText className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('excel')} disabled={isExporting}>
          <Table className="h-4 w-4 mr-2" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('csv')} disabled={isExporting}>
          <File className="h-4 w-4 mr-2" />
          Export as CSV
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
    <Button onClick={handleExport} variant={variant} size={size} disabled={isExporting || data.length === 0} className={className}>
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
