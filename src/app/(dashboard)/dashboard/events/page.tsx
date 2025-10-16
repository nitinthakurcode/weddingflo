'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@clerk/nextjs';
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

export default function EventsPage() {
  const { toast } = useToast();
  const supabase = createClient();
  const { user } = useUser();
  const queryClient = useQueryClient();

  // Get current user and their clients
  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID not available');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_user_id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients', currentUser?.company_id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID not available');
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', currentUser?.company_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.company_id,
  });

  // Use first client for now
  const selectedClient = clients?.[0];
  const clientId = selectedClient?.id;

  // Fetch events
  const { data: rawEvents, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['events', clientId],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID not available');
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  // Map to Event type
  const events: Event[] = (rawEvents || []).map((evt) => ({
    _id: evt.id as any,
    _creationTime: new Date(evt.created_at).getTime(),
    company_id: evt.company_id,
    client_id: evt.client_id,
    event_name: evt.event_name,
    event_type: evt.event_type as any,
    event_date: new Date(evt.event_date).getTime(),
    event_start_time: evt.event_start_time,
    event_end_time: evt.event_end_time,
    event_status: evt.event_status || 'confirmed' as const,
    venue_details: evt.venue_details || {
      name: '',
      address: '',
      city: '',
      state: '',
      country: '',
      capacity: 0,
    },
    estimated_guests: evt.estimated_guests || 0,
    description: evt.description,
    tags: evt.tags || [],
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

  const createEvent = useMutation({
    mutationFn: async (eventData: any) => {
      const { data, error } = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const updateEvent = useMutation({
    mutationFn: async ({ eventId, ...eventData }: any) => {
      const { data, error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', eventId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const deleteEventBrief = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

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
      await createEvent.mutateAsync({
        company_id: currentUser.company_id,
        client_id: clientId,
        event_name: data.event_name,
        event_type: data.event_type,
        event_date: data.event_date,
        event_start_time: data.event_start_time,
        event_end_time: data.event_end_time,
        event_status: 'confirmed',
        venue_details: data.venue_details,
        estimated_guests: data.venue_details.capacity || 0,
        description: data.description,
        special_instructions: data.special_instructions,
        tags: [],
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
      await updateEvent.mutateAsync({
        eventId: selectedEvent._id,
        event_name: data.event_name,
        event_start_time: data.event_start_time,
        event_end_time: data.event_end_time,
        venue_details: data.venue_details,
        description: data.description,
        special_instructions: data.special_instructions,
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
      await deleteEventBrief.mutateAsync(eventId);

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
  if (!user || isLoadingUser) {
    return <PageLoader />;
  }

  // Not authenticated
  if (!currentUser) {
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
  if (isLoadingClients || isLoadingEvents) {
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
