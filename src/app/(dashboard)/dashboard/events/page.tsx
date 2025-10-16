'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventDialog } from '@/components/events/event-dialog';
import { EventList } from '@/components/events/event-list';
import { EventCalendar } from '@/components/events/event-calendar';
import { EventStats } from '@/components/events/event-stats';
import { VenueInfoSheet } from '@/components/events/venue-info-sheet';
import { Event, EventStats as EventStatsType } from '@/types/event';
import { Plus, Calendar, List } from 'lucide-react';
import { EventFormValues } from '@/lib/validations/event.schema';
import { PageLoader } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { Id } from '@/convex/_generated/dataModel';

export default function EventsPage() {
  const { toast } = useToast();

  // Get current user and their clients
  const currentUser = useQuery(api.users.getCurrent);
  const clients = useQuery(
    api.clients.list,
    currentUser?.company_id ? { companyId: currentUser.company_id } : 'skip'
  );

  // Use first client for now
  const selectedClient = clients?.[0];
  const clientId = selectedClient?._id;

  // Fetch event briefs
  const rawEvents = useQuery(api.eventBrief.list, clientId ? { clientId } : 'skip');

  // Map to Event type
  const events: Event[] = (rawEvents || []).map((evt) => ({
    _id: evt._id as any as Id<'events'>,
    _creationTime: evt._creationTime,
    company_id: evt.company_id,
    client_id: evt.client_id,
    event_name: evt.event_name,
    event_type: evt.event_type as any,
    event_date: evt.date,
    event_start_time: evt.start_time,
    event_end_time: evt.end_time,
    event_status: 'confirmed' as const,
    venue_details: {
      name: evt.venue,
      address: evt.venue_address || '',
      city: '',
      state: '',
      country: '',
      capacity: evt.venue_capacity,
      lat: evt.venue_coordinates?.lat,
      lng: evt.venue_coordinates?.lng,
    },
    estimated_guests: evt.venue_capacity || 0,
    description: evt.activity_description,
    tags: [],
    created_at: evt.created_at,
    updated_at: evt.updated_at,
  }));

  // Calculate stats
  const stats: EventStatsType = {
    total: events.length,
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

  const createEvent = useMutation(api.eventBrief.create);
  const updateEvent = useMutation(api.eventBrief.update);
  const deleteEventBrief = useMutation(api.eventBrief.deleteEventBrief);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isVenueSheetOpen, setIsVenueSheetOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | undefined>();
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [eventFilter, setEventFilter] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleFilterChange = (filter: string | null) => {
    setEventFilter(filter);
    // Switch to list view when filtering for better visibility
    if (filter) {
      setViewMode('list');
      // Scroll to results on mobile after a short delay to allow tab switch
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  // Filter events based on the active filter
  const filteredEvents = (() => {
    if (!eventFilter) return events;

    switch (eventFilter) {
      case 'all':
        return events;
      case 'upcoming':
        return events.filter((e) => e.event_date > Date.now());
      case 'completed':
        return events.filter((e) => e.event_status === 'completed');
      default:
        return events;
    }
  })();

  const handleCreateEvent = async (data: EventFormValues) => {
    if (!currentUser?.company_id || !clientId) {
      toast({
        title: 'Error',
        description: 'Missing required information',
        variant: 'destructive',
      });
      return;
    }

    try {
      const startHour = parseInt(data.event_start_time.split(':')[0]);
      const endHour = parseInt(data.event_end_time.split(':')[0]);
      const durationHours = endHour - startHour;

      await createEvent({
        company_id: currentUser.company_id,
        client_id: clientId,
        event_name: data.event_name,
        event_type: data.event_type,
        date: data.event_date,
        start_time: data.event_start_time,
        end_time: data.event_end_time,
        duration_hours: durationHours,
        venue: data.venue_details.name,
        venue_address: data.venue_details.address,
        venue_coordinates: data.venue_details.lat && data.venue_details.lng ? {
          lat: data.venue_details.lat,
          lng: data.venue_details.lng,
        } : undefined,
        venue_capacity: data.venue_details.capacity,
        activity: data.event_name,
        activity_description: data.description,
        required_vendors: [],
        required_equipment: [],
        already_booked: false,
        notes: data.special_instructions,
      });

      toast({
        title: 'Success',
        description: 'Event created successfully',
      });
      closeDialog();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create event',
        variant: 'destructive',
      });
    }
  };

  const handleEditEvent = async (data: EventFormValues) => {
    if (!selectedEvent) return;

    try {
      await updateEvent({
        eventBriefId: selectedEvent._id as any as Id<'event_brief'>,
        event_name: data.event_name,
        start_time: data.event_start_time,
        end_time: data.event_end_time,
        venue: data.venue_details.name,
        activity: data.event_name,
        required_vendors: [],
        required_equipment: [],
        already_booked: false,
        notes: data.special_instructions,
      });

      toast({
        title: 'Success',
        description: 'Event updated successfully',
      });
      closeDialog();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update event',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEventBrief({
        eventBriefId: eventId as any as Id<'event_brief'>,
      });

      toast({
        title: 'Success',
        description: 'Event deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete event',
        variant: 'destructive',
      });
    }
  };

  const handleViewEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsVenueSheetOpen(true);
  };

  const openDialog = (event?: Event) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setSelectedEvent(undefined);
    setIsDialogOpen(false);
  };

  // Loading state
  if (currentUser === undefined) {
    return <PageLoader />;
  }

  // Not authenticated
  if (currentUser === null) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Authentication Required</h2>
          <p className="text-muted-foreground mt-2">
            Please sign in to manage events.
          </p>
        </div>
      </div>
    );
  }

  // Loading clients and events
  if (clients === undefined || rawEvents === undefined) {
    return <PageLoader />;
  }

  // No client found state
  if (!selectedClient || !clientId) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">No Client Found</h2>
          <p className="text-muted-foreground mt-2">
            Please create a client first to manage events.
          </p>
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
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white break-words">Events</h2>
            <p className="text-sm sm:text-base text-primary-800 mt-1 break-words">
              Manage your wedding events and schedules
            </p>
          </div>
          <div className="sm:ml-4">
            <Button
              onClick={() => openDialog()}
              size="sm"
              className="w-full sm:w-auto bg-white hover:bg-gray-50 text-gray-900 shadow-xl hover:shadow-2xl transition-all duration-200 border-2 border-white/50"
            >
              <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 font-bold" />
              <span className="text-xs sm:text-sm font-bold">Add Event</span>
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
          <EventList
            events={filteredEvents}
            onEdit={openDialog}
            onDelete={handleDeleteEvent}
            onView={handleViewEvent}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs and Sheets */}
      <EventDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        event={selectedEvent}
        onSubmit={selectedEvent ? handleEditEvent : handleCreateEvent}
      />

      {selectedEvent && (
        <VenueInfoSheet
          open={isVenueSheetOpen}
          onOpenChange={setIsVenueSheetOpen}
          venue={selectedEvent.venue_details}
          eventName={selectedEvent.event_name}
        />
      )}
    </div>
  );
}
