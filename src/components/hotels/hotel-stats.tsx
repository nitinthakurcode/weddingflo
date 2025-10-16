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
      textColor: '#1e1b4b', // Indigo-950
      bgColor: '#e0e7ff', // Indigo-100
      iconBgStyle: { background: 'linear-gradient(to bottom right, #4f46e5, #6366f1)' }, // Indigo gradient
      borderColor: '#a5b4fc', // Indigo-300
      filter: 'all',
    },
    {
      title: 'Total Rooms',
      value: stats.total_rooms_booked || 0,
      icon: Bed,
      description: 'Rooms reserved',
      textColor: '#500724', // Pink-950
      bgColor: '#fce7f3', // Pink-100
      iconBgStyle: { background: 'linear-gradient(to bottom right, #db2777, #ec4899)' }, // Pink gradient
      borderColor: '#fbcfe8', // Pink-200
      filter: 'all',
    },
    {
      title: 'Guests Accommodated',
      value: stats.total_guests_accommodated || 0,
      icon: Users,
      description: 'Guests with rooms',
      textColor: '#78350f', // Amber-900
      bgColor: '#fef3c7', // Amber-100
      iconBgStyle: { background: 'linear-gradient(to bottom right, #d97706, #f59e0b)' }, // Amber gradient
      borderColor: '#fde68a', // Amber-200
      filter: 'accommodated',
    },
    {
      title: 'Occupancy Rate',
      value: `${isNaN(stats.occupancy_rate) ? 0 : stats.occupancy_rate.toFixed(0)}%`,
      icon: Hotel,
      description: 'Room utilization',
      textColor: '#581c87', // Purple-900
      bgColor: '#f3e8ff', // Purple-100
      iconBgStyle: { background: 'linear-gradient(to bottom right, #9333ea, #a855f7)' }, // Purple gradient
      borderColor: '#e9d5ff', // Purple-200
      filter: 'all',
    },
    {
      title: 'Pending Bookings',
      value: stats.pending_bookings || 0,
      icon: Hotel,
      description: 'Awaiting confirmation',
      textColor: '#0c4a6e', // Sky-900
      bgColor: '#e0f2fe', // Sky-100
      iconBgStyle: { background: 'linear-gradient(to bottom right, #0ea5e9, #0284c7)' }, // Sky gradient
      borderColor: '#bae6fd', // Sky-200
      filter: 'pending',
    },
    {
      title: 'Confirmed',
      value: stats.confirmed_bookings || 0,
      icon: CheckCircle,
      description: 'Confirmed bookings',
      textColor: '#064e3b', // Emerald-900
      bgColor: '#d1fae5', // Emerald-100
      iconBgStyle: { background: 'linear-gradient(to bottom right, #10b981, #059669)' }, // Emerald gradient
      borderColor: '#a7f3d0', // Emerald-200
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
            className={`overflow-hidden border-2 backdrop-blur-sm shadow-lg hover:shadow-2xl ${
              onFilterChange && card.filter
                ? "cursor-pointer transition-all hover:scale-[1.03] hover:-translate-y-1 active:scale-100 touch-manipulation select-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                : "opacity-90"
            }`}
            style={{
              backgroundColor: card.bgColor,
              borderColor: card.borderColor,
            }}
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
              <div className="text-3xl font-bold tracking-tight" style={{ color: card.textColor }}>{card.value}</div>
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
