'use client';

import { Users, UserCheck, CheckCircle2, Hotel, Clock, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GuestStats } from '@/types/guest';

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
      filter: 'all',
    },
    {
      title: 'Invited',
      value: stats.invited,
      icon: UserCheck,
      description: 'Invitations sent',
      filter: 'invited',
    },
    {
      title: 'Confirmed',
      value: stats.confirmed,
      icon: CheckCircle2,
      description: 'Form submitted',
      filter: 'confirmed',
    },
    {
      title: 'Checked In',
      value: stats.checked_in,
      icon: CheckCircle2,
      description: 'Already arrived',
      className: 'text-green-600',
      filter: 'checked_in',
    },
    {
      title: 'Accommodation',
      value: stats.accommodation_needed,
      icon: Hotel,
      description: 'Need hotel rooms',
      filter: 'accommodation',
    },
    {
      title: 'Pending',
      value: stats.pending,
      icon: Clock,
      description: 'Awaiting response',
      filter: 'pending',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 w-24 animate-pulse bg-muted rounded" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 animate-pulse bg-muted rounded" />
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pointer-events-none">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                {card.title}
                {onFilterChange && card.filter && (
                  <Filter className="h-3 w-3 text-blue-500" />
                )}
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.className || 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent className="pointer-events-none">
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
