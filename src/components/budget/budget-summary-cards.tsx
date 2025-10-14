'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BudgetStats } from '@/types/budget';
import { formatCurrency } from '@/lib/budget-calculations';
import { DollarSign, TrendingDown, TrendingUp, Wallet, Filter } from 'lucide-react';

interface BudgetSummaryCardsProps {
  stats: BudgetStats;
  isLoading?: boolean;
  onFilterChange?: (filter: string | null) => void;
}

export function BudgetSummaryCards({ stats, isLoading, onFilterChange }: BudgetSummaryCardsProps) {
  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-green-600';
    if (variance < 0) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (variance < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return null;
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Budget',
      value: formatCurrency(stats.totalBudget),
      icon: DollarSign,
      description: `${stats.itemCount} budget items`,
      filter: 'all',
    },
    {
      title: 'Total Spent',
      value: formatCurrency(stats.totalSpent),
      icon: Wallet,
      description: `${formatCurrency(stats.totalPaid)} paid`,
      filter: 'spent',
    },
    {
      title: 'Remaining',
      value: formatCurrency(stats.totalRemaining),
      icon: TrendingUp,
      description: stats.totalBudget > 0
        ? `${((stats.totalRemaining / stats.totalBudget) * 100).toFixed(1)}% of budget`
        : 'No budget set',
      filter: 'remaining',
    },
    {
      title: 'Variance',
      value: `${stats.variance >= 0 ? '+' : ''}${formatCurrency(stats.variance)}`,
      icon: null,
      customIcon: getVarianceIcon(stats.variance),
      description: `${stats.variance >= 0 ? 'Under budget' : 'Over budget'} by ${Math.abs(stats.variancePercentage).toFixed(1)}%`,
      valueColor: getVarianceColor(stats.variance),
      filter: stats.variance < 0 ? 'overbudget' : 'all',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className={onFilterChange && card.filter
            ? "cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] active:scale-100 active:shadow-sm touch-manipulation select-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            : "opacity-75 border-dashed"}
          onClick={(e) => {
            if (card.filter && onFilterChange) {
              e.stopPropagation();
              onFilterChange(card.filter);
            }
          }}
          role={onFilterChange && card.filter ? "button" : undefined}
          tabIndex={onFilterChange && card.filter ? 0 : undefined}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && card.filter && onFilterChange) {
              e.preventDefault();
              onFilterChange(card.filter);
            }
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pointer-events-none">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              {card.title}
              {onFilterChange && card.filter && (
                <Filter className="h-3 w-3 text-blue-500" />
              )}
            </CardTitle>
            {card.customIcon ? card.customIcon : card.icon && <card.icon className="h-4 w-4 text-muted-foreground" />}
          </CardHeader>
          <CardContent className="pointer-events-none">
            <div className={`text-2xl font-bold ${card.valueColor || ''}`}>
              {card.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
