'use client';

import { Hotel, Building2, Bed, Users, CheckCircle, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HotelStats } from '@/types/hotel';

/**
 * Hotel Stats Theme Colors
 * Uses WeddingFlo design tokens with fallback hex values
 * Colors mapped to semantic hotel stat categories
 */
const HOTEL_STAT_COLORS = {
  // Total Hotels - Cobalt/Info theme
  totalHotels: {
    text: 'var(--cobalt-900, #1e3a5f)',
    bg: 'var(--cobalt-100, #dbeafe)',
    iconGradient: 'linear-gradient(to bottom right, var(--cobalt-500, #3B82F6), var(--cobalt-400, #60a5fa))',
    border: 'var(--cobalt-300, #93c5fd)',
  },
  // Total Rooms - Rose theme
  totalRooms: {
    text: 'var(--rose-900, #4c0519)',
    bg: 'var(--rose-100, #ffe4e6)',
    iconGradient: 'linear-gradient(to bottom right, var(--rose-500, #E11D48), var(--rose-400, #fb7185))',
    border: 'var(--rose-200, #fecdd3)',
  },
  // Guests Accommodated - Gold/Warning theme
  guestsAccommodated: {
    text: 'var(--gold-900, #713f12)',
    bg: 'var(--gold-100, #fef3c7)',
    iconGradient: 'linear-gradient(to bottom right, var(--gold-500, #D4A853), var(--gold-400, #FACC15))',
    border: 'var(--gold-200, #fde68a)',
  },
  // Occupancy Rate - Teal/Primary theme
  occupancyRate: {
    text: 'var(--teal-900, #134e4a)',
    bg: 'var(--teal-100, #ccfbf1)',
    iconGradient: 'linear-gradient(to bottom right, var(--teal-500, #14B8A6), var(--teal-400, #2dd4bf))',
    border: 'var(--teal-200, #99f6e4)',
  },
  // Pending Bookings - Mocha/Neutral theme
  pendingBookings: {
    text: 'var(--mocha-900, #3D3027)',
    bg: 'var(--mocha-100, #F5F0EB)',
    iconGradient: 'linear-gradient(to bottom right, var(--mocha-500, #8B7355), var(--mocha-400, #B8A089))',
    border: 'var(--mocha-200, #D4C4B5)',
  },
  // Confirmed Bookings - Sage/Success theme
  confirmedBookings: {
    text: 'var(--sage-900, #1a2e1a)',
    bg: 'var(--sage-100, #dcfce7)',
    iconGradient: 'linear-gradient(to bottom right, var(--sage-500, #739574), var(--sage-400, #8fb38f))',
    border: 'var(--sage-200, #bbf7d0)',
  },
} as const;

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
      textColor: HOTEL_STAT_COLORS.totalHotels.text,
      bgColor: HOTEL_STAT_COLORS.totalHotels.bg,
      iconBgStyle: { background: HOTEL_STAT_COLORS.totalHotels.iconGradient },
      borderColor: HOTEL_STAT_COLORS.totalHotels.border,
      filter: 'all',
    },
    {
      title: 'Total Rooms',
      value: stats.total_rooms_booked || 0,
      icon: Bed,
      description: 'Rooms reserved',
      textColor: HOTEL_STAT_COLORS.totalRooms.text,
      bgColor: HOTEL_STAT_COLORS.totalRooms.bg,
      iconBgStyle: { background: HOTEL_STAT_COLORS.totalRooms.iconGradient },
      borderColor: HOTEL_STAT_COLORS.totalRooms.border,
      filter: 'all',
    },
    {
      title: 'Guests Accommodated',
      value: stats.total_guests_accommodated || 0,
      icon: Users,
      description: 'Guests with rooms',
      textColor: HOTEL_STAT_COLORS.guestsAccommodated.text,
      bgColor: HOTEL_STAT_COLORS.guestsAccommodated.bg,
      iconBgStyle: { background: HOTEL_STAT_COLORS.guestsAccommodated.iconGradient },
      borderColor: HOTEL_STAT_COLORS.guestsAccommodated.border,
      filter: 'accommodated',
    },
    {
      title: 'Occupancy Rate',
      value: `${isNaN(stats.occupancy_rate) ? 0 : stats.occupancy_rate.toFixed(0)}%`,
      icon: Hotel,
      description: 'Room utilization',
      textColor: HOTEL_STAT_COLORS.occupancyRate.text,
      bgColor: HOTEL_STAT_COLORS.occupancyRate.bg,
      iconBgStyle: { background: HOTEL_STAT_COLORS.occupancyRate.iconGradient },
      borderColor: HOTEL_STAT_COLORS.occupancyRate.border,
      filter: 'all',
    },
    {
      title: 'Pending Bookings',
      value: stats.pending_bookings || 0,
      icon: Hotel,
      description: 'Awaiting confirmation',
      textColor: HOTEL_STAT_COLORS.pendingBookings.text,
      bgColor: HOTEL_STAT_COLORS.pendingBookings.bg,
      iconBgStyle: { background: HOTEL_STAT_COLORS.pendingBookings.iconGradient },
      borderColor: HOTEL_STAT_COLORS.pendingBookings.border,
      filter: 'pending',
    },
    {
      title: 'Confirmed',
      value: stats.confirmed_bookings || 0,
      icon: CheckCircle,
      description: 'Confirmed bookings',
      textColor: HOTEL_STAT_COLORS.confirmedBookings.text,
      bgColor: HOTEL_STAT_COLORS.confirmedBookings.bg,
      iconBgStyle: { background: HOTEL_STAT_COLORS.confirmedBookings.iconGradient },
      borderColor: HOTEL_STAT_COLORS.confirmedBookings.border,
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
