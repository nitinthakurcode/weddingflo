'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseClient } from '@/lib/supabase/client';
import { useUser } from '@clerk/nextjs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { VendorStats } from '@/components/vendors/vendor-stats';
import { VendorDialog } from '@/components/vendors/vendor-dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Vendor {
  id: string;
  name: string;
  category: string;
  contactName?: string;
  phone?: string;
  email?: string;
  status: 'prospect' | 'contacted' | 'quoted' | 'booked' | 'confirmed' | 'completed' | 'cancelled';
  totalCost: number;
  balance?: number;
  contractDate?: string;
  serviceDate?: string;
  rating?: number;
  wouldRecommend?: boolean;
  notes?: string;
  created_at?: string;
}

export default function VendorsPage() {
  const { toast } = useToast();
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const queryClient = useQueryClient();

  // Get current user and their clients
  const { data: currentUser, isLoading: isLoadingUser } = useQuery<any>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase client not ready');
      if (!user?.id) throw new Error('User ID not available');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!supabase,
  });

  const { data: clients, isLoading: isLoadingClients } = useQuery<any[]>({
    queryKey: ['clients', currentUser?.company_id],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase client not ready');
      if (!user?.id) throw new Error('User ID not available');
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', currentUser?.company_id)
        .order('created_at', { ascending: false });
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
      const { data, error } = await supabase
        .from('weddings')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId && !!supabase,
  });

  const createDefaultWedding = useMutation({
    mutationFn: async (clientId: string) => {
      if (!supabase) throw new Error('Supabase client not ready');
      const { data, error } = await supabase
        .from('weddings')
        // @ts-ignore - TODO: Regenerate Supabase types from database schema
        .insert({
          client_id: clientId,
          wedding_date: new Date().toISOString(),
          status: 'planning',
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
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

  // Query vendors
  const { data: vendors, isLoading: isLoadingVendors } = useQuery<any[]>({
    queryKey: ['vendors', weddingId],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase client not ready');
      if (!user?.id) throw new Error('User ID not available');
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!weddingId && !!supabase,
  });

  const deleteVendor = useMutation({
    mutationFn: async (vendorId: string) => {
      if (!supabase) throw new Error('Supabase client not ready');
      const { error } = await supabase.from('vendors').delete().eq('id', vendorId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });

  const [selectedVendor, setSelectedVendor] = useState<Vendor | undefined>();
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleFilterChange = (filter: string | null) => {
    setStatusFilter(filter);
    // Also switch to 'all' tab when clicking a filter
    setActiveTab('all');
    // Scroll to results on mobile after a short delay
    if (filter) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleAddVendor = () => {
    setSelectedVendor(undefined);
    setVendorDialogOpen(true);
  };

  const handleEditVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setVendorDialogOpen(true);
  };

  const handleDeleteVendor = async (vendor: Vendor) => {
    if (!window.confirm(`Are you sure you want to delete ${vendor.name}?`)) {
      return;
    }

    try {
      await deleteVendor.mutateAsync(vendor.id);
      toast({
        title: 'Success',
        description: 'Vendor deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete vendor',
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

  // Get badge variant for vendor status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'booked':
        return <Badge variant="default" className="bg-green-500">
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-blue-500">Completed</Badge>;
      case 'quoted':
        return <Badge variant="secondary">Quoted</Badge>;
      case 'contacted':
        return <Badge variant="secondary">Contacted</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Prospect</Badge>;
    }
  };

  // Format category display
  const formatCategory = (category: string) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Define columns for DataTable
  const columns: ColumnDef<Vendor>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => formatCategory(row.original.category),
    },
    {
      accessorKey: 'contactName',
      header: 'Contact Name',
      cell: ({ row }) => row.original.contactName || <span className="text-muted-foreground">-</span>,
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => row.original.phone || <span className="text-muted-foreground">-</span>,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => row.original.email || <span className="text-muted-foreground">-</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: 'totalCost',
      header: 'Total Cost',
      cell: ({ row }) => formatCurrency(row.original.totalCost),
    },
    {
      accessorKey: 'balance',
      header: 'Balance',
      cell: ({ row }) => {
        const balance = row.original.balance ?? row.original.totalCost;
        return (
          <span className={balance > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>
            {formatCurrency(balance)}
          </span>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const vendor = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEditVendor(vendor)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDeleteVendor(vendor)}
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

  // Filter vendors based on active tab, category, and status filter
  const getFilteredVendors = () => {
    if (!vendors) return [];

    let filtered = vendors;

    // Apply status filter from stat cards (takes precedence)
    if (statusFilter) {
      switch (statusFilter) {
        case 'all':
          // Show all vendors
          break;
        case 'confirmed':
          filtered = filtered.filter((v) => v.status === 'confirmed' || v.status === 'booked');
          break;
        case 'outstanding':
          filtered = filtered.filter((v) => (v.balance ?? v.totalCost) > 0);
          break;
        case 'paid':
          filtered = filtered.filter((v) => (v.balance ?? v.totalCost) === 0);
          break;
      }
      return filtered;
    }

    // Filter by tab
    switch (activeTab) {
      case 'category':
        if (categoryFilter !== 'all') {
          filtered = filtered.filter((v) => v.category === categoryFilter);
        }
        break;
      case 'payments':
        filtered = filtered.filter((v) => (v.balance ?? v.totalCost) > 0);
        break;
      default:
        break;
    }

    return filtered;
  };

  // Group vendors by category for category view
  const getVendorsByCategory = () => {
    if (!vendors) return {};

    return vendors.reduce((acc, vendor) => {
      const category = vendor.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(vendor);
      return acc;
    }, {} as Record<string, Vendor[]>);
  };

  // Calculate stats from vendors data
  const stats = vendors ? {
    totalVendors: vendors.length,
    confirmedVendors: vendors.filter((v) => v.status === 'confirmed' || v.status === 'booked').length,
    totalValue: vendors.reduce((sum, v) => sum + (v.totalCost || 0), 0),
    totalPaid: vendors.reduce((sum, v) => sum + ((v.totalCost || 0) - ((v.balance ?? v.totalCost) || 0)), 0),
    totalOutstanding: vendors.reduce((sum, v) => sum + ((v.balance ?? v.totalCost) || 0), 0),
  } : null;

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
            Please sign in to manage vendors.
          </p>
        </div>
      </div>
    );
  }

  // Loading clients, weddings, and vendors
  if (isLoadingClients || isLoadingWeddings) {
    return <PageLoader />;
  }

  // Wait for wedding to be created or vendors to load
  if (weddingId && isLoadingVendors) {
    return <PageLoader />;
  }

  // No client found state
  if (!selectedClient || !clientId) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">No Client Found</h2>
          <p className="text-muted-foreground mt-2">
            Please create a client first to manage vendors.
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
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white break-words">Vendor Management</h2>
            <p className="text-sm sm:text-base text-primary-800 mt-1 break-words">
              Track and manage your wedding vendors
            </p>
          </div>
          {/* Action button - responsive */}
          <div className="sm:ml-4">
            <Button
              onClick={handleAddVendor}
              size="sm"
              className="w-full sm:w-auto bg-white hover:bg-gray-50 text-gray-900 shadow-xl hover:shadow-2xl transition-all duration-200 border-2 border-white/50"
            >
              <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 font-bold" />
              <span className="text-xs sm:text-sm font-bold">Add Vendor</span>
            </Button>
          </div>
        </div>
      </div>

      {stats && (
        <VendorStats
          stats={{
            totalVendors: stats.totalVendors,
            confirmedVendors: stats.confirmedVendors,
            totalValue: stats.totalValue,
            totalPaid: stats.totalPaid,
            totalOutstanding: stats.totalOutstanding,
          }}
          isLoading={false}
          onFilterChange={handleFilterChange}
        />
      )}

      {statusFilter && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Showing {getFilteredVendors().length} of {vendors?.length || 0} vendors
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusFilter(null)}
            className="h-7 px-2 text-xs"
          >
            Clear filter
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList ref={resultsRef} className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="all" className="text-xs sm:text-sm py-2">All Vendors</TabsTrigger>
          <TabsTrigger value="category" className="text-xs sm:text-sm py-2">By Category</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs sm:text-sm py-2">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <DataTable
            columns={columns}
            data={getFilteredVendors()}
            searchKey="name"
            searchPlaceholder="Search by vendor name..."
            filters={[
              {
                column: 'category',
                title: 'Category',
                options: [
                  { label: 'Venue', value: 'venue' },
                  { label: 'Catering', value: 'catering' },
                  { label: 'Photography', value: 'photography' },
                  { label: 'Videography', value: 'videography' },
                  { label: 'Florist', value: 'florist' },
                  { label: 'Music', value: 'music' },
                  { label: 'Decor', value: 'decor' },
                  { label: 'Transportation', value: 'transportation' },
                  { label: 'Stationery', value: 'stationery' },
                  { label: 'Hair & Makeup', value: 'hair_makeup' },
                  { label: 'Attire', value: 'attire' },
                  { label: 'Cake', value: 'cake' },
                  { label: 'Other', value: 'other' },
                ],
              },
              {
                column: 'status',
                title: 'Status',
                options: [
                  { label: 'Prospect', value: 'prospect' },
                  { label: 'Contacted', value: 'contacted' },
                  { label: 'Quoted', value: 'quoted' },
                  { label: 'Booked', value: 'booked' },
                  { label: 'Confirmed', value: 'confirmed' },
                  { label: 'Completed', value: 'completed' },
                  { label: 'Cancelled', value: 'cancelled' },
                ],
              },
            ]}
            emptyState={{
              title: 'No vendors yet',
              description: 'Start by adding your first vendor',
              action: {
                label: 'Add Vendor',
                onClick: handleAddVendor,
              },
            }}
          />
        </TabsContent>

        <TabsContent value="category" className="space-y-4">
          <div className="mb-4 flex items-center gap-4">
            <h3 className="text-lg font-medium">Filter by Category</h3>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="venue">Venue</SelectItem>
                <SelectItem value="catering">Catering</SelectItem>
                <SelectItem value="photography">Photography</SelectItem>
                <SelectItem value="videography">Videography</SelectItem>
                <SelectItem value="florist">Florist</SelectItem>
                <SelectItem value="music">Music</SelectItem>
                <SelectItem value="decor">Decor</SelectItem>
                <SelectItem value="transportation">Transportation</SelectItem>
                <SelectItem value="stationery">Stationery</SelectItem>
                <SelectItem value="hair_makeup">Hair & Makeup</SelectItem>
                <SelectItem value="attire">Attire</SelectItem>
                <SelectItem value="cake">Cake</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {categoryFilter === 'all' ? (
            <div className="space-y-6">
              {Object.entries(getVendorsByCategory()).map(([category, categoryVendors]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-md font-semibold">{formatCategory(category)}</h4>
                  <DataTable
                    columns={columns}
                    data={categoryVendors as Vendor[]}
                    searchKey="name"
                    searchPlaceholder="Search vendors..."
                  />
                </div>
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={getFilteredVendors()}
              searchKey="name"
              searchPlaceholder="Search vendors..."
              emptyState={{
                title: 'No vendors in this category',
                description: 'Add vendors to this category to see them here',
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-medium">Outstanding Payments</h3>
            <p className="text-sm text-muted-foreground">
              Vendors with pending payments
            </p>
          </div>
          <DataTable
            columns={columns}
            data={getFilteredVendors()}
            searchKey="name"
            searchPlaceholder="Search by vendor name..."
            emptyState={{
              title: 'All payments complete',
              description: 'No outstanding payments at the moment',
            }}
          />
        </TabsContent>
      </Tabs>

      {weddingId && (
        <VendorDialog
          open={vendorDialogOpen}
          onOpenChange={setVendorDialogOpen}
          vendor={selectedVendor}
          weddingId={weddingId}
        />
      )}
    </div>
  );
}
