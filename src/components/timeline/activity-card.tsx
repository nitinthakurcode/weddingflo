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
  setup: 'bg-gray-100 text-gray-800',
  ceremony: 'bg-purple-100 text-purple-800',
  reception: 'bg-pink-100 text-pink-800',
  entertainment: 'bg-orange-100 text-orange-800',
  break: 'bg-blue-100 text-blue-800',
  photography: 'bg-green-100 text-green-800',
  catering: 'bg-yellow-100 text-yellow-800',
  cleanup: 'bg-gray-100 text-gray-800',
  other: 'bg-gray-100 text-gray-800',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
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
        'p-4 hover:shadow-md transition-shadow',
        hasConflict && 'border-red-500 border-2',
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
            <h4 className="font-semibold text-gray-900">{activity.activity}</h4>
            {hasConflict && (
              <AlertCircle className="h-4 w-4 text-red-500" />
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

          <div className="space-y-2 text-sm text-gray-600">
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
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
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
