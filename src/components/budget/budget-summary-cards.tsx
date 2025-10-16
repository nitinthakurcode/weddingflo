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
    if (variance > 0) return 'text-emerald-600';
    if (variance < 0) return 'text-rose-600';
    return 'text-amber-600';
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingUp className="h-4 w-4 text-emerald-600" />;
    if (variance < 0) return <TrendingDown className="h-4 w-4 text-rose-600" />;
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
      textColor: '#1e1b4b', // Indigo-950
      bgColor: '#e0e7ff', // Indigo-100
      iconBgStyle: { background: 'linear-gradient(to bottom right, #4f46e5, #6366f1)' }, // Indigo gradient
      borderColor: '#a5b4fc', // Indigo-300
      filter: 'all',
    },
    {
      title: 'Total Spent',
      value: formatCurrency(stats.totalSpent),
      icon: Wallet,
      description: `${formatCurrency(stats.totalPaid)} paid`,
      textColor: '#500724', // Pink-950
      bgColor: '#fce7f3', // Pink-100
      iconBgStyle: { background: 'linear-gradient(to bottom right, #db2777, #ec4899)' }, // Pink gradient
      borderColor: '#fbcfe8', // Pink-200
      filter: 'spent',
    },
    {
      title: 'Remaining',
      value: formatCurrency(stats.totalRemaining),
      icon: TrendingUp,
      description: stats.totalBudget > 0
        ? `${((stats.totalRemaining / stats.totalBudget) * 100).toFixed(1)}% of budget`
        : 'No budget set',
      textColor: '#78350f', // Amber-900
      bgColor: '#fef3c7', // Amber-100
      iconBgStyle: { background: 'linear-gradient(to bottom right, #d97706, #f59e0b)' }, // Amber gradient
      borderColor: '#fde68a', // Amber-200
      filter: 'remaining',
    },
    {
      title: 'Variance',
      value: `${stats.variance >= 0 ? '+' : ''}${formatCurrency(stats.variance)}`,
      icon: stats.variance >= 0 ? TrendingUp : TrendingDown,
      customIcon: getVarianceIcon(stats.variance),
      description: `${stats.variance >= 0 ? 'Under budget' : 'Over budget'} by ${Math.abs(stats.variancePercentage).toFixed(1)}%`,
      textColor: stats.variance >= 0 ? '#064e3b' : '#7f1d1d', // Emerald-900 or Rose-900
      bgColor: stats.variance >= 0 ? '#d1fae5' : '#ffe4e6', // Emerald-100 or Rose-100
      iconBgStyle: { background: stats.variance >= 0 ? 'linear-gradient(to bottom right, #10b981, #059669)' : 'linear-gradient(to bottom right, #dc2626, #ea580c)' },
      borderColor: stats.variance >= 0 ? '#a7f3d0' : '#fecaca', // Emerald-200 or Rose-200
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
            className={`overflow-hidden border-2 backdrop-blur-sm shadow-lg hover:shadow-2xl ${
              onFilterChange && card.filter
                ? "cursor-pointer transition-all hover:scale-[1.03] hover:-translate-y-1 active:scale-100 touch-manipulation select-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                : "opacity-90"
            }`}
            style={{
              backgroundColor: card.bgColor,
              borderColor: card.borderColor,
            }}
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
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                {card.title}
                {onFilterChange && card.filter && (
                  <Filter className="h-3 w-3 text-primary animate-pulse" />
                )}
              </CardTitle>
              <div className="p-2.5 rounded-xl shadow-lg shadow-black/20" style={card.iconBgStyle}>
                {Icon && <Icon className="h-5 w-5 text-white" />}
              </div>
            </CardHeader>
            <CardContent className="pointer-events-none">
              <div className="text-3xl font-bold tracking-tight" style={{ color: card.textColor }}>
                {card.value}
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                {card.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
