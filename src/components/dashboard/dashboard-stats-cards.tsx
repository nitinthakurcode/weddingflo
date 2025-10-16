'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CheckCircle, DollarSign, Calendar, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardStatsCardsProps {
  stats: {
    totalGuests: number;
    confirmedGuests: number;
    budgetSpentPercentage: number;
    daysUntilWedding: number;
  };
  isLoading?: boolean;
  onFilterChange?: (filter: string | null) => void;
}

export function DashboardStatsCards({ stats, isLoading, onFilterChange }: DashboardStatsCardsProps) {
  const cards = [
    {
      title: 'Total Guests',
      value: stats.totalGuests,
      icon: Users,
      description: 'All guests',
      textColor: '#1e1b4b', // Indigo-950
      bgColor: '#e0e7ff', // Indigo-100
      iconBgStyle: { background: 'linear-gradient(to bottom right, #4f46e5, #6366f1)' }, // Indigo gradient
      borderColor: '#a5b4fc', // Indigo-300
      filter: 'guests',
    },
    {
      title: 'Confirmed RSVPs',
      value: stats.confirmedGuests,
      icon: CheckCircle,
      description: 'Form submitted',
      textColor: '#064e3b', // Emerald-900
      bgColor: '#d1fae5', // Emerald-100
      iconBgStyle: { background: 'linear-gradient(to bottom right, #10b981, #059669)' }, // Emerald gradient
      borderColor: '#a7f3d0', // Emerald-200
      filter: 'confirmed',
    },
    {
      title: 'Budget Spent',
      value: `${stats.budgetSpentPercentage.toFixed(0)}%`,
      icon: DollarSign,
      description: 'Of total budget',
      textColor: '#500724', // Pink-950
      bgColor: '#fce7f3', // Pink-100
      iconBgStyle: { background: 'linear-gradient(to bottom right, #db2777, #ec4899)' }, // Pink gradient
      borderColor: '#fbcfe8', // Pink-200
      filter: 'budget',
    },
    {
      title: 'Days Until Wedding',
      value: stats.daysUntilWedding > 0 ? stats.daysUntilWedding : 'Today!',
      icon: Calendar,
      description: stats.daysUntilWedding > 0 ? 'Days remaining' : 'Wedding day',
      textColor: '#78350f', // Amber-900
      bgColor: '#fef3c7', // Amber-100
      iconBgStyle: { background: 'linear-gradient(to bottom right, #d97706, #f59e0b)' }, // Amber gradient
      borderColor: '#fde68a', // Amber-200
      filter: 'timeline',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="h-4 w-24 animate-pulse bg-muted rounded" />
              <div className="h-8 w-16 animate-pulse bg-muted rounded mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.title}
            className={cn(
              "overflow-hidden border-2 backdrop-blur-sm shadow-lg hover:shadow-2xl",
              onFilterChange && card.filter
                ? "cursor-pointer transition-all hover:scale-[1.03] hover:-translate-y-1 active:scale-100 touch-manipulation select-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                : "opacity-90"
            )}
            style={{
              backgroundColor: card.bgColor,
              borderColor: card.borderColor,
            }}
            onClick={(e) => {
              if (onFilterChange && card.filter) {
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
                <Icon className="h-5 w-5 text-white" />
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
