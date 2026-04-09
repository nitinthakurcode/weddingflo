'use client';

import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react';
import { format, isAfter, isBefore, addDays } from 'date-fns';

export default function CalendarPage() {
  // Get all clients to show their events
  const { data: clients, isLoading: clientsLoading } = trpc.clients.list.useQuery({});

  if (clientsLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Calendar</h2>
          <p className="text-muted-foreground">
            View upcoming weddings and events across all clients
          </p>
        </div>
      </div>

      {/* Upcoming Weddings */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Upcoming Weddings</h3>
        {clients && clients.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clients
              .filter((c) => c.weddingDate)
              .sort((a, b) => {
                const dateA = a.weddingDate ? new Date(a.weddingDate).getTime() : 0;
                const dateB = b.weddingDate ? new Date(b.weddingDate).getTime() : 0;
                return dateA - dateB;
              })
              .map((client) => {
                const weddingDate = client.weddingDate ? new Date(client.weddingDate) : null;
                const isUpcoming = weddingDate && isAfter(weddingDate, new Date());
                const isSoon = weddingDate && isBefore(weddingDate, addDays(new Date(), 30));

                return (
                  <Card key={client.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {client.weddingName ||
                            `${client.partner1FirstName} & ${client.partner2FirstName || ''}`}
                        </CardTitle>
                        {isSoon && isUpcoming && (
                          <Badge variant="destructive" className="text-[10px]">Soon</Badge>
                        )}
                      </div>
                      {weddingDate && (
                        <CardDescription className="flex items-center gap-1.5">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          {format(weddingDate, 'PPP')}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      {client.venue && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {client.venue}
                        </p>
                      )}
                      <Badge
                        variant={isUpcoming ? 'default' : 'secondary'}
                        className="mt-2 text-[10px]"
                      >
                        {client.status || 'active'}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarIcon className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold mb-1">No events yet</h3>
              <p className="text-sm text-muted-foreground">
                Events will appear here when you add clients with wedding dates.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
