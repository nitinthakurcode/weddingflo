'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Minus } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { Skeleton } from '@/components/ui/skeleton';

interface RevenueWidgetProps {
  className?: string;
}

export function RevenueWidget({ className }: RevenueWidgetProps) {
  // Fetch real clients data to calculate total budget (revenue potential)
  const { data: clients, isLoading } = trpc.clients.list.useQuery(
    { search: '' },
    { refetchOnWindowFocus: false }
  );

  // Calculate total budget from all clients as revenue indicator
  const totalBudget = clients?.reduce((sum, client) => {
    return sum + (Number(client.budget) || 0);
  }, 0) || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  const clientCount = clients?.length || 0;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {clientCount > 0 ? (
            <>
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500">{clientCount} active</span>
              <span>wedding{clientCount !== 1 ? 's' : ''}</span>
            </>
          ) : (
            <>
              <Minus className="h-3 w-3" />
              <span>No clients yet</span>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
