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
      textColor: '#1e1b4b', // Indigo-950
      bgColor: '#e0e7ff', // Indigo-100
      iconBgStyle: { background: 'linear-gradient(to bottom right, #4f46e5, #6366f1)' }, // Indigo gradient
      borderColor: '#a5b4fc', // Indigo-300
      filter: 'all',
    },
    {
      title: 'Delivered',
      value: stats.deliveredGifts,
      icon: Package,
      description: `${stats.deliveredGifts} of ${stats.totalGifts} delivered`,
      textColor: '#064e3b', // Emerald-900
      bgColor: '#d1fae5', // Emerald-100
      iconBgStyle: { background: 'linear-gradient(to bottom right, #10b981, #059669)' }, // Emerald gradient
      borderColor: '#a7f3d0', // Emerald-200
      filter: 'delivered',
    },
    {
      title: 'Thank Yous Sent',
      value: stats.thankYousSent,
      icon: Mail,
      description: `${stats.totalGifts - stats.thankYousSent} pending`,
      textColor: '#78350f', // Amber-900
      bgColor: '#fef3c7', // Amber-100
      iconBgStyle: { background: 'linear-gradient(to bottom right, #d97706, #f59e0b)' }, // Amber gradient
      borderColor: '#fde68a', // Amber-200
      filter: 'thankyou_sent',
    },
    {
      title: 'Total Value',
      value: formatCurrency(stats.totalValue),
      icon: DollarSign,
      description: 'Estimated value',
      textColor: '#500724', // Pink-950
      bgColor: '#fce7f3', // Pink-100
      iconBgStyle: { background: 'linear-gradient(to bottom right, #db2777, #ec4899)' }, // Pink gradient
      borderColor: '#fbcfe8', // Pink-200
      filter: 'all',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsData.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.title}
            className={`overflow-hidden border-2 backdrop-blur-sm shadow-lg hover:shadow-2xl ${
              onFilterChange && stat.filter
                ? "cursor-pointer transition-all hover:scale-[1.03] hover:-translate-y-1 active:scale-100 touch-manipulation select-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                : "opacity-90"
            }`}
            style={{
              backgroundColor: stat.bgColor,
              borderColor: stat.borderColor,
            }}
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
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                {stat.title}
                {onFilterChange && stat.filter && (
                  <Filter className="h-3 w-3 text-primary animate-pulse" />
                )}
              </CardTitle>
              <div className="p-2.5 rounded-xl shadow-lg shadow-black/20" style={stat.iconBgStyle}>
                <Icon className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pointer-events-none">
              <div className="text-3xl font-bold tracking-tight" style={{ color: stat.textColor }}>
                {isLoading ? (
                  <div className="h-8 w-20 animate-pulse bg-muted rounded" />
                ) : (
                  stat.value
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
