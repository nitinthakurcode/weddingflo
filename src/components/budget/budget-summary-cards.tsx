'use client';

import { Card, CardContent } from '@/components/ui/card';
import { BudgetStats } from '@/types/budget';
import { formatCurrency } from '@/lib/budget-calculations';
import { DollarSign, TrendingDown, TrendingUp, Wallet, Filter } from 'lucide-react';
import { STAT_CARD_COLORS } from '@/lib/theme/stat-colors';

interface BudgetSummaryCardsProps {
  stats: BudgetStats;
  isLoading?: boolean;
  onFilterChange?: (filter: string | null) => void;
}

export function BudgetSummaryCards({ stats, isLoading, onFilterChange }: BudgetSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card
            key={i}
            variant="glass"
            size="compact"
            className="border border-mocha-200/50 dark:border-mocha-800/30 shadow-lg"
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="h-8 w-8 animate-pulse bg-muted rounded-xl" />
                <div className="h-3 w-16 animate-pulse bg-muted rounded" />
              </div>
              <div className="h-8 w-24 animate-pulse bg-muted rounded mb-1" />
              <div className="h-3 w-20 animate-pulse bg-muted rounded" />
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
      ...STAT_CARD_COLORS.primary, // Teal
      filter: 'all',
    },
    {
      title: 'Total Spent',
      value: formatCurrency(stats.totalSpent),
      icon: Wallet,
      description: `${formatCurrency(stats.totalPaid)} paid`,
      ...STAT_CARD_COLORS.danger, // Rose for spending
      filter: 'spent',
    },
    {
      title: 'Remaining',
      value: formatCurrency(stats.totalRemaining),
      icon: TrendingUp,
      description: stats.totalBudget > 0
        ? `${((stats.totalRemaining / stats.totalBudget) * 100).toFixed(1)}% of budget`
        : 'No budget set',
      ...STAT_CARD_COLORS.warning, // Gold for remaining
      filter: 'remaining',
    },
    {
      title: 'Variance',
      value: `${stats.variance >= 0 ? '+' : ''}${formatCurrency(stats.variance)}`,
      icon: stats.variance >= 0 ? TrendingUp : TrendingDown,
      description: `${stats.variance >= 0 ? 'Under budget' : 'Over budget'} by ${Math.abs(stats.variancePercentage).toFixed(1)}%`,
      ...(stats.variance >= 0 ? STAT_CARD_COLORS.success : STAT_CARD_COLORS.danger), // Sage or Rose
      filter: stats.variance < 0 ? 'overbudget' : 'all',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.title}
            variant="glass"
            size="compact"
            className={`group overflow-hidden border ${card.borderColor} shadow-lg ${card.shadowColor} hover:shadow-xl bg-gradient-to-br ${card.gradientBg} ${
              onFilterChange && card.filter
                ? "cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 active:scale-100 touch-manipulation select-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                : "opacity-90 transition-all duration-300"
            }`}
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
            <CardContent className="p-3 sm:p-4 pointer-events-none">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-xl bg-gradient-to-br ${card.iconGradient} shadow-lg shadow-black/20 group-hover:shadow-xl group-hover:scale-105 transition-all`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  {card.title}
                  {onFilterChange && card.filter && (
                    <Filter className="h-3 w-3 text-primary animate-pulse" />
                  )}
                </span>
              </div>
              <div className={`text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r ${card.valueGradient} bg-clip-text text-transparent`}>
                {card.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {card.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
