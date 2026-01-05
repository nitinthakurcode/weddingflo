'use client';

import { Users, UserCheck, CheckCircle2, Hotel, Clock, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { GuestStats } from '@/types/guest';
import { STAT_CARD_COLORS } from '@/lib/theme/stat-colors';

interface GuestStatsCardsProps {
  stats: GuestStats;
  isLoading?: boolean;
  onFilterChange?: (filter: string | null) => void;
}

export function GuestStatsCards({ stats, isLoading, onFilterChange }: GuestStatsCardsProps) {
  const cards = [
    {
      title: 'Total Guests',
      value: stats.total,
      icon: Users,
      description: 'All guests in the list',
      ...STAT_CARD_COLORS.primary, // Teal
      filter: 'all',
    },
    {
      title: 'Invited',
      value: stats.invited,
      icon: UserCheck,
      description: 'Invitations sent',
      ...STAT_CARD_COLORS.danger, // Rose for romance
      filter: 'invited',
    },
    {
      title: 'Confirmed',
      value: stats.confirmed,
      icon: CheckCircle2,
      description: 'Form submitted',
      ...STAT_CARD_COLORS.warning, // Gold for celebration
      filter: 'confirmed',
    },
    {
      title: 'Checked In',
      value: stats.checkedIn,
      icon: CheckCircle2,
      description: 'Already arrived',
      ...STAT_CARD_COLORS.success, // Sage for success
      filter: 'checked_in',
    },
    {
      title: 'Accommodation',
      value: stats.accommodationNeeded,
      icon: Hotel,
      description: 'Need hotel rooms',
      ...STAT_CARD_COLORS.info, // Cobalt for info
      filter: 'accommodation',
    },
    {
      title: 'Pending',
      value: stats.pending,
      icon: Clock,
      description: 'Awaiting response',
      ...STAT_CARD_COLORS.neutral, // Mocha for neutral
      filter: 'pending',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[...Array(6)].map((_, i) => (
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
              <div className="h-8 w-16 animate-pulse bg-muted rounded mb-1" />
              <div className="h-3 w-20 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={index}
            variant="glass"
            size="compact"
            className={`group overflow-hidden border ${card.borderColor} shadow-lg ${card.shadowColor} hover:shadow-xl bg-gradient-to-br ${card.gradientBg} ${
              onFilterChange && card.filter
                ? "cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 active:scale-100 touch-manipulation select-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                : "opacity-90 transition-all duration-300"
            }`}
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
