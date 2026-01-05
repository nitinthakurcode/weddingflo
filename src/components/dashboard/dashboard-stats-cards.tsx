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
  // Theme-aware colors using CSS variables from design tokens
  const cards = [
    {
      title: 'Total Guests',
      value: stats.totalGuests,
      icon: Users,
      description: 'All guests',
      textColor: 'var(--cobalt-900, #172554)',
      bgColor: 'var(--cobalt-50, #EFF6FF)',
      iconBgStyle: { background: 'linear-gradient(to bottom right, var(--cobalt-500, #2563EB), var(--cobalt-400, #60A5FA))' },
      borderColor: 'var(--cobalt-200, #BFDBFE)',
      filter: 'guests',
    },
    {
      title: 'Confirmed RSVPs',
      value: stats.confirmedGuests,
      icon: CheckCircle,
      description: 'Form submitted',
      textColor: 'var(--sage-900, #283F22)',
      bgColor: 'var(--sage-50, #F6F9F4)',
      iconBgStyle: { background: 'linear-gradient(to bottom right, var(--sage-500, #5A9A49), var(--sage-400, #7BAF6B))' },
      borderColor: 'var(--sage-200, #D1E2C8)',
      filter: 'confirmed',
    },
    {
      title: 'Budget Spent',
      value: `${stats.budgetSpentPercentage.toFixed(0)}%`,
      icon: DollarSign,
      description: 'Of total budget',
      textColor: 'var(--rose-900, #4C0519)',
      bgColor: 'var(--rose-50, #FFF5F6)',
      iconBgStyle: { background: 'linear-gradient(to bottom right, var(--rose-500, #E11D48), var(--rose-400, #FB7185))' },
      borderColor: 'var(--rose-200, #FECDD3)',
      filter: 'budget',
    },
    {
      title: 'Days Until Wedding',
      value: stats.daysUntilWedding > 0 ? stats.daysUntilWedding : 'Today!',
      icon: Calendar,
      description: stats.daysUntilWedding > 0 ? 'Days remaining' : 'Wedding day',
      textColor: 'var(--gold-900, #5F4C1C)',
      bgColor: 'var(--gold-50, #FFFEF7)',
      iconBgStyle: { background: 'linear-gradient(to bottom right, var(--gold-600, #B8923E), var(--gold-400, #FACC15))' },
      borderColor: 'var(--gold-200, #FEF9C3)',
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
