'use client';

import { EventActivity } from '@/types/eventFlow';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Clock, MapPin, Users, MoreVertical, AlertCircle } from 'lucide-react';
import { formatTimeDisplay, formatDurationDisplay } from '@/lib/timeline-utils';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ActivityCardProps {
  activity: EventActivity;
  hasConflict?: boolean;
  onEdit?: (activity: EventActivity) => void;
  onDelete?: (activityId: string) => void;
  draggable?: boolean;
}

const activityTypeColors: Record<string, string> = {
  setup: 'bg-gradient-to-r from-gray-400 to-gray-600 text-white shadow-lg',
  ceremony: 'bg-gradient-to-r from-primary to-pink-600 text-white shadow-lg',
  reception: 'bg-gradient-to-r from-pink-500 to-pink-700 text-white shadow-lg',
  entertainment: 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg',
  break: 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg',
  photography: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg',
  catering: 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-lg',
  cleanup: 'bg-gradient-to-r from-gray-500 to-gray-700 text-white shadow-lg',
  other: 'bg-gradient-to-r from-purple-400 to-purple-600 text-white shadow-lg',
};

const statusColors: Record<string, string> = {
  pending: 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-md',
  in_progress: 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-md',
  completed: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md',
  cancelled: 'bg-gradient-to-r from-red-500 to-red-700 text-white shadow-md',
};

export function ActivityCard({
  activity,
  hasConflict,
  onEdit,
  onDelete,
  draggable = false,
}: ActivityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: activity._id,
    disabled: !draggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cardContent = (
    <Card
      className={cn(
        'p-4 border-2 hover:shadow-2xl transition-all hover:scale-[1.02]',
        hasConflict
          ? 'border-red-500 bg-gradient-to-br from-red-50/50 via-transparent to-transparent'
          : 'border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent hover:border-primary/30',
        isDragging && 'opacity-50',
        draggable && 'cursor-move'
      )}
      style={{
        ...style,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-bold text-primary">{activity.activity}</h4>
            {hasConflict && (
              <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            <Badge className={activityTypeColors[activity.activity_type] || activityTypeColors.other}>
              {activity.activity_type}
            </Badge>
            <Badge className={statusColors[activity.status] || statusColors.pending}>
              {activity.status}
            </Badge>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>
                {formatTimeDisplay(activity.start_time)} -{' '}
                {formatTimeDisplay(activity.end_time)} (
                {formatDurationDisplay(activity.duration_minutes)})
              </span>
            </div>

            {activity.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{activity.location}</span>
              </div>
            )}

            {activity.manager && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{activity.manager}</span>
              </div>
            )}
          </div>

          {activity.activity_description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {activity.activity_description}
            </p>
          )}

          {activity.buffer_minutes && activity.buffer_minutes > 0 && (
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                +{activity.buffer_minutes}min buffer
              </Badge>
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(activity)}>
                Edit
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={() => onDelete(activity._id)}
                className="text-red-600"
              >
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );

  if (draggable) {
    return (
      <div ref={setNodeRef} {...attributes} {...listeners}>
        {cardContent}
      </div>
    );
  }

  return cardContent;
}
