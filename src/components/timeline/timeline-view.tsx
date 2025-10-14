'use client';

import { EventActivity, Conflict } from '@/types/eventFlow';
import { TimelineGrid } from './timeline-grid';
import { ActivityCard } from './activity-card';
import { TimelineControls } from './timeline-controls';
import { ConflictAlertBanner } from './conflict-alert-banner';
import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  detectConflicts,
  activitiesToTimeBlocks,
  sortActivitiesByTime,
} from '@/lib/timeline-utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutGrid, List } from 'lucide-react';

interface TimelineViewProps {
  activities: EventActivity[];
  onActivityClick?: (activity: EventActivity) => void;
  onActivityReorder?: (reorderedActivities: EventActivity[]) => void;
}

export function TimelineView({
  activities,
  onActivityClick,
  onActivityReorder,
}: TimelineViewProps) {
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(24);
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedActivities = sortActivitiesByTime(activities);
  const conflicts = detectConflicts(sortedActivities);
  const timeBlocks = activitiesToTimeBlocks(
    sortedActivities,
    startHour,
    endHour,
    conflicts
  );

  const hasConflicts = conflicts.length > 0;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedActivities.findIndex((a) => a._id === active.id);
      const newIndex = sortedActivities.findIndex((a) => a._id === over.id);

      const reordered = arrayMove(sortedActivities, oldIndex, newIndex);
      onActivityReorder?.(reordered);
    }
  };

  const handleZoomChange = (zoom: 'hour' | 'half_hour' | 'quarter_hour') => {
    switch (zoom) {
      case 'hour':
        setIntervalMinutes(60);
        break;
      case 'half_hour':
        setIntervalMinutes(30);
        break;
      case 'quarter_hour':
        setIntervalMinutes(15);
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Conflict Alert */}
      {hasConflicts && <ConflictAlertBanner conflicts={conflicts} />}

      {/* Timeline Controls */}
      <TimelineControls
        startHour={startHour}
        endHour={endHour}
        onStartHourChange={setStartHour}
        onEndHourChange={setEndHour}
        onZoomChange={handleZoomChange}
        currentZoom={
          intervalMinutes === 60
            ? 'hour'
            : intervalMinutes === 30
              ? 'half_hour'
              : 'quarter_hour'
        }
      />

      {/* View Toggle and Content */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'timeline' | 'list')}>
        <TabsList>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Timeline View
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            List View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-6">
          <TimelineGrid
            activities={sortedActivities}
            timeBlocks={timeBlocks}
            startHour={startHour}
            endHour={endHour}
            intervalMinutes={intervalMinutes}
            onActivityClick={onActivityClick}
          />
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedActivities.map((a) => a._id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {sortedActivities.map((activity) => (
                  <ActivityCard
                    key={activity._id}
                    activity={activity}
                    hasConflict={conflicts.some((c) =>
                      c.affected_activities.includes(activity._id)
                    )}
                    onEdit={onActivityClick}
                    draggable
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </TabsContent>
      </Tabs>
    </div>
  );
}
