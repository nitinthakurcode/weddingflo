'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc/client';
import { Skeleton } from '@/components/ui/skeleton';

interface RecentBookingsWidgetProps {
  className?: string;
}

export function RecentBookingsWidget({ className }: RecentBookingsWidgetProps) {
  // Fetch real clients data from the database
  const { data: clients, isLoading } = trpc.clients.list.useQuery(
    { search: '' },
    { refetchOnWindowFocus: false }
  );

  // Get the 3 most recent bookings (by wedding date, upcoming first)
  const bookings = clients
    ?.filter((c) => c.weddingDate) // Only clients with wedding dates
    ?.sort((a, b) => {
      const dateA = new Date(a.weddingDate || 0).getTime();
      const dateB = new Date(b.weddingDate || 0).getTime();
      return dateA - dateB; // Earliest first
    })
    ?.filter((c) => new Date(c.weddingDate || 0).getTime() >= Date.now()) // Future weddings
    ?.slice(0, 3)
    ?.map((c) => ({
      id: c.id,
      name: c.partner2FirstName
        ? `${c.partner1FirstName} & ${c.partner2FirstName}`
        : c.partner1FirstName,
      date: c.weddingDate,
      guests: c.guestCount || 0,
      status: c.status || 'planning',
    })) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'planning':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Recent Bookings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="text-right space-y-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Upcoming Weddings
        </CardTitle>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 rounded-full bg-muted/50 mb-3">
              <Heart className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No upcoming weddings</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add your first client to get started
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{booking.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {booking.guests > 0 ? `${booking.guests} guests` : 'TBD guests'}
                  </p>
                </div>
                <div className="text-right">
                  <Badge className={getStatusColor(booking.status)} variant="secondary">
                    {booking.status}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {booking.date ? new Date(booking.date).toLocaleDateString() : 'Date TBD'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
