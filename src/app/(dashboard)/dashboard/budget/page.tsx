'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Download, Upload } from 'lucide-react';
import { BudgetSummaryCards } from '@/components/budget/budget-summary-cards';
import { CategoryBreakdown } from '@/components/budget/category-breakdown';
import { SpendingTimelineChart } from '@/components/budget/spending-timeline';
import { BudgetItemsTable } from '@/components/budget/budget-items-table';
import { BudgetItemDialog } from '@/components/budget/budget-item-dialog';
import { BudgetItem } from '@/types/budget';
import { useToast } from '@/hooks/use-toast';
import { PageLoader } from '@/components/ui/loading-spinner';
import { calculateBudgetStats, calculateCategoryBreakdown, calculateSpendingTimeline } from '@/lib/budget-calculations';

export default function BudgetPage() {
  const { toast } = useToast();

  // Get current user and their clients
  const currentUser = useQuery(api.users.getCurrent);
  const clients = useQuery(
    api.clients.list,
    currentUser?.company_id ? { companyId: currentUser.company_id } : 'skip'
  );

  // Get weddings for the first client
  const selectedClient = clients?.[0];
  const weddings = useQuery(
    api.weddings.getByClient,
    selectedClient?._id ? { clientId: selectedClient._id } : 'skip'
  );

  // Use first wedding for now (in production, add wedding selector)
  const selectedWedding = weddings && weddings.length > 0 ? weddings[0] : null;
  const weddingId = selectedWedding?._id;

  // Fetch budget data
  const budgetItems = useQuery(
    api.budget.getBudgetItemsByWedding,
    weddingId ? { weddingId } : 'skip'
  );

  const deleteBudgetItem = useMutation(api.budget.deleteBudgetItem);

  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | undefined>();
  const [budgetFilter, setBudgetFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleFilterChange = (filter: string | null) => {
    setBudgetFilter(filter);
    // Switch to items tab when filtering to show filtered items
    if (filter) {
      setActiveTab('items');
      // Scroll to results on mobile after a short delay
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleAddItem = () => {
    setEditingItem(undefined);
    setBudgetDialogOpen(true);
  };

  const handleEditItem = (item: BudgetItem) => {
    setEditingItem(item);
    setBudgetDialogOpen(true);
  };

  const handleDeleteItem = async (item: BudgetItem) => {
    if (!window.confirm(`Are you sure you want to delete ${item.item_name}?`)) {
      return;
    }

    try {
      await deleteBudgetItem({ budgetItemId: item._id });
      toast({
        title: 'Success',
        description: 'Budget item deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete budget item',
        variant: 'destructive',
      });
    }
  };

  const handleExport = () => {
    if (!budgetItems) return;

    const csv = [
      'Category,Item,Description,Budget,Actual Cost,Paid Amount,Payment Status,Due Date,Paid Date,Notes',
      ...budgetItems.map((item) =>
        [
          item.category,
          item.item_name,
          item.description || '',
          item.budget,
          item.actual_cost,
          item.paid_amount,
          item.payment_status,
          item.due_date || '',
          item.paid_date || '',
          item.notes || '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'Budget exported successfully',
    });
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
            Please sign in to manage budget.
          </p>
        </div>
      </div>
    );
  }

  // Loading data
  if (clients === undefined || weddings === undefined || budgetItems === undefined) {
    return <PageLoader />;
  }

  // No client found state
  if (!selectedClient) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">No Client Found</h2>
          <p className="text-muted-foreground mt-2">
            Please create a client first to manage budget.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Note: Client creation is not yet available in this demo.
          </p>
        </div>
      </div>
    );
  }

  // No wedding found state
  if (!selectedWedding || !weddingId) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">No Wedding Found</h2>
          <p className="text-muted-foreground mt-2">
            Please create a wedding first to manage budget.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Note: Wedding creation is not yet available in this demo.
          </p>
        </div>
      </div>
    );
  }

  // Calculate statistics (ensure budgetItems is an array)
  const stats = calculateBudgetStats(budgetItems || []);

  // Filter budget items based on active filter
  const filteredBudgetItems = (() => {
    if (!budgetFilter || !budgetItems) return budgetItems || [];

    switch (budgetFilter) {
      case 'all':
        return budgetItems;
      case 'spent':
        return budgetItems.filter((item) => item.actual_cost > 0);
      case 'remaining':
        return budgetItems.filter((item) => {
          const remaining = item.budget - item.actual_cost;
          return remaining > 0;
        });
      case 'overbudget':
        return budgetItems.filter((item) => item.actual_cost > item.budget);
      default:
        return budgetItems;
    }
  })();

  // Calculate category breakdown and spending timeline from filtered items
  const categoryBreakdown = calculateCategoryBreakdown(filteredBudgetItems);
  const spendingTimeline = calculateSpendingTimeline(filteredBudgetItems);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mobile-friendly header */}
      <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">Budget</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 break-words">
            Track and manage your wedding expenses
          </p>
        </div>
        {/* Action buttons - responsive layout */}
        <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:ml-4">
          <Button
            variant="outline"
            onClick={handleExport}
            size="sm"
            className="flex-1 sm:flex-initial"
          >
            <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Export</span>
          </Button>
          <Button
            onClick={handleAddItem}
            size="sm"
            className="flex-1 sm:flex-initial"
          >
            <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Add Item</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList ref={resultsRef} className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="overview" className="text-xs sm:text-sm py-2">Overview</TabsTrigger>
          <TabsTrigger value="items" className="text-xs sm:text-sm py-2">Items</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs sm:text-sm py-2">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <BudgetSummaryCards
            stats={stats}
            isLoading={false}
            onFilterChange={handleFilterChange}
          />
          {budgetFilter && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Showing {filteredBudgetItems.length} of {budgetItems?.length || 0} items
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBudgetFilter(null)}
                className="h-7 px-2 text-xs"
              >
                Clear filter
              </Button>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <CategoryBreakdown data={categoryBreakdown} isLoading={false} />
            <SpendingTimelineChart data={spendingTimeline} isLoading={false} />
          </div>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <BudgetSummaryCards
            stats={stats}
            isLoading={false}
            onFilterChange={handleFilterChange}
          />
          {budgetFilter && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Showing {filteredBudgetItems.length} of {budgetItems?.length || 0} items
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBudgetFilter(null)}
                className="h-7 px-2 text-xs"
              >
                Clear filter
              </Button>
            </div>
          )}
          <BudgetItemsTable
            items={filteredBudgetItems}
            isLoading={false}
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <BudgetSummaryCards
            stats={stats}
            isLoading={false}
            onFilterChange={handleFilterChange}
          />
          {budgetFilter && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Showing {filteredBudgetItems.length} of {budgetItems?.length || 0} items
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBudgetFilter(null)}
                className="h-7 px-2 text-xs"
              >
                Clear filter
              </Button>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <CategoryBreakdown data={categoryBreakdown} isLoading={false} />
            <SpendingTimelineChart data={spendingTimeline} isLoading={false} />
          </div>
        </TabsContent>
      </Tabs>

      <BudgetItemDialog
        open={budgetDialogOpen}
        onOpenChange={setBudgetDialogOpen}
        item={editingItem}
        weddingId={weddingId}
      />
    </div>
  );
}
