'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
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
  _id: Id<'gifts'>;
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

  // Get current user and their clients
  const currentUser = useQuery(api.users.getCurrent);
  const clients = useQuery(
    api.clients.list,
    currentUser?.company_id ? { companyId: currentUser.company_id } : 'skip'
  );

  // Use first client for now (in production, add client selector)
  const selectedClient = clients?.[0];
  const clientId = selectedClient?._id;

  // Get or create wedding for this client
  const weddings = useQuery(
    api.weddings.getByClient,
    clientId ? { clientId } : 'skip'
  );
  const createDefaultWedding = useMutation(api.weddings.createDefault);

  // Auto-create wedding if client exists but has no wedding
  const [weddingCreated, setWeddingCreated] = useState(false);

  useEffect(() => {
    if (clientId && weddings && weddings.length === 0 && !weddingCreated) {
      createDefaultWedding({ clientId })
        .then(() => setWeddingCreated(true))
        .catch((err) => console.error('Failed to create wedding:', err));
    }
  }, [clientId, weddings, weddingCreated, createDefaultWedding]);

  const weddingId = weddings?.[0]?._id;

  // Query gifts and stats
  const gifts = useQuery(
    api.gifts.getGiftsByWedding,
    weddingId ? { weddingId } : 'skip'
  );
  const stats = useQuery(
    api.gifts.getGiftStats,
    weddingId ? { weddingId } : 'skip'
  );

  const deleteGift = useMutation(api.gifts.deleteGift);

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
      await deleteGift({ giftId: gift._id });
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
  if (currentUser === undefined) {
    return <PageLoader />;
  }

  // Not authenticated
  if (currentUser === null) {
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
  if (clients === undefined || weddings === undefined) {
    return <PageLoader />;
  }

  // Wait for wedding to be created or gifts to load
  if (weddingId && (gifts === undefined || stats === undefined)) {
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
      {/* Mobile-friendly header */}
      <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">Gift Management</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 break-words">
            Track gifts, deliveries, and thank you notes
          </p>
        </div>
        <div className="sm:ml-4">
          <Button onClick={handleAddGift} size="sm" className="w-full sm:w-auto">
            <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Add Gift</span>
          </Button>
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
