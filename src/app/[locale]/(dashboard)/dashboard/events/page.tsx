'use client';

import { useState, useRef } from 'react';
import { useRouter } from '@/lib/navigation';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventCalendar } from '@/components/events/event-calendar';
import { EventStats } from '@/components/events/event-stats';
import { Event, EventStats as EventStatsType, EventType, EventStatus } from '@/types/event';
import { Calendar, List, ArrowRight } from 'lucide-react';
import { PageLoader } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function EventsPage() {
  const t = useTranslations('events');
  const tc = useTranslations('common');
  const { toast } = useToast();
  const router = useRouter();
  const { data: session } = useSession();
  const utils = trpc.useUtils();

  // Get current user via tRPC
  const { data: currentUser, isLoading: isLoadingUser } = trpc.users.getCurrent.useQuery(
    undefined,
    { enabled: !!session?.user?.id }
  );

  // Get ALL clients for the company via tRPC
  const { data: clients, isLoading: isLoadingClients } = trpc.clients.getAll.useQuery(
    undefined,
    { enabled: !!currentUser?.company_id }
  );

  // Fetch events for ALL clients
  const clientIds = clients?.map(c => c.id) || [];

  // Fetch events for each client
  const eventQueries = clientIds.map(clientId =>
    trpc.events.getAll.useQuery(
      { clientId },
      { enabled: !!clientId }
    )
  );

  const isLoadingEvents = eventQueries.some(q => q.isLoading);

  // Combine all events from all clients
  const allEventsData = eventQueries.flatMap(q => q.data || []);

  // Map events to Event type and include client information
  const events: (Event & { clientName: string; clientId: string })[] = allEventsData.map((evt) => {
    const client = clients?.find(c => c.id === evt.clientId);
    return {
      id: evt.id,
      _id: evt.id as any,
      _creationTime: new Date(evt.createdAt || new Date()).getTime(),
      company_id: '',
      client_id: evt.clientId,
      clientId: evt.clientId,
      clientName: client ? `${client.partner1FirstName} ${client.partner1LastName || ''}`.trim() : 'Unknown Client',
      event_name: evt.title,
      event_type: (evt.eventType || 'other') as EventType,
      event_date: evt.eventDate ? new Date(evt.eventDate).getTime() : Date.now(),
      event_start_time: evt.startTime || '',
      event_end_time: evt.endTime || '',
      event_status: (evt.status || 'draft') as EventStatus,
      venue_details: {
        name: evt.venueName || '',
        address: evt.address || '',
        city: '',
        state: '',
        country: '',
        capacity: 0,
      },
      estimated_guests: evt.guestCount || 0,
      description: evt.description || undefined,
      tags: [],
      created_at: evt.createdAt?.toISOString() || new Date().toISOString(),
      updated_at: evt.updatedAt?.toISOString() || new Date().toISOString(),
    };
  });

  // Sort events by date (upcoming first)
  const sortedEvents = [...events].sort((a, b) => a.event_date - b.event_date);

  // Calculate aggregate stats across ALL clients
  const stats: EventStatsType = {
    total: events.length,
    confirmed: events.filter((e) => e.event_status === 'confirmed').length,
    upcoming: events.filter((e) => e.event_date > Date.now()).length,
    completed: events.filter((e) => e.event_status === 'completed').length,
    this_month: events.filter((e) => {
      const eventMonth = new Date(e.event_date).getMonth();
      const currentMonth = new Date().getMonth();
      return eventMonth === currentMonth;
    }).length,
    total_guests: events.reduce((sum, e) => sum + e.estimated_guests, 0),
    total_budget: events.reduce((sum, e) => sum + (e.budget_allocated || 0), 0),
  };

  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [eventFilter, setEventFilter] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleFilterChange = (filter: string | null) => {
    setEventFilter(filter);
    if (filter) {
      setViewMode('list');
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  // Filter events based on the active filter
  const filteredEvents = (() => {
    if (!eventFilter) return sortedEvents;

    switch (eventFilter) {
      case 'all':
        return sortedEvents;
      case 'confirmed':
        return sortedEvents.filter((e) => e.event_status === 'confirmed');
      case 'upcoming':
        return sortedEvents.filter((e) => e.event_date > Date.now());
      case 'completed':
        return sortedEvents.filter((e) => e.event_status === 'completed');
      default:
        return sortedEvents;
    }
  })();

  const handleViewEvent = (event: Event) => {
    // Navigate to client's event detail page
    // Our events array includes clientId, so we can safely access it
    const eventWithClient = event as Event & { clientId: string };
    router.push(`/dashboard/clients/${eventWithClient.clientId}/events`);
  };

  const getStatusBadge = (status: EventStatus) => {
    const variants: Record<EventStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'outline',
      confirmed: 'default',
      completed: 'secondary',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    if (!time) return '-';
    return time;
  };

  // Loading state
  if (!session?.user || isLoadingUser) {
    return <PageLoader />;
  }

  // Not authenticated
  if (!currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">{t('authRequired')}</h2>
          <p className="text-muted-foreground mt-2">
            {t('signInToManage')}
          </p>
        </div>
      </div>
    );
  }

  // Loading clients and events
  if (isLoadingClients || isLoadingEvents) {
    return <PageLoader />;
  }

  // No clients found state
  if (!clients || clients.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center space-y-6">
          <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <Calendar className="w-12 h-12 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">All Events</h1>
            <p className="text-lg text-muted-foreground">No clients found</p>
          </div>
          <p className="text-muted-foreground max-w-md mx-auto">
            Create your first client to start managing wedding events.
          </p>
          <div className="pt-4">
            <Button
              size="lg"
              onClick={() => router.push('/dashboard/clients')}
              className="gap-2"
            >
              Add Client
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Hero section with gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-200 via-primary-100 to-secondary-200 p-6 sm:p-8 border-2 border-primary-300 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="relative space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white break-words">
              All Events
            </h2>
            <p className="text-sm sm:text-base text-primary-800 mt-1 break-words">
              View upcoming events across all clients
            </p>
          </div>
          <div className="sm:ml-4">
            <Button
              onClick={() => router.push('/dashboard/clients')}
              size="sm"
              variant="outline"
              className="w-full sm:w-auto bg-white/10 border-white/20 text-mocha-900 dark:text-mocha-100 hover:bg-white/20"
            >
              <span className="text-xs sm:text-sm">Manage by Client</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <EventStats stats={stats} onFilterChange={handleFilterChange} />

      {eventFilter && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Showing {filteredEvents.length} of {events.length} events
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEventFilter(null)}
            className="h-7 px-2 text-xs"
          >
            Clear filter
          </Button>
        </div>
      )}

      {/* View Toggle and Content */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'calendar' | 'list')}>
        <div ref={resultsRef} className="flex items-center justify-between mb-6">
          <TabsList className="grid w-full grid-cols-2 h-auto sm:w-auto sm:inline-flex">
            <TabsTrigger value="calendar" className="text-xs sm:text-sm py-2 flex items-center gap-1 sm:gap-2">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Calendar View</span>
              <span className="sm:hidden">Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="text-xs sm:text-sm py-2 flex items-center gap-1 sm:gap-2">
              <List className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">List View</span>
              <span className="sm:hidden">List</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="calendar" className="mt-0">
          <EventCalendar
            events={filteredEvents}
            onEventClick={handleViewEvent}
          />
        </TabsContent>

        <TabsContent value="list" className="mt-0">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 bg-muted/50 rounded-lg">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No events found</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Guests</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow key={event.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          {event.clientName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{event.event_name}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {event.event_type}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(event.event_date)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatTime(event.event_start_time)}
                          {event.event_end_time && ` - ${formatTime(event.event_end_time)}`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate">
                          {event.venue_details.name || '-'}
                        </div>
                      </TableCell>
                      <TableCell>{event.estimated_guests || '-'}</TableCell>
                      <TableCell>{getStatusBadge(event.event_status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewEvent(event)}
                        >
                          View
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
