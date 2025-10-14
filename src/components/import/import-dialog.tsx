'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Table, AlertCircle, CheckCircle2 } from 'lucide-react';
import { importGuestListCSV, readFileAsText } from '@/lib/import/csv-parser';
import { importGuestListExcel } from '@/lib/import/excel-parser';
import type { CSVParseResult } from '@/lib/import/csv-parser';

export interface ImportDialogProps {
  onImportComplete: (data: any[]) => Promise<void>;
  acceptedFormats?: string[];
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

/**
 * Import Dialog Component
 */
export function ImportDialog({
  onImportComplete,
  acceptedFormats = ['.csv', '.xlsx', '.xls'],
  title = 'Import Data',
  description = 'Upload a CSV or Excel file to import data',
  children,
}: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setParseResult(null);
    }
  };

  const handleParse = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      let result: CSVParseResult;

      if (file.name.endsWith('.csv')) {
        const content = await readFileAsText(file);
        result = importGuestListCSV(content);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        result = await importGuestListExcel(file);
      } else {
        throw new Error('Unsupported file format');
      }

      setParseResult(result);

      if (result.errors.length > 0) {
        setError(`Found ${result.errors.length} validation errors. Please review.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
      console.error('Import error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.data.length === 0) return;

    setIsProcessing(true);

    try {
      await onImportComplete(parseResult.data);
      setOpen(false);
      resetState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import data');
      console.error('Import error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setParseResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedFormats.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />

            {!file ? (
              <div className="space-y-3">
                <div className="flex justify-center gap-4">
                  <FileText className="h-12 w-12 text-muted-foreground" />
                  <Table className="h-12 w-12 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    CSV or Excel files ({acceptedFormats.join(', ')})
                  </p>
                </div>
                <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Select File
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm">
                  Change File
                </Button>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Parse Result */}
          {parseResult && (
            <div className="space-y-3">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Parsed {parseResult.totalRows} rows. {parseResult.validRows} valid, {parseResult.errors.length} errors.
                </AlertDescription>
              </Alert>

              {parseResult.errors.length > 0 && (
                <div className="max-h-40 overflow-y-auto border rounded p-3 text-sm">
                  <p className="font-medium mb-2">Validation Errors:</p>
                  {parseResult.errors.slice(0, 10).map((err, idx) => (
                    <div key={idx} className="text-xs text-muted-foreground">
                      Row {err.row}, {err.field}: {err.message}
                    </div>
                  ))}
                  {parseResult.errors.length > 10 && (
                    <div className="text-xs text-muted-foreground mt-2">
                      ... and {parseResult.errors.length - 10} more errors
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {!parseResult && file && (
              <Button onClick={handleParse} disabled={isProcessing} className="flex-1">
                {isProcessing ? 'Parsing...' : 'Parse File'}
              </Button>
            )}

            {parseResult && parseResult.validRows > 0 && (
              <Button onClick={handleImport} disabled={isProcessing} className="flex-1">
                {isProcessing ? 'Importing...' : `Import ${parseResult.validRows} Records`}
              </Button>
            )}

            <Button onClick={() => setOpen(false)} variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
