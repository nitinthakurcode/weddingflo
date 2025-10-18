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
  ceremony: 'bg-gradient-to-r from-primary to-pink-600 text-white shadow-lg',
  reception: 'bg-gradient-to-r from-pink-500 to-pink-700 text-white shadow-lg',
  sangeet: 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg',
  mehendi: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg',
  haldi: 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-lg',
  engagement: 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg',
  cocktail: 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg',
  rehearsal: 'bg-gradient-to-r from-gray-500 to-gray-700 text-white shadow-lg',
  other: 'bg-gradient-to-r from-gray-400 to-gray-600 text-white shadow-lg',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gradient-to-r from-gray-400 to-gray-600 text-white shadow-md',
  confirmed: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md',
  completed: 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-md',
  cancelled: 'bg-gradient-to-r from-red-500 to-red-700 text-white shadow-md',
};

export function EventCard({ event, onEdit, onDelete, onView }: EventCardProps) {
  const eventDate = new Date(event.event_date);

  return (
    <Card className="border-2 border-primary/20 hover:border-primary/40 hover:shadow-2xl transition-all hover:scale-[1.02] bg-gradient-to-br from-primary/5 via-transparent to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-primary">
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
                  onClick={() => onDelete(event.id)}
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{format(eventDate, 'EEEE, MMMM d, yyyy')}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            {event.event_start_time} - {event.event_end_time}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="truncate">
            {event.venue_details.name}, {event.venue_details.city}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>
            {event.actual_guests || event.estimated_guests} guests
            {!event.actual_guests && ' (estimated)'}
          </span>
        </div>
        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
            {event.description}
          </p>
        )}
      </CardContent>
      {(event.budget_allocated || event.tags.length > 0) && (
        <CardFooter className="flex items-center justify-between border-t pt-4">
          {event.budget_allocated && (
            <div className="text-sm">
              <span className="text-muted-foreground">Budget: </span>
              <span className="font-semibold text-foreground">
                ${event.budget_allocated.toLocaleString()}
              </span>
              {event.budget_spent && (
                <span className="text-muted-foreground">
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
