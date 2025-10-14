'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, FileText, File, Table } from 'lucide-react';

export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface ExportDialogProps {
  title?: string;
  description?: string;
  availableFormats?: ExportFormat[];
  onExport: (format: ExportFormat, options?: Record<string, any>) => Promise<void>;
  children?: React.ReactNode;
  additionalOptions?: React.ReactNode;
}

/**
 * Export Dialog Component
 * Provides a dialog to select export format and options
 */
export function ExportDialog({
  title = 'Export Data',
  description = 'Choose a format to export your data',
  availableFormats = ['pdf', 'excel', 'csv'],
  onExport,
  children,
  additionalOptions,
}: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(availableFormats[0]);
  const [isExporting, setIsExporting] = useState(false);
  const [includeHeaders, setIncludeHeaders] = useState(true);

  const formatIcons = {
    pdf: FileText,
    excel: Table,
    csv: File,
  };

  const formatLabels = {
    pdf: 'PDF Document',
    excel: 'Excel Spreadsheet',
    csv: 'CSV File',
  };

  const formatDescriptions = {
    pdf: 'Formatted document, great for printing',
    excel: 'Spreadsheet with formulas and formatting',
    csv: 'Simple comma-separated values file',
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      await onExport(selectedFormat, {
        includeHeaders,
      });

      // Close dialog on success
      setOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as ExportFormat)}>
              {availableFormats.map((format) => {
                const Icon = formatIcons[format];
                return (
                  <div key={format} className="flex items-center space-x-3 border rounded-lg p-3 hover:bg-accent cursor-pointer">
                    <RadioGroupItem value={format} id={format} />
                    <Label htmlFor={format} className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{formatLabels[format]}</div>
                          <div className="text-xs text-muted-foreground">{formatDescriptions[format]}</div>
                        </div>
                      </div>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Options</Label>

            <div className="flex items-center space-x-2">
              <Checkbox id="headers" checked={includeHeaders} onCheckedChange={(checked) => setIncludeHeaders(checked as boolean)} />
              <Label htmlFor="headers" className="text-sm font-normal cursor-pointer">
                Include column headers
              </Label>
            </div>

            {additionalOptions}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleExport} disabled={isExporting} className="flex-1">
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
            <Button onClick={() => setOpen(false)} variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Quick Export Button (no dialog, exports immediately)
 */
export function QuickExportButton({
  format = 'pdf',
  onExport,
  label,
  className = '',
}: {
  format?: ExportFormat;
  onExport: (format: ExportFormat) => Promise<void>;
  label?: string;
  className?: string;
}) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(format);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const Icon = format === 'pdf' ? FileText : format === 'excel' ? Table : File;

  return (
    <Button onClick={handleExport} disabled={isExporting} variant="outline" className={className}>
      <Icon className="h-4 w-4 mr-2" />
      {isExporting ? 'Exporting...' : label || `Export ${format.toUpperCase()}`}
    </Button>
  );
}
