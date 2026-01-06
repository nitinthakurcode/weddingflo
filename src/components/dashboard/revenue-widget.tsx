'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp } from 'lucide-react';

interface RevenueWidgetProps {
  className?: string;
}

export function RevenueWidget({ className }: RevenueWidgetProps) {
  // Placeholder data - would come from API in production
  const revenue = {
    total: 125000,
    change: 12.5,
    currency: 'USD',
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: revenue.currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(revenue.total)}</div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-green-500" />
          <span className="text-green-500">+{revenue.change}%</span>
          <span>from last month</span>
        </p>
      </CardContent>
    </Card>
  );
}
