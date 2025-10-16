import { parse, format, addMinutes, isWithinInterval, isBefore, isAfter } from 'date-fns';
import { EventActivity, Conflict, TimeBlock } from '@/types/eventFlow';

/**
 * Parse a time string (HH:MM) to a Date object for a given date
 */
export function parseTimeToDate(timeString: string, baseDate: Date = new Date()): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Calculate end time based on start time and duration
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const startDate = parseTimeToDate(startTime);
  const endDate = addMinutes(startDate, durationMinutes);
  return format(endDate, 'HH:mm');
}

/**
 * Calculate duration in minutes between two time strings
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const start = parseTimeToDate(startTime);
  const end = parseTimeToDate(endTime);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
}

/**
 * Check if two time ranges overlap
 */
export function doTimeRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = parseTimeToDate(start1);
  const e1 = parseTimeToDate(end1);
  const s2 = parseTimeToDate(start2);
  const e2 = parseTimeToDate(end2);

  return (
    (isWithinInterval(s1, { start: s2, end: e2 }) ||
      isWithinInterval(e1, { start: s2, end: e2 }) ||
      isWithinInterval(s2, { start: s1, end: e1 }) ||
      isWithinInterval(e2, { start: s1, end: e1 })) ||
    (s1.getTime() === s2.getTime() && e1.getTime() === e2.getTime())
  );
}

/**
 * Detect conflicts between activities
 */
export function detectConflicts(activities: EventActivity[]): Conflict[] {
  const conflicts: Conflict[] = [];

  for (let i = 0; i < activities.length; i++) {
    const activity1 = activities[i];

    for (let j = i + 1; j < activities.length; j++) {
      const activity2 = activities[j];

      // Check for time overlaps
      if (doTimeRangesOverlap(
        activity1.start_time,
        activity1.end_time,
        activity2.start_time,
        activity2.end_time
      )) {
        conflicts.push({
          id: `time-${activity1._id}-${activity2._id}`,
          type: 'time_overlap',
          severity: 'medium',
          description: `"${activity1.activity}" overlaps with "${activity2.activity}"`,
          affected_activities: [activity1._id, activity2._id],
          suggested_resolution: `Adjust the timing of one activity to avoid overlap`,
        });

        // Check if they share the same responsible vendor
        if (
          activity1.responsible_vendor &&
          activity2.responsible_vendor &&
          activity1.responsible_vendor === activity2.responsible_vendor
        ) {
          conflicts.push({
            id: `vendor-${activity1._id}-${activity2._id}`,
            type: 'vendor_double_booking',
            severity: 'high',
            description: `Vendor double-booked between "${activity1.activity}" and "${activity2.activity}"`,
            affected_activities: [activity1._id, activity2._id],
            suggested_resolution: `Assign different vendors or adjust timing`,
          });
        }

        // Check if they share location
        if (
          activity1.location &&
          activity2.location &&
          activity1.location === activity2.location
        ) {
          conflicts.push({
            id: `location-${activity1._id}-${activity2._id}`,
            type: 'location_conflict',
            severity: 'high',
            description: `Location "${activity1.location}" is being used by both "${activity1.activity}" and "${activity2.activity}" at the same time`,
            affected_activities: [activity1._id, activity2._id],
            suggested_resolution: `Use different locations or adjust timing`,
          });
        }
      }
    }

    // Check basic dependency violations (depends_on is just an array of IDs)
    activity1.depends_on.forEach((depId) => {
      const dependentActivity = activities.find((a) => a._id === depId);
      if (!dependentActivity) return;

      const start1 = parseTimeToDate(activity1.start_time);
      const start2 = parseTimeToDate(dependentActivity.start_time);
      const end2 = parseTimeToDate(dependentActivity.end_time);

      // Basic check: activity1 should start after dependentActivity ends
      if (isBefore(start1, end2)) {
        conflicts.push({
          id: `dep-${activity1._id}-${depId}`,
          type: 'dependency_violation',
          severity: 'high',
          description: `"${activity1.activity}" should start after "${dependentActivity.activity}" completes`,
          affected_activities: [activity1._id, depId],
          suggested_resolution: `Adjust timing to ensure "${activity1.activity}" starts after "${dependentActivity.activity}" ends`,
        });
      }
    });
  }

  return conflicts;
}

/**
 * Check if an activity has conflicts
 */
export function hasConflict(activityId: string, conflicts: Conflict[]): boolean {
  return conflicts.some((c) => c.affected_activities.includes(activityId));
}

/**
 * Get conflicts for a specific activity
 */
export function getActivityConflicts(
  activityId: string,
  conflicts: Conflict[]
): Conflict[] {
  return conflicts.filter((c) => c.affected_activities.includes(activityId));
}

/**
 * Convert activities to time blocks for timeline visualization
 */
export function activitiesToTimeBlocks(
  activities: EventActivity[],
  startHour: number,
  endHour: number,
  conflicts: Conflict[]
): TimeBlock[] {
  const totalMinutes = (endHour - startHour) * 60;
  const baseDate = new Date();
  baseDate.setHours(startHour, 0, 0, 0);

  return activities.map((activity) => {
      const startTime = parseTimeToDate(activity.start_time, baseDate);
      const endTime = parseTimeToDate(activity.end_time, baseDate);

      // Calculate position and width as percentages
      const minutesFromStart = (startTime.getHours() - startHour) * 60 + startTime.getMinutes();
      const durationMinutes = calculateDuration(activity.start_time, activity.end_time);

      const leftPercent = (minutesFromStart / totalMinutes) * 100;
      const widthPercent = (durationMinutes / totalMinutes) * 100;

      return {
        id: activity._id,
        activity_id: activity._id,
        start_time: startTime,
        end_time: endTime,
        left_percent: leftPercent,
        width_percent: widthPercent,
        has_conflict: hasConflict(activity._id, conflicts),
      };
    });
}

/**
 * Sort activities by start time
 */
export function sortActivitiesByTime(activities: EventActivity[]): EventActivity[] {
  return [...activities].sort((a, b) => {
    const timeA = parseTimeToDate(a.start_time);
    const timeB = parseTimeToDate(b.start_time);
    return timeA.getTime() - timeB.getTime();
  });
}

/**
 * Format time string for display
 */
export function formatTimeDisplay(timeString: string): string {
  const date = parseTimeToDate(timeString);
  return format(date, 'h:mm a');
}

/**
 * Format duration for display
 */
export function formatDurationDisplay(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Generate time slots for timeline grid
 */
export function generateTimeSlots(
  startHour: number,
  endHour: number,
  intervalMinutes: number = 60
): string[] {
  const slots: string[] = [];
  let currentHour = startHour;
  let currentMinute = 0;

  while (currentHour < endHour || (currentHour === endHour && currentMinute === 0)) {
    const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    slots.push(timeString);

    currentMinute += intervalMinutes;
    if (currentMinute >= 60) {
      currentHour += Math.floor(currentMinute / 60);
      currentMinute = currentMinute % 60;
    }
  }

  return slots;
}
