'use client';

import { Hotel, Building2, Bed, Users, CheckCircle, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HotelStats } from '@/types/hotel';

interface HotelStatsCardsProps {
  stats: HotelStats;
  isLoading?: boolean;
  onFilterChange?: (filter: string | null) => void;
}

export function HotelStatsCards({ stats, isLoading, onFilterChange }: HotelStatsCardsProps) {
  const cards = [
    {
      title: 'Total Hotels',
      value: stats.total_hotels || 0,
      icon: Building2,
      description: 'Hotels booked',
      filter: 'all',
    },
    {
      title: 'Total Rooms',
      value: stats.total_rooms_booked || 0,
      icon: Bed,
      description: 'Rooms reserved',
      filter: 'all',
    },
    {
      title: 'Guests Accommodated',
      value: stats.total_guests_accommodated || 0,
      icon: Users,
      description: 'Guests with rooms',
      filter: 'accommodated',
    },
    {
      title: 'Occupancy Rate',
      value: `${isNaN(stats.occupancy_rate) ? 0 : stats.occupancy_rate.toFixed(0)}%`,
      icon: Hotel,
      description: 'Room utilization',
      filter: 'all',
    },
    {
      title: 'Pending Bookings',
      value: stats.pending_bookings || 0,
      icon: Hotel,
      description: 'Awaiting confirmation',
      className: 'text-yellow-600',
      filter: 'pending',
    },
    {
      title: 'Confirmed',
      value: stats.confirmed_bookings || 0,
      icon: CheckCircle,
      description: 'Confirmed bookings',
      className: 'text-green-600',
      filter: 'confirmed',
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
