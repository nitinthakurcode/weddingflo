'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RecentBookingsWidgetProps {
  className?: string;
}

export function RecentBookingsWidget({ className }: RecentBookingsWidgetProps) {
  // Placeholder data - would come from API in production
  const bookings = [
    { id: '1', name: 'Sarah & James', date: '2026-03-15', guests: 150, status: 'confirmed' },
    { id: '2', name: 'Emily & Michael', date: '2026-04-20', guests: 200, status: 'pending' },
    { id: '3', name: 'Jessica & David', date: '2026-05-10', guests: 80, status: 'confirmed' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

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
          {bookings.map((booking) => (
            <div key={booking.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{booking.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {booking.guests} guests
                </p>
              </div>
              <div className="text-right">
                <Badge className={getStatusColor(booking.status)} variant="secondary">
                  {booking.status}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(booking.date).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
