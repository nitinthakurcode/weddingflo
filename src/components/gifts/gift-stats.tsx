'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, Package, Mail, DollarSign, Filter } from 'lucide-react';

interface GiftStatsProps {
  stats: {
    totalGifts: number;
    deliveredGifts: number;
    thankYousSent: number;
    totalValue: number;
  };
  isLoading?: boolean;
  onFilterChange?: (filter: string | null) => void;
}

export function GiftStats({ stats, isLoading, onFilterChange }: GiftStatsProps) {
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
      title: 'Total Gifts',
      value: stats.totalGifts,
      icon: Gift,
      description: 'All gifts received',
      color: 'text-blue-600',
      filter: 'all',
    },
    {
      title: 'Delivered',
      value: stats.deliveredGifts,
      icon: Package,
      description: `${stats.deliveredGifts} of ${stats.totalGifts} delivered`,
      color: 'text-green-600',
      filter: 'delivered',
    },
    {
      title: 'Thank Yous Sent',
      value: stats.thankYousSent,
      icon: Mail,
      description: `${stats.totalGifts - stats.thankYousSent} pending`,
      color: 'text-purple-600',
      filter: 'thankyou_sent',
    },
    {
      title: 'Total Value',
      value: formatCurrency(stats.totalValue),
      icon: DollarSign,
      description: 'Estimated value',
      color: 'text-emerald-600',
      filter: 'all',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsData.map((stat) => (
        <Card
          key={stat.title}
          className={onFilterChange && stat.filter
            ? "cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] active:scale-100 active:shadow-sm touch-manipulation select-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            : "opacity-75 border-dashed"}
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pointer-events-none">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              {stat.title}
              {onFilterChange && stat.filter && (
                <Filter className="h-3 w-3 text-blue-500" />
              )}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent className="pointer-events-none">
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-8 w-20 animate-pulse bg-muted rounded" />
              ) : (
                stat.value
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
