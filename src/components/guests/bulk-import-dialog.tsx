'use client';

import { useState, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Id } from '@/convex/_generated/dataModel';
import { BulkImportRow } from '@/types/guest';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: Id<'clients'>;
  companyId: Id<'companies'>;
}

export function BulkImportDialog({
  open,
  onOpenChange,
  clientId,
  companyId,
}: BulkImportDialogProps) {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [previewData, setPreviewData] = useState<BulkImportRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkCreate = useMutation(api.guests.bulkCreate);

  const downloadTemplate = () => {
    const template = `guest_name,guest_email,guest_phone,guest_category,guest_side,plus_one_allowed,plus_one_name,meal_preference,accommodation_needed
John Doe,john@example.com,+1234567890,bride_family,bride,true,Jane Doe,veg,true
Mary Smith,mary@example.com,+1234567891,groom_family,groom,false,,non_veg,false`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guest_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Template Downloaded',
      description: 'Fill in the template and upload it to import guests.',
    });
  };

  const parseCSV = (text: string): BulkImportRow[] => {
    const lines = text.split('\n').filter((line) => line.trim());
    const headers = lines[0].split(',').map((h) => h.trim());
    const data: BulkImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });
      data.push(row as BulkImportRow);
    }

    return data;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      setPreviewData(parsed);

      toast({
        title: 'File Loaded',
        description: `Found ${parsed.length} guests to import`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to parse CSV file',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async () => {
    if (previewData.length === 0) {
      toast({
        title: 'No Data',
        description: 'Please upload a CSV file first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsImporting(true);

      const guests = previewData.map((row, index) => ({
        serial_number: index + 1,
        guest_name: row.guest_name,
        email: row.guest_email || undefined,
        phone_number: row.guest_phone || undefined,
        guest_category: row.guest_category || undefined,
        number_of_packs: row.plus_one_allowed === 'true' ? 2 : 1,
        additional_guest_names: row.plus_one_name ? [row.plus_one_name] : [],
        events_attending: [],
        dietary_restrictions: row.meal_preference ? [row.meal_preference] : [],
        seating_preferences: [],
      }));

      await bulkCreate({
        guests,
        company_id: companyId,
        client_id: clientId
      });

      toast({
        title: 'Success',
        description: `Imported ${guests.length} guests successfully`,
      });

      setPreviewData([]);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to import guests',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Guests</DialogTitle>
          <DialogDescription>
            Import multiple guests at once using a CSV file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="flex-1"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload CSV
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {previewData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Preview ({previewData.length} guests)
                  </span>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-2 py-1 text-left">Name</th>
                      <th className="px-2 py-1 text-left">Email</th>
                      <th className="px-2 py-1 text-left">Category</th>
                      <th className="px-2 py-1 text-left">Side</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((row, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-2 py-1">{row.guest_name}</td>
                        <td className="px-2 py-1">{row.guest_email}</td>
                        <td className="px-2 py-1">{row.guest_category}</td>
                        <td className="px-2 py-1">{row.guest_side}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 10 && (
                  <div className="text-center py-2 text-xs text-muted-foreground border-t">
                    And {previewData.length - 10} more...
                  </div>
                )}
              </div>

              <Button
                onClick={handleImport}
                disabled={isImporting}
                className="w-full"
              >
                {isImporting ? 'Importing...' : `Import ${previewData.length} Guests`}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
