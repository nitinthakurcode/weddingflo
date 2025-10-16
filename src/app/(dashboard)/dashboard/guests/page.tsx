'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@clerk/nextjs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Download } from 'lucide-react';
import { GuestStatsCards } from '@/components/guests/guest-stats-cards';
import { GuestList } from '@/components/guests/guest-list';
import { GuestDialog } from '@/components/guests/guest-dialog';
import { GuestDetailsSheet } from '@/components/guests/guest-details-sheet';
import { QRCodeDisplay } from '@/components/guests/qr-code-display';
import { BulkImportDialog } from '@/components/guests/bulk-import-dialog';
import { CheckInScanner } from '@/components/guests/check-in-scanner';
import { SeatingOptimizerDialog } from '@/components/guests/seating-optimizer-dialog';
import { SeatingChartView } from '@/components/guests/seating-chart-view';
import { SeatingSuggestions } from '@/components/guests/seating-suggestions';
import { Guest, GuestStats } from '@/types/guest';
import { useToast } from '@/hooks/use-toast';
import { PageLoader } from '@/components/ui/loading-spinner';
import type { SeatingOptimizationResult } from '@/lib/ai/seating-optimizer';

export default function GuestsPage() {
  const { toast } = useToast();
  const supabase = createClient();
  const { user } = useUser();
  const queryClient = useQueryClient();

  // Get current user and their clients
  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_user_id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients', currentUser?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', currentUser?.company_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.company_id,
  });

  // Use first client for now (in production, add client selector)
  const selectedClient = clients?.[0];
  const clientId = selectedClient?.id;

  const { data: guests, isLoading: isLoadingGuests } = useQuery({
    queryKey: ['guests', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  const deleteGuest = useMutation({
    mutationFn: async (guestId: string) => {
      const { error } = await supabase.from('guests').delete().eq('id', guestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
    },
  });

  const checkIn = useMutation({
    mutationFn: async ({ guestId, checked_in_by }: { guestId: string; checked_in_by: string }) => {
      const { error } = await supabase
        .from('guests')
        .update({ checked_in: true, checked_in_by, checked_in_at: new Date().toISOString() })
        .eq('id', guestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
    },
  });

  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
  const [qrDialogOpen, setQRDialogOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | undefined>();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('list');
  const [seatingResult, setSeatingResult] = useState<SeatingOptimizationResult | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleFilterChange = (filter: string | null) => {
    setActiveFilter(filter);
    // Switch to list tab when filtering
    if (filter) {
      setActiveTab('list');
      // Scroll to results on mobile after a short delay
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleAddGuest = () => {
    setEditingGuest(undefined);
    setGuestDialogOpen(true);
  };

  const handleEditGuest = (guest: Guest) => {
    setEditingGuest(guest);
    setGuestDialogOpen(true);
    setDetailsSheetOpen(false);
  };

  const handleDeleteGuest = async (guest: Guest) => {
    if (!window.confirm(`Are you sure you want to delete ${guest.guest_name}?`)) {
      return;
    }

    try {
      await deleteGuest.mutateAsync(guest.id);
      toast({
        title: 'Success',
        description: 'Guest deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete guest',
        variant: 'destructive',
      });
    }
  };

  const handleViewQR = (guest: Guest) => {
    setSelectedGuest(guest);
    setQRDialogOpen(true);
  };

  const handleCheckIn = async (guest: Guest) => {
    if (!currentUser?.id) return;

    try {
      await checkIn.mutateAsync({
        guestId: guest.id,
        checked_in_by: currentUser.id,
      });
      toast({
        title: 'Success',
        description: `${guest.guest_name} checked in successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to check in guest',
        variant: 'destructive',
      });
    }
  };

  const handleRowClick = (guest: Guest) => {
    setSelectedGuest(guest);
    setDetailsSheetOpen(true);
  };

  const handleExport = () => {
    if (!guests) return;

    const csv = [
      'Name,Email,Phone,Category,Status,RSVP,Checked In',
      ...guests.map((g) =>
        [
          g.guest_name,
          g.email || '',
          g.phone_number || '',
          g.guest_category || '',
          g.form_submitted ? 'Yes' : 'No',
          g.checked_in ? 'Yes' : 'No',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guests_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'Guest list exported successfully',
    });
  };

  const handleSeatingOptimization = (result: SeatingOptimizationResult) => {
    setSeatingResult(result);
    setActiveTab('seating');
  };

  // Mock tables for seating optimizer (in production, fetch from database)
  const mockTables = [
    { id: 'table-1', name: 'Table 1', capacity: 8 },
    { id: 'table-2', name: 'Table 2', capacity: 8 },
    { id: 'table-3', name: 'Table 3', capacity: 8 },
    { id: 'table-4', name: 'Table 4', capacity: 8 },
    { id: 'table-5', name: 'Table 5', capacity: 10 },
    { id: 'table-6', name: 'Table 6', capacity: 10 },
  ];

  // Loading state
  if (!user || isLoadingUser) {
    return <PageLoader />;
  }

  // Not authenticated
  if (!currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Authentication Required</h2>
          <p className="text-muted-foreground mt-2">
            Please sign in to manage guests.
          </p>
        </div>
      </div>
    );
  }

  // Loading clients and guests
  if (isLoadingClients || isLoadingGuests) {
    return <PageLoader />;
  }

  // No client found state
  if (!selectedClient || !clientId) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">No Client Found</h2>
          <p className="text-muted-foreground mt-2">
            Please create a client first to manage guests.
          </p>
        </div>
      </div>
    );
  }

  // Calculate stats (using only available schema fields)
  const stats: GuestStats = {
    total: guests?.length || 0,
    invited: guests?.length || 0, // All guests are considered invited
    confirmed: guests?.filter((g) => g.form_submitted).length || 0,
    checked_in: guests?.filter((g) => g.checked_in).length || 0,
    accommodation_needed: 0, // Field not in schema
    pending: guests?.filter((g) => !g.form_submitted).length || 0,
  };

  // Filter guests based on active filter (using available fields only)
  const filteredGuests = (() => {
    if (!activeFilter || !guests) return guests || [];

    switch (activeFilter) {
      case 'all':
      case 'invited':
        return guests; // All guests
      case 'confirmed':
        return guests.filter((g) => g.form_submitted);
      case 'checked_in':
        return guests.filter((g) => g.checked_in);
      case 'accommodation':
        return []; // Field not in schema
      case 'pending':
        return guests.filter((g) => !g.form_submitted);
      default:
        return guests;
    }
  })();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Hero section with gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-200 via-primary-100 to-secondary-200 p-6 sm:p-8 border-2 border-primary-300 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="relative space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white break-words">Guests</h2>
            <p className="text-sm sm:text-base text-primary-800 mt-1 break-words">
              Manage your wedding guest list and check-ins
            </p>
          </div>
          {/* Action buttons - responsive layout */}
          <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:ml-4">
            <SeatingOptimizerDialog
              guests={(guests || []).map(g => ({
                id: g.id,
                name: g.guest_name,
                relationship: g.guest_category,
                dietaryRestrictions: g.dietary_restrictions ? [g.dietary_restrictions] : [],
              }))}
              tables={mockTables}
              onOptimizationComplete={handleSeatingOptimization}
            />
            <Button
              variant="outline"
              onClick={() => setBulkImportOpen(true)}
              size="sm"
              className="flex-1 sm:flex-initial bg-white/10 border-white/20 text-gray-900 hover:bg-white/20"
            >
              <Upload className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Import</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              size="sm"
              className="flex-1 sm:flex-initial bg-white/10 border-white/20 text-gray-900 hover:bg-white/20"
            >
              <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Export</span>
            </Button>
            <Button
              onClick={handleAddGuest}
              size="sm"
              className="w-full sm:w-auto bg-white hover:bg-gray-50 text-gray-900 shadow-xl hover:shadow-2xl transition-all duration-200 border-2 border-white/50"
            >
              <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 font-bold" />
              <span className="text-xs sm:text-sm font-bold">Add Guest</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats - Always visible */}
      <GuestStatsCards
        stats={stats}
        isLoading={false}
        onFilterChange={handleFilterChange}
      />
      {activeFilter && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Showing {filteredGuests.length} of {guests?.length || 0} guests
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveFilter(null)}
            className="h-7 px-2 text-xs"
          >
            Clear filter
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList ref={resultsRef} className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="list" className="text-xs sm:text-sm py-2">Guest List</TabsTrigger>
          <TabsTrigger value="seating" className="text-xs sm:text-sm py-2">AI Seating</TabsTrigger>
          <TabsTrigger value="check-in" className="text-xs sm:text-sm py-2">Check-in</TabsTrigger>
          <TabsTrigger value="qr-codes" className="text-xs sm:text-sm py-2">QR Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <GuestList
            guests={filteredGuests}
            isLoading={false}
            onEdit={handleEditGuest}
            onDelete={handleDeleteGuest}
            onViewQR={handleViewQR}
            onCheckIn={handleCheckIn}
            onRowClick={handleRowClick}
          />
        </TabsContent>

        <TabsContent value="seating" className="space-y-4">
          {seatingResult ? (
            <>
              <SeatingSuggestions result={seatingResult} />
              <SeatingChartView
                assignments={seatingResult.assignments}
                guests={(guests || []).map(g => ({
                  id: g.id,
                  name: g.guest_name,
                }))}
              />
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No seating arrangement yet. Click the AI Seating Optimizer button to generate one.
              </p>
              <SeatingOptimizerDialog
                guests={(guests || []).map(g => ({
                  id: g.id,
                  name: g.guest_name,
                  relationship: g.guest_category,
                  dietaryRestrictions: g.dietary_restrictions ? [g.dietary_restrictions] : [],
                }))}
                tables={mockTables}
                onOptimizationComplete={handleSeatingOptimization}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="check-in" className="space-y-4">
          <CheckInScanner clientId={clientId} userId={currentUser.id} />
        </TabsContent>

        <TabsContent value="qr-codes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredGuests.map((guest) => (
              <div
                key={guest.id}
                className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleViewQR(guest)}
              >
                <h3 className="font-medium">{guest.guest_name}</h3>
                <p className="text-sm text-muted-foreground">
                  {guest.email}
                </p>
                {guest.qr_code_token ? (
                  <p className="text-xs text-green-600 mt-2">QR Code Ready</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">
                    Click to generate QR
                  </p>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <GuestDialog
        open={guestDialogOpen}
        onOpenChange={setGuestDialogOpen}
        guest={editingGuest}
        clientId={clientId}
        companyId={currentUser.company_id}
      />

      <GuestDetailsSheet
        guest={selectedGuest}
        open={detailsSheetOpen}
        onOpenChange={setDetailsSheetOpen}
        onEdit={() => selectedGuest && handleEditGuest(selectedGuest)}
      />

      <QRCodeDisplay
        guest={selectedGuest}
        open={qrDialogOpen}
        onOpenChange={setQRDialogOpen}
      />

      <BulkImportDialog
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        clientId={clientId}
        companyId={currentUser.company_id}
      />
    </div>
  );
}
