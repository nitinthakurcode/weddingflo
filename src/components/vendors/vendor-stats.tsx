'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Building2, CheckCircle, DollarSign, CreditCard, AlertCircle, Filter } from 'lucide-react';
import { STAT_CARD_COLORS } from '@/lib/theme/stat-colors';

interface VendorStatsProps {
  stats: {
    totalVendors: number;
    confirmedVendors: number;
    totalValue: number;
    totalPaid: number;
    totalOutstanding: number;
  };
  isLoading?: boolean;
  onFilterChange?: (filter: string | null) => void;
}

export function VendorStats({ stats, isLoading, onFilterChange }: VendorStatsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const statsData = [
    {
      title: 'Total Vendors',
      value: stats.totalVendors,
      icon: Building2,
      description: 'All vendors',
      ...STAT_CARD_COLORS.primary, // Teal
      filter: 'all',
    },
    {
      title: 'Confirmed',
      value: stats.confirmedVendors,
      icon: CheckCircle,
      description: `${stats.confirmedVendors} of ${stats.totalVendors} confirmed`,
      ...STAT_CARD_COLORS.success, // Sage
      filter: 'confirmed',
    },
    {
      title: 'Total Value',
      value: formatCurrency(stats.totalValue),
      icon: DollarSign,
      description: 'Total contract value',
      ...STAT_CARD_COLORS.danger, // Rose
      filter: 'all',
    },
    {
      title: 'Total Paid',
      value: formatCurrency(stats.totalPaid),
      icon: CreditCard,
      description: 'Amount paid so far',
      ...STAT_CARD_COLORS.warning, // Gold
      filter: 'paid',
    },
    {
      title: 'Outstanding',
      value: formatCurrency(stats.totalOutstanding),
      icon: AlertCircle,
      description: 'Remaining to pay',
      ...(stats.totalOutstanding > 0 ? STAT_CARD_COLORS.warning : STAT_CARD_COLORS.success), // Gold or Sage
      filter: 'outstanding',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
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
              <div className="h-8 w-20 animate-pulse bg-muted rounded mb-1" />
              <div className="h-3 w-24 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {statsData.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.title}
            variant="glass"
            size="compact"
            className={`group overflow-hidden border ${stat.borderColor} shadow-lg ${stat.shadowColor} hover:shadow-xl bg-gradient-to-br ${stat.gradientBg} ${
              onFilterChange && stat.filter
                ? "cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 active:scale-100 touch-manipulation select-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                : "opacity-90 transition-all duration-300"
            }`}
            onClick={(e) => {
              if (stat.filter && onFilterChange) {
                e.stopPropagation();
                onFilterChange(stat.filter);
              }
            }}
            role={onFilterChange && stat.filter ? "button" : undefined}
            tabIndex={onFilterChange && stat.filter ? 0 : undefined}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && stat.filter && onFilterChange) {
                e.preventDefault();
                onFilterChange(stat.filter);
              }
            }}
          >
            <CardContent className="p-3 sm:p-4 pointer-events-none">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-xl bg-gradient-to-br ${stat.iconGradient} shadow-lg shadow-black/20 group-hover:shadow-xl group-hover:scale-105 transition-all`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  {stat.title}
                  {onFilterChange && stat.filter && (
                    <Filter className="h-3 w-3 text-primary animate-pulse" />
                  )}
                </span>
              </div>
              <div className={`text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r ${stat.valueGradient} bg-clip-text text-transparent`}>
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
