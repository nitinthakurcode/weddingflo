'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseClient } from '@/lib/supabase/client';
import { useUser } from '@clerk/nextjs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { GiftStats } from '@/components/gifts/gift-stats';
import { GiftDialog } from '@/components/gifts/gift-dialog';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { useToast } from '@/hooks/use-toast';
import { PageLoader } from '@/components/ui/loading-spinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Gift {
  id: string;
  guestName: string;
  description: string;
  category?: string;
  estimatedValue?: number;
  receivedDate: string;
  deliveryStatus: 'pending' | 'in_transit' | 'delivered' | 'returned';
  thankYouStatus: 'not_sent' | 'draft' | 'sent';
  notes?: string;
}

export default function GiftsPage() {
  const { toast } = useToast();
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const queryClient = useQueryClient();

  // Get current user and their clients
  const { data: currentUser, isLoading: isLoadingUser } = useQuery<any>({
    queryKey: ['currentUser', user?.id],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase client not ready');
      if (!user?.id) throw new Error('User ID not available');
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!supabase,
  });

  const { data: clients, isLoading: isLoadingClients } = useQuery<any[]>({
    queryKey: ['clients', currentUser?.company_id],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase client not ready');
      if (!user?.id) throw new Error('User ID not available');
      if (!currentUser?.company_id) return [];
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', currentUser.company_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.company_id && !!supabase,
  });

  // Use first client for now (in production, add client selector)
  const selectedClient = clients?.[0];
  const clientId = selectedClient?.id;

  // Get or create wedding for this client
  const { data: weddings, isLoading: isLoadingWeddings } = useQuery<any[]>({
    queryKey: ['weddings', clientId],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase client not ready');
      if (!user?.id) throw new Error('User ID not available');
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('weddings')
        .select('*')
        .eq('client_id', clientId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId && !!supabase,
  });

  const createDefaultWedding = useMutation({
    mutationFn: async (clientId: string) => {
      if (!supabase) throw new Error('Supabase client not ready');
      // @ts-ignore - TODO: Regenerate Supabase types from database schema
      const { error } = await supabase.from('weddings').insert({
        client_id: clientId,
        wedding_date: new Date().toISOString(),
        status: 'planning',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weddings'] });
    },
  });

  // Auto-create wedding if client exists but has no wedding
  const [weddingCreated, setWeddingCreated] = useState(false);

  useEffect(() => {
    if (clientId && weddings && weddings.length === 0 && !weddingCreated) {
      createDefaultWedding.mutateAsync(clientId)
        .then(() => setWeddingCreated(true))
        .catch((err) => console.error('Failed to create wedding:', err));
    }
  }, [clientId, weddings, weddingCreated]);

  const weddingId = weddings?.[0]?.id;

  // Query gifts and stats
  const { data: gifts, isLoading: isLoadingGifts } = useQuery<any[]>({
    queryKey: ['gifts', weddingId],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase client not ready');
      if (!user?.id) throw new Error('User ID not available');
      if (!weddingId) return [];
      const { data, error } = await supabase
        .from('gifts')
        .select('*')
        .eq('wedding_id', weddingId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!weddingId && !!supabase,
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery<any>({
    queryKey: ['gift_stats', weddingId],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase client not ready');
      if (!user?.id) throw new Error('User ID not available');
      if (!weddingId) return null;
      const { data: giftsData, error }: { data: any[] | null, error: any } = await supabase
        .from('gifts')
        .select('*')
        .eq('wedding_id', weddingId);
      if (error) throw error;

      const totalGifts = giftsData?.length || 0;
      const deliveredGifts = giftsData?.filter(g => g.deliveryStatus === 'delivered').length || 0;
      const thankYousSent = giftsData?.filter(g => g.thankYouStatus === 'sent').length || 0;
      const totalValue = giftsData?.reduce((sum, g) => sum + (g.estimatedValue || 0), 0) || 0;

      return { totalGifts, deliveredGifts, thankYousSent, totalValue };
    },
    enabled: !!weddingId && !!supabase,
  });

  const deleteGift = useMutation({
    mutationFn: async (giftId: string) => {
      if (!supabase) throw new Error('Supabase client not ready');
      const { error } = await supabase.from('gifts').delete().eq('id', giftId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gifts'] });
      queryClient.invalidateQueries({ queryKey: ['gift_stats'] });
    },
  });

  const [selectedGift, setSelectedGift] = useState<Gift | undefined>();
  const [giftDialogOpen, setGiftDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [giftFilter, setGiftFilter] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleFilterChange = (filter: string | null) => {
    setGiftFilter(filter);
    // Switch to 'all' tab when filtering
    setActiveTab('all');
    // Scroll to results on mobile after a short delay
    if (filter) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleAddGift = () => {
    setSelectedGift(undefined);
    setGiftDialogOpen(true);
  };

  const handleEditGift = (gift: Gift) => {
    setSelectedGift(gift);
    setGiftDialogOpen(true);
  };

  const handleDeleteGift = async (gift: Gift) => {
    if (!window.confirm(`Are you sure you want to delete this gift from ${gift.guestName}?`)) {
      return;
    }

    try {
      await deleteGift.mutateAsync(gift.id);
      toast({
        title: 'Success',
        description: 'Gift deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete gift',
        variant: 'destructive',
      });
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Get badge variant for delivery status
  const getDeliveryStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="default" className="bg-green-500">Delivered</Badge>;
      case 'in_transit':
        return <Badge variant="secondary">In Transit</Badge>;
      case 'returned':
        return <Badge variant="destructive">Returned</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  // Get badge variant for thank you status
  const getThankYouStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-blue-500">Sent</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      default:
        return <Badge variant="outline">Not Sent</Badge>;
    }
  };

  // Define columns for DataTable
  const columns: ColumnDef<Gift>[] = [
    {
      accessorKey: 'guestName',
      header: 'Guest Name',
    },
    {
      accessorKey: 'description',
      header: 'Description',
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => {
        const category = row.original.category;
        return category ? (
          <span className="capitalize">{category.replace('_', ' ')}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: 'estimatedValue',
      header: 'Value',
      cell: ({ row }) => {
        const value = row.original.estimatedValue;
        return value ? formatCurrency(value) : <span className="text-muted-foreground">-</span>;
      },
    },
    {
      accessorKey: 'deliveryStatus',
      header: 'Delivery Status',
      cell: ({ row }) => getDeliveryStatusBadge(row.original.deliveryStatus),
    },
    {
      accessorKey: 'thankYouStatus',
      header: 'Thank You Status',
      cell: ({ row }) => getThankYouStatusBadge(row.original.thankYouStatus),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const gift = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEditGift(gift)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDeleteGift(gift)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Filter gifts based on active tab and filter
  const getFilteredGifts = () => {
    if (!gifts) return [];

    // Apply stat card filter first (takes precedence)
    if (giftFilter) {
      switch (giftFilter) {
        case 'all':
          return gifts;
        case 'delivered':
          return gifts.filter((g) => g.deliveryStatus === 'delivered');
        case 'thankyou_sent':
          return gifts.filter((g) => g.thankYouStatus === 'sent');
        default:
          return gifts;
      }
    }

    // Then apply tab filter
    switch (activeTab) {
      case 'delivery':
        return gifts.filter((g) => g.deliveryStatus !== 'delivered');
      case 'thankyou':
        return gifts.filter((g) => g.thankYouStatus !== 'sent');
      default:
        return gifts;
    }
  };

  // Loading state
  if (isLoadingUser) {
    return <PageLoader />;
  }

  // Not authenticated
  if (!user || !currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Authentication Required</h2>
          <p className="text-muted-foreground mt-2">
            Please sign in to manage gifts.
          </p>
        </div>
      </div>
    );
  }

  // Loading clients, weddings, and gifts
  if (isLoadingClients || isLoadingWeddings) {
    return <PageLoader />;
  }

  // Wait for wedding to be created or gifts to load
  if (weddingId && (isLoadingGifts || isLoadingStats)) {
    return <PageLoader />;
  }

  // No client found state
  if (!selectedClient || !clientId) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">No Client Found</h2>
          <p className="text-muted-foreground mt-2">
            Please create a client first to manage gifts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Hero section with gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-200 via-primary-100 to-secondary-200 p-6 sm:p-8 border-2 border-primary-300 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="relative space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white break-words">Gift Management</h2>
            <p className="text-sm sm:text-base text-primary-800 mt-1 break-words">
              Track gifts, deliveries, and thank you notes
            </p>
          </div>
          <div className="sm:ml-4">
            <Button
              onClick={handleAddGift}
              size="sm"
              className="w-full sm:w-auto bg-white hover:bg-gray-50 text-gray-900 shadow-xl hover:shadow-2xl transition-all duration-200 border-2 border-white/50"
            >
              <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 font-bold" />
              <span className="text-xs sm:text-sm font-bold">Add Gift</span>
            </Button>
          </div>
        </div>
      </div>

      {stats && (
        <GiftStats
          stats={{
            totalGifts: stats.totalGifts,
            deliveredGifts: stats.deliveredGifts,
            thankYousSent: stats.thankYousSent,
            totalValue: stats.totalValue,
          }}
          isLoading={false}
          onFilterChange={handleFilterChange}
        />
      )}

      {giftFilter && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Showing {getFilteredGifts().length} of {gifts?.length || 0} gifts
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setGiftFilter(null)}
            className="h-7 px-2 text-xs"
          >
            Clear filter
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList ref={resultsRef} className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="all" className="text-xs sm:text-sm py-2">All Gifts</TabsTrigger>
          <TabsTrigger value="delivery" className="text-xs sm:text-sm py-2">Delivery</TabsTrigger>
          <TabsTrigger value="thankyou" className="text-xs sm:text-sm py-2">Thank You</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <DataTable
            columns={columns}
            data={getFilteredGifts()}
            searchKey="guestName"
            searchPlaceholder="Search by guest name..."
            filters={[
              {
                column: 'deliveryStatus',
                title: 'Delivery Status',
                options: [
                  { label: 'Pending', value: 'pending' },
                  { label: 'In Transit', value: 'in_transit' },
                  { label: 'Delivered', value: 'delivered' },
                  { label: 'Returned', value: 'returned' },
                ],
              },
              {
                column: 'thankYouStatus',
                title: 'Thank You Status',
                options: [
                  { label: 'Not Sent', value: 'not_sent' },
                  { label: 'Draft', value: 'draft' },
                  { label: 'Sent', value: 'sent' },
                ],
              },
            ]}
            emptyState={{
              title: 'No gifts yet',
              description: 'Start by adding your first gift',
              action: {
                label: 'Add Gift',
                onClick: handleAddGift,
              },
            }}
          />
        </TabsContent>

        <TabsContent value="delivery" className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-medium">Pending Deliveries</h3>
            <p className="text-sm text-muted-foreground">
              Gifts that are pending or in transit
            </p>
          </div>
          <DataTable
            columns={columns}
            data={getFilteredGifts()}
            searchKey="guestName"
            searchPlaceholder="Search by guest name..."
            emptyState={{
              title: 'All gifts delivered',
              description: 'No pending deliveries at the moment',
            }}
          />
        </TabsContent>

        <TabsContent value="thankyou" className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-medium">Thank You Notes</h3>
            <p className="text-sm text-muted-foreground">
              Track thank you notes that need to be sent
            </p>
          </div>
          <DataTable
            columns={columns}
            data={getFilteredGifts()}
            searchKey="guestName"
            searchPlaceholder="Search by guest name..."
            emptyState={{
              title: 'All thank you notes sent',
              description: 'Great job staying on top of your thank yous!',
            }}
          />
        </TabsContent>
      </Tabs>

      {weddingId && (
        <GiftDialog
          open={giftDialogOpen}
          onOpenChange={setGiftDialogOpen}
          gift={selectedGift}
          weddingId={weddingId}
        />
      )}
    </div>
  );
}
