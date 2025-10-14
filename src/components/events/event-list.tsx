'use client';

import { Event } from '@/types/event';
import { EventCard } from './event-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Calendar } from 'lucide-react';

interface EventListProps {
  events: Event[];
  onEdit?: (event: Event) => void;
  onDelete?: (eventId: string) => void;
  onView?: (event: Event) => void;
}

export function EventList({ events, onEdit, onDelete, onView }: EventListProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No events found"
        description="Get started by creating your first event"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <EventCard
          key={event._id}
          event={event}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
        />
      ))}
    </div>
  );
}
