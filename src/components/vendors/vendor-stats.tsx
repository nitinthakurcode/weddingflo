'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, CheckCircle, DollarSign, CreditCard, AlertCircle, Filter } from 'lucide-react';

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
      textColor: '#3730a3',
      bgColor: '#e0e7ff',
      iconBgStyle: { background: 'linear-gradient(to bottom right, #4f46e5, #6366f1)' },
      borderColor: '#c7d2fe',
      filter: 'all',
    },
    {
      title: 'Confirmed',
      value: stats.confirmedVendors,
      icon: CheckCircle,
      description: `${stats.confirmedVendors} of ${stats.totalVendors} confirmed`,
      textColor: '#064e3b',
      bgColor: '#d1fae5',
      iconBgStyle: { background: 'linear-gradient(to bottom right, #10b981, #059669)' },
      borderColor: '#a7f3d0',
      filter: 'confirmed',
    },
    {
      title: 'Total Value',
      value: formatCurrency(stats.totalValue),
      icon: DollarSign,
      description: 'Total contract value',
      textColor: '#831843',
      bgColor: '#fce7f3',
      iconBgStyle: { background: 'linear-gradient(to bottom right, #db2777, #ec4899)' },
      borderColor: '#fbcfe8',
      filter: 'all',
    },
    {
      title: 'Total Paid',
      value: formatCurrency(stats.totalPaid),
      icon: CreditCard,
      description: 'Amount paid so far',
      textColor: '#78350f',
      bgColor: '#fef3c7',
      iconBgStyle: { background: 'linear-gradient(to bottom right, #d97706, #f59e0b)' },
      borderColor: '#fde68a',
      filter: 'paid',
    },
    {
      title: 'Outstanding Balance',
      value: formatCurrency(stats.totalOutstanding),
      icon: AlertCircle,
      description: 'Remaining to pay',
      textColor: stats.totalOutstanding > 0 ? '#c2410c' : '#064e3b',
      bgColor: stats.totalOutstanding > 0 ? '#fed7aa' : '#d1fae5',
      iconBgStyle: { background: stats.totalOutstanding > 0 ? 'linear-gradient(to bottom right, #ea580c, #f97316)' : 'linear-gradient(to bottom right, #10b981, #059669)' },
      borderColor: stats.totalOutstanding > 0 ? '#fdba74' : '#a7f3d0',
      filter: 'outstanding',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {statsData.map((stat) => (
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
              <stat.icon className="h-5 w-5 text-white" />
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
      ))}
    </div>
  );
}
