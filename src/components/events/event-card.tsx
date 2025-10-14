'use client';

import { Event } from '@/types/event';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Clock, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EventCardProps {
  event: Event;
  onEdit?: (event: Event) => void;
  onDelete?: (eventId: string) => void;
  onView?: (event: Event) => void;
}

const eventTypeColors: Record<string, string> = {
  ceremony: 'bg-purple-100 text-purple-800',
  reception: 'bg-pink-100 text-pink-800',
  sangeet: 'bg-orange-100 text-orange-800',
  mehendi: 'bg-green-100 text-green-800',
  haldi: 'bg-yellow-100 text-yellow-800',
  engagement: 'bg-blue-100 text-blue-800',
  cocktail: 'bg-indigo-100 text-indigo-800',
  rehearsal: 'bg-gray-100 text-gray-800',
  other: 'bg-gray-100 text-gray-800',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
};

export function EventCard({ event, onEdit, onDelete, onView }: EventCardProps) {
  const eventDate = new Date(event.event_date);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {event.event_name}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={eventTypeColors[event.event_type]}>
                {event.event_type}
              </Badge>
              <Badge className={statusColors[event.event_status]}>
                {event.event_status}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(event)}>
                  View Details
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(event)}>
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(event._id)}
                  className="text-red-600"
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>{format(eventDate, 'EEEE, MMMM d, yyyy')}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="h-4 w-4" />
          <span>
            {event.event_start_time} - {event.event_end_time}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4" />
          <span className="truncate">
            {event.venue_details.name}, {event.venue_details.city}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="h-4 w-4" />
          <span>
            {event.actual_guests || event.estimated_guests} guests
            {!event.actual_guests && ' (estimated)'}
          </span>
        </div>
        {event.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mt-2">
            {event.description}
          </p>
        )}
      </CardContent>
      {(event.budget_allocated || event.tags.length > 0) && (
        <CardFooter className="flex items-center justify-between border-t pt-4">
          {event.budget_allocated && (
            <div className="text-sm">
              <span className="text-gray-600">Budget: </span>
              <span className="font-semibold text-gray-900">
                ${event.budget_allocated.toLocaleString()}
              </span>
              {event.budget_spent && (
                <span className="text-gray-600">
                  {' '}
                  / ${event.budget_spent.toLocaleString()} spent
                </span>
              )}
            </div>
          )}
          {event.tags.length > 0 && (
            <div className="flex gap-1">
              {event.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {event.tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{event.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
