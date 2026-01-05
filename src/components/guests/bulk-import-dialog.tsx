'use client';

import { useState, useRef } from 'react';
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
import { BulkImportRow } from '@/types/guest';
import { trpc } from '@/lib/trpc/client';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  companyId: string;
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
  const utils = trpc.useUtils();

  const { data: existingGuests } = trpc.guests.getAll.useQuery(
    { clientId },
    { enabled: !!clientId }
  );

  const createGuest = trpc.guests.create.useMutation({
    onSuccess: () => {
      utils.guests.getAll.invalidate({ clientId });
    },
  });

  const updateGuest = trpc.guests.update.useMutation({
    onSuccess: () => {
      utils.guests.getAll.invalidate({ clientId });
    },
  });

  const bulkImportGuests = async (guests: any[]) => {
    const results = { created: 0, updated: 0 };

    for (const guest of guests) {
      // Check if guest exists by matching name, email, or phone
      const existing = existingGuests?.find((g: any) => {
        const existingFullName = `${g.first_name} ${g.last_name || ''}`.trim().toLowerCase();
        const guestFullName = `${guest.first_name} ${guest.last_name || ''}`.trim().toLowerCase();
        return existingFullName === guestFullName ||
          (g.email && guest.email && g.email === guest.email) ||
          (g.phone && guest.phone && g.phone === guest.phone);
      });

      try {
        if (existing) {
          // Update
          await updateGuest.mutateAsync({
            id: existing.id,
            ...guest,
          });
          results.updated++;
        } else {
          // Create
          await createGuest.mutateAsync(guest);
          results.created++;
        }
      } catch (error) {
        console.error('Error importing guest:', error);
      }
    }

    return results;
  };

  const downloadTemplate = () => {
    const template = `Guest Name,Phone,Email,Party Size,Additional Guests,Arrival Date/Time,Arrival Mode,Departure Date/Time,Departure Mode,Relationship,Group,Attending Events,RSVP Status,Meal Preference,Dietary Restrictions,Plus One,Hotel Required,Transport Required,Gift to Give,Notes
John Doe,+1234567890,john@example.com,3,"Jane Doe, Bob Doe",2024-12-15 10:00,Flight,2024-12-18 14:00,Flight,Uncle,Bride's Family,"Sangeet, Wedding",accepted,veg,Nut allergy,No,Yes,Yes,Welcome basket,VIP guest
Mary Smith,+1234567891,mary@example.com,1,,2024-12-14 18:00,Car,2024-12-19 12:00,Car,College Friend,Groom's Friends,"Haldi, Wedding",pending,non_veg,,Yes,No,No,,`;

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

      // Validate and filter guests
      const validGuests = previewData
        .filter((row) => {
          // Filter out rows with missing or empty Guest Name
          const name = (row as any)['Guest Name'] || row.guestName;
          return name && name.trim() !== '';
        })
        .map((row) => {
          const rowData = row as any;
          const name = rowData['Guest Name'] || rowData.guestName || '';
          const nameParts = name.trim().split(' ');
          const firstName = nameParts[0] || name;
          const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

          // Parse additional guests (comma-separated)
          const additionalGuestsStr = rowData['Additional Guests'] || '';
          const additionalGuestNames = additionalGuestsStr
            ? additionalGuestsStr.split(',').map((n: string) => n.trim()).filter(Boolean)
            : [];

          // Parse attending events (comma-separated)
          const eventsStr = rowData['Attending Events'] || '';
          const attendingEvents = eventsStr
            ? eventsStr.split(',').map((e: string) => e.trim()).filter(Boolean)
            : [];

          return {
            first_name: firstName,
            last_name: lastName,
            email: (rowData['Email'] || rowData.guestEmail || '').trim() || undefined,
            phone: (rowData['Phone'] || rowData.guestPhone || '').trim() || undefined,
            // Party info
            party_size: parseInt(rowData['Party Size']) || 1,
            additional_guest_names: additionalGuestNames,
            // Travel info
            arrival_datetime: rowData['Arrival Date/Time'] || undefined,
            arrival_mode: (rowData['Arrival Mode'] || '').toLowerCase() || undefined,
            departure_datetime: rowData['Departure Date/Time'] || undefined,
            departure_mode: (rowData['Departure Mode'] || '').toLowerCase() || undefined,
            // Relationship
            relationship_to_family: rowData['Relationship'] || undefined,
            group_name: (rowData['Group'] || rowData.groupName || '').trim() || undefined,
            attending_events: attendingEvents,
            // RSVP
            rsvp_status: (rowData['RSVP Status'] || 'pending').toLowerCase(),
            meal_preference: (rowData['Meal Preference'] || '').toLowerCase() || undefined,
            dietary_restrictions: (rowData['Dietary Restrictions'] || '').trim() || undefined,
            plus_one_allowed: rowData['Plus One']?.toLowerCase() === 'yes' || rowData.plusOne_allowed === 'true',
            // Planner fields
            hotel_required: rowData['Hotel Required']?.toLowerCase() === 'yes',
            transport_required: rowData['Transport Required']?.toLowerCase() === 'yes',
            gift_to_give: rowData['Gift to Give'] || undefined,
            notes: rowData['Notes'] || undefined,
          };
        });

      if (validGuests.length === 0) {
        toast({
          title: 'No Valid Guests',
          description: 'All rows are missing required guest_name field',
          variant: 'destructive',
        });
        setIsImporting(false);
        return;
      }

      if (validGuests.length < previewData.length) {
        toast({
          title: 'Warning',
          description: `Skipped ${previewData.length - validGuests.length} rows with missing names`,
          variant: 'destructive',
        });
      }

      const result = await bulkImportGuests(
        validGuests.map(g => ({
          ...g,
          company_id: companyId,
          client_id: clientId
        }))
      );

      // Build result message
      const messages = [];
      if (result.created > 0) {
        messages.push(`Created ${result.created} new guest${result.created > 1 ? 's' : ''}`);
      }
      if (result.updated > 0) {
        messages.push(`Updated ${result.updated} existing guest${result.updated > 1 ? 's' : ''}`);
      }

      toast({
        title: 'Import Complete',
        description: messages.length > 0
          ? messages.join('. ') + '.'
          : 'No changes made',
      });

      setPreviewData([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to import guests',
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
                      <th className="px-2 py-1 text-left">Status</th>
                      <th className="px-2 py-1 text-left">Name</th>
                      <th className="px-2 py-1 text-left">Email</th>
                      <th className="px-2 py-1 text-left">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((row, index) => {
                      const rowData = row as any;
                      const guestName = rowData['Guest Name'] || rowData.guestName || '';
                      const guestEmail = rowData['Email'] || rowData.guestEmail || '';
                      const guestGroup = rowData['Group'] || rowData.groupName || '';
                      const guestPhone = rowData['Phone'] || rowData.guestPhone || '';

                      const isInvalid = !guestName || guestName.trim() === '';

                      // Check if guest already exists
                      const existingGuest = existingGuests?.find((existing: any) => {
                        const existingFullName = `${existing.first_name} ${existing.last_name || ''}`.trim().toLowerCase();
                        const nameMatch = existingFullName === guestName.toLowerCase();
                        const emailMatch = guestEmail && existing.email &&
                          existing.email.toLowerCase() === guestEmail.toLowerCase();
                        const phoneMatch = guestPhone && existing.phone &&
                          existing.phone === guestPhone;
                        return nameMatch || emailMatch || phoneMatch;
                      });

                      const willUpdate = !isInvalid && existingGuest;
                      const willCreate = !isInvalid && !existingGuest;

                      return (
                        <tr
                          key={index}
                          className={`border-t ${
                            isInvalid ? 'bg-rose-50 dark:bg-rose-950/30' :
                            willUpdate ? 'bg-cobalt-50 dark:bg-cobalt-950/30' :
                            willCreate ? 'bg-sage-50 dark:bg-sage-950/30' : ''
                          }`}
                          title={
                            isInvalid ? 'Missing guest name - will be skipped' :
                            willUpdate ? 'Guest exists - will be updated' :
                            'New guest - will be created'
                          }
                        >
                          <td className="px-2 py-1">
                            {isInvalid && (
                              <span className="text-xs font-semibold text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-900/50 px-2 py-0.5 rounded">
                                SKIP
                              </span>
                            )}
                            {willUpdate && (
                              <span className="text-xs font-semibold text-cobalt-600 bg-cobalt-100 dark:text-cobalt-400 dark:bg-cobalt-900/50 px-2 py-0.5 rounded">
                                UPDATE
                              </span>
                            )}
                            {willCreate && (
                              <span className="text-xs font-semibold text-sage-600 bg-sage-100 dark:text-sage-400 dark:bg-sage-900/50 px-2 py-0.5 rounded">
                                NEW
                              </span>
                            )}
                          </td>
                          <td className={`px-2 py-1 ${isInvalid ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}`}>
                            {guestName || '⚠️ Missing'}
                          </td>
                          <td className="px-2 py-1">{guestEmail}</td>
                          <td className="px-2 py-1">{guestGroup}</td>
                        </tr>
                      );
                    })}
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
