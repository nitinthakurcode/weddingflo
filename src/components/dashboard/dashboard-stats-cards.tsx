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
      iconColor: 'text-blue-600',
      iconBgColor: 'bg-blue-100',
      description: 'All guests',
      filter: 'guests',
    },
    {
      title: 'Confirmed RSVPs',
      value: stats.confirmedGuests,
      icon: CheckCircle,
      iconColor: 'text-green-600',
      iconBgColor: 'bg-green-100',
      description: 'Form submitted',
      filter: 'confirmed',
    },
    {
      title: 'Budget Spent',
      value: `${stats.budgetSpentPercentage.toFixed(0)}%`,
      icon: DollarSign,
      iconColor: 'text-orange-600',
      iconBgColor: 'bg-orange-100',
      description: 'Of total budget',
      filter: 'budget',
    },
    {
      title: 'Days Until Wedding',
      value: stats.daysUntilWedding > 0 ? stats.daysUntilWedding : 'Today!',
      icon: Calendar,
      iconColor: 'text-purple-600',
      iconBgColor: 'bg-purple-100',
      description: stats.daysUntilWedding > 0 ? 'Days remaining' : 'Wedding day',
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
            className={onFilterChange && card.filter
              ? "cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] active:scale-100 active:shadow-sm touch-manipulation select-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              : "opacity-75 border-dashed"}
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
            <CardContent className="p-3 sm:p-4 md:p-6 pointer-events-none">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate flex items-center gap-1">
                    {card.title}
                    {onFilterChange && card.filter && (
                      <Filter className="h-3 w-3 text-blue-500" />
                    )}
                  </p>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2 break-words">
                    {card.value}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.description}
                  </p>
                </div>
                <div className={cn('p-2 sm:p-3 rounded-full flex-shrink-0', card.iconBgColor)}>
                  <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6', card.iconColor)} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
