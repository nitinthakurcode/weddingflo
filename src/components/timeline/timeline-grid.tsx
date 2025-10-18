'use client';

import { EventActivity, TimeBlock } from '@/types/eventFlow';
import { generateTimeSlots, formatTimeDisplay } from '@/lib/timeline-utils';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

interface TimelineGridProps {
  activities: EventActivity[];
  timeBlocks: TimeBlock[];
  startHour: number;
  endHour: number;
  intervalMinutes: number;
  onActivityClick?: (activity: EventActivity) => void;
}

const activityTypeColors: Record<string, { bg: string; border: string; text: string }> = {
  setup: { bg: 'bg-gray-200', border: 'border-gray-400', text: 'text-gray-900' },
  ceremony: { bg: 'bg-primary/20', border: 'border-primary', text: 'text-primary' },
  reception: { bg: 'bg-pink-200', border: 'border-pink-500', text: 'text-pink-900' },
  entertainment: { bg: 'bg-orange-200', border: 'border-orange-500', text: 'text-orange-900' },
  break: { bg: 'bg-blue-200', border: 'border-blue-500', text: 'text-blue-900' },
  photography: { bg: 'bg-green-200', border: 'border-green-500', text: 'text-green-900' },
  catering: { bg: 'bg-yellow-200', border: 'border-yellow-500', text: 'text-yellow-900' },
  cleanup: { bg: 'bg-gray-200', border: 'border-gray-400', text: 'text-gray-900' },
  other: { bg: 'bg-gray-200', border: 'border-gray-400', text: 'text-gray-900' },
};

export function TimelineGrid({
  activities,
  timeBlocks,
  startHour,
  endHour,
  intervalMinutes,
  onActivityClick,
}: TimelineGridProps) {
  const timeSlots = generateTimeSlots(startHour, endHour, intervalMinutes);

  return (
    <div className="relative bg-white rounded-lg border overflow-x-auto">
      {/* Time Header */}
      <div className="sticky top-0 z-10 bg-gray-50 border-b">
        <div className="flex">
          <div className="w-32 flex-shrink-0 p-3 border-r font-medium text-sm">
            Activity
          </div>
          <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${timeSlots.length}, 1fr)` }}>
            {timeSlots.map((time) => (
              <div
                key={time}
                className="p-2 text-center text-xs font-medium text-muted-foreground border-r last:border-r-0"
                style={{ minWidth: '80px' }}
              >
                {formatTimeDisplay(time)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="relative">
        {activities.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <div className="text-center">
              <p className="text-sm">No activities scheduled</p>
              <p className="text-xs mt-1">Add activities to see them in the timeline</p>
            </div>
          </div>
        ) : (
          activities.map((activity, index) => {
            const timeBlock = timeBlocks.find((tb) => tb.activity_id === activity.id);
            if (!timeBlock) return null;

            const colors = activityTypeColors[activity.activity_type];

            return (
              <div
                key={activity.id}
                className={cn(
                  'flex border-b last:border-b-0',
                  index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                )}
              >
                {/* Activity Name Column */}
                <div className="w-32 flex-shrink-0 p-3 border-r flex items-center">
                  <div className="truncate">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.activity}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {activity.activity_type}
                    </p>
                  </div>
                </div>

                {/* Timeline Column */}
                <div className="flex-1 relative h-16">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${timeSlots.length}, 1fr)` }}>
                    {timeSlots.map((time) => (
                      <div
                        key={time}
                        className="border-r last:border-r-0"
                        style={{ minWidth: '80px' }}
                      />
                    ))}
                  </div>

                  {/* Activity Block */}
                  <div
                    className={cn(
                      'absolute h-12 top-2 rounded shadow-sm border-2 cursor-pointer hover:shadow-md transition-shadow',
                      colors.bg,
                      colors.border,
                      timeBlock.has_conflict && 'border-red-500 animate-pulse'
                    )}
                    style={{
                      left: `${timeBlock.left_percent}%`,
                      width: `${timeBlock.width_percent}%`,
                    }}
                    onClick={() => onActivityClick?.(activity)}
                  >
                    <div className="flex items-center justify-between h-full px-2">
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        {timeBlock.has_conflict && (
                          <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                        )}
                        <span className={cn('text-xs font-medium truncate', colors.text)}>
                          {activity.activity}
                        </span>
                      </div>
                      {activity.buffer_minutes && activity.buffer_minutes > 0 && (
                        <Badge variant="outline" className="text-xs ml-1 flex-shrink-0">
                          +{activity.buffer_minutes}m
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="border-t p-4 bg-gray-50">
        <div className="flex flex-wrap gap-3">
          <p className="text-xs font-medium text-muted-foreground mr-2">Legend:</p>
          {Object.entries(activityTypeColors).map(([type, colors]) => (
            <div key={type} className="flex items-center gap-1">
              <div className={cn('w-3 h-3 rounded border-2', colors.bg, colors.border)} />
              <span className="text-xs text-muted-foreground capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
