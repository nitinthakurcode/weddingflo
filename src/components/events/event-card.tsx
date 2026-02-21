'use client';

import { Event } from '@/types/event';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Clock, MoreVertical, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSwipeToConfirm } from '@/hooks/use-swipe';
import { cn } from '@/lib/utils';

interface EventCardProps {
  event: Event;
  onEdit?: (event: Event) => void;
  onDelete?: (eventId: string) => void;
  onView?: (event: Event) => void;
  onConfirm?: (eventId: string) => void;
}

// Theme-aligned event type colors (2026 Design System)
const eventTypeColors: Record<string, string> = {
  ceremony: 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg',
  reception: 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg',
  sangeet: 'bg-gradient-to-r from-gold-500 to-gold-600 text-white shadow-lg',
  mehendi: 'bg-gradient-to-r from-sage-500 to-sage-600 text-white shadow-lg',
  haldi: 'bg-gradient-to-r from-gold-400 to-gold-500 text-white shadow-lg',
  engagement: 'bg-gradient-to-r from-cobalt-500 to-cobalt-600 text-white shadow-lg',
  cocktail: 'bg-gradient-to-r from-teal-600 to-rose-500 text-white shadow-lg',
  rehearsal: 'bg-gradient-to-r from-mocha-500 to-mocha-600 text-white shadow-lg',
  other: 'bg-gradient-to-r from-mocha-400 to-mocha-500 text-white shadow-lg',
};

// Theme-aligned status colors (2026 Design System)
const statusColors: Record<string, string> = {
  draft: 'bg-gradient-to-r from-mocha-400 to-mocha-500 text-white shadow-md',
  confirmed: 'bg-gradient-to-r from-sage-500 to-sage-600 text-white shadow-md',
  completed: 'bg-gradient-to-r from-cobalt-500 to-cobalt-600 text-white shadow-md',
  cancelled: 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md',
};

export function EventCard({ event, onEdit, onDelete, onView, onConfirm }: EventCardProps) {
  const eventDate = new Date(event.event_date);

  // Enable swipe-to-confirm only for draft events
  const canConfirmEvent = event.event_status === 'draft';

  const confirmThreshold = 80; // percentage threshold
  const {
    handlers,
    swipeState,
    isConfirmed,
  } = useSwipeToConfirm({
    onConfirm: () => onConfirm?.(event.id),
    disabled: !canConfirmEvent || !onConfirm,
    threshold: confirmThreshold,
  });

  // Derived values from swipeState
  const progress = swipeState.swipePercentage / 100;
  const readyToConfirm = swipeState.swipePercentage >= confirmThreshold;
  const isConfirming = swipeState.swiping;
  const swipeOffset = { x: (swipeState.swipePercentage / 100) * 150 }; // Scale to visual offset

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe-to-confirm background */}
      {canConfirmEvent && onConfirm && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-start pl-6 transition-colors duration-200",
            readyToConfirm
              ? "bg-gradient-to-r from-sage-500 to-sage-600"
              : "bg-gradient-to-r from-sage-400/80 to-sage-500/80"
          )}
        >
          <div
            className="flex items-center gap-2 text-white font-semibold"
            style={{ opacity: Math.min(progress * 2, 1) }}
          >
            <CheckCircle2
              className={cn(
                "h-6 w-6 transition-transform duration-200",
                readyToConfirm && "scale-125"
              )}
            />
            <span className={cn(
              "transition-all duration-200",
              readyToConfirm ? "text-lg" : "text-sm"
            )}>
              {readyToConfirm ? "Release to Confirm!" : "Swipe to Confirm"}
            </span>
          </div>
        </div>
      )}

      <Card
        className={cn(
          "border-2 border-primary/20 hover:border-primary/40 hover:shadow-2xl transition-all bg-gradient-to-br from-primary/5 via-transparent to-transparent relative",
          !canConfirmEvent && "hover:scale-[1.02]",
          isConfirming && "scale-95 opacity-50"
        )}
        style={{
          transform: `translateX(${swipeOffset.x}px)`,
          transition: swipeOffset.x === 0 ? 'transform 0.3s ease-out' : 'none',
        }}
        {...handlers}>
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
                  className="text-rose-600 dark:text-rose-400"
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
    </div>
  );
}
