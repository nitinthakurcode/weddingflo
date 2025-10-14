import {
  parseTimeToDate,
  calculateEndTime,
  calculateDuration,
  doTimeRangesOverlap,
  detectConflicts,
  hasConflict,
  getActivityConflicts,
  sortActivitiesByTime,
  formatTimeDisplay,
  formatDurationDisplay,
  generateTimeSlots,
} from '@/lib/timeline-utils'
import { EventActivity } from '@/types/eventFlow'

describe('timeline-utils', () => {
  const baseDate = new Date('2024-01-15T00:00:00Z')

  describe('parseTimeToDate', () => {
    it('should parse time string correctly', () => {
      const result = parseTimeToDate('14:30', baseDate)
      expect(result.getHours()).toBe(14)
      expect(result.getMinutes()).toBe(30)
    })

    it('should handle midnight', () => {
      const result = parseTimeToDate('00:00', baseDate)
      expect(result.getHours()).toBe(0)
      expect(result.getMinutes()).toBe(0)
    })

    it('should handle noon', () => {
      const result = parseTimeToDate('12:00', baseDate)
      expect(result.getHours()).toBe(12)
      expect(result.getMinutes()).toBe(0)
    })
  })

  describe('calculateEndTime', () => {
    it('should calculate end time correctly', () => {
      expect(calculateEndTime('10:00', 90)).toBe('11:30')
    })

    it('should handle crossing day boundary', () => {
      expect(calculateEndTime('23:30', 60)).toBe('00:30')
    })

    it('should handle zero duration', () => {
      expect(calculateEndTime('14:00', 0)).toBe('14:00')
    })

    it('should handle large durations', () => {
      expect(calculateEndTime('10:00', 720)).toBe('22:00')
    })
  })

  describe('calculateDuration', () => {
    it('should calculate duration correctly', () => {
      expect(calculateDuration('10:00', '11:30')).toBe(90)
    })

    it('should handle same start and end time', () => {
      expect(calculateDuration('10:00', '10:00')).toBe(0)
    })

    it('should handle time spans (within same day)', () => {
      // calculateDuration doesn't handle midnight crossing - it calculates within same day
      expect(calculateDuration('09:00', '17:00')).toBe(480)
    })

  })

  describe('doTimeRangesOverlap', () => {
    it('should detect complete overlap', () => {
      expect(doTimeRangesOverlap('10:00', '12:00', '10:00', '12:00')).toBe(true)
    })

    it('should detect partial overlap - start within range', () => {
      expect(doTimeRangesOverlap('10:00', '12:00', '11:00', '13:00')).toBe(true)
    })

    it('should detect partial overlap - end within range', () => {
      expect(doTimeRangesOverlap('11:00', '13:00', '10:00', '12:00')).toBe(true)
    })

    it('should detect enclosing overlap', () => {
      expect(doTimeRangesOverlap('10:00', '14:00', '11:00', '13:00')).toBe(true)
    })

    it('should not detect non-overlapping ranges', () => {
      expect(doTimeRangesOverlap('10:00', '12:00', '13:00', '15:00')).toBe(false)
    })

    it('should consider adjacent ranges as overlapping at boundary', () => {
      // The function uses isWithinInterval which is inclusive, so adjacent ranges share a boundary point
      expect(doTimeRangesOverlap('10:00', '12:00', '12:00', '14:00')).toBe(true)
    })

    it('should not detect non-overlapping ranges with gap', () => {
      expect(doTimeRangesOverlap('10:00', '11:00', '13:00', '14:00')).toBe(false)
    })
  })

  describe('detectConflicts', () => {
    const mockActivities: EventActivity[] = [
      {
        _id: '1' as any,
        _creationTime: Date.now(),
        user_id: 'user1',
        event_id: 'event1' as any,
        activity: 'Ceremony',
        start_time: '10:00',
        end_time: '11:00',
        location: 'Main Hall',
        responsible_vendor: 'vendor1' as any,
        depends_on: [],
        notes: '',
      },
      {
        _id: '2' as any,
        _creationTime: Date.now(),
        user_id: 'user1',
        event_id: 'event1' as any,
        activity: 'Reception Setup',
        start_time: '10:30',
        end_time: '11:30',
        location: 'Main Hall',
        responsible_vendor: 'vendor1' as any,
        depends_on: [],
        notes: '',
      },
      {
        _id: '3' as any,
        _creationTime: Date.now(),
        user_id: 'user1',
        event_id: 'event1' as any,
        activity: 'Photos',
        start_time: '11:00',
        end_time: '12:00',
        location: 'Garden',
        responsible_vendor: 'vendor2' as any,
        depends_on: ['1' as any],
        notes: '',
      },
    ]

    it('should detect time overlap conflicts', () => {
      const conflicts = detectConflicts(mockActivities)
      const timeConflicts = conflicts.filter((c) => c.type === 'time_overlap')
      expect(timeConflicts.length).toBeGreaterThan(0)
    })

    it('should detect vendor double booking', () => {
      const conflicts = detectConflicts(mockActivities)
      const vendorConflicts = conflicts.filter((c) => c.type === 'vendor_double_booking')
      expect(vendorConflicts.length).toBeGreaterThan(0)
    })

    it('should detect location conflicts', () => {
      const conflicts = detectConflicts(mockActivities)
      const locationConflicts = conflicts.filter((c) => c.type === 'location_conflict')
      expect(locationConflicts.length).toBeGreaterThan(0)
    })

    it('should detect dependency violations', () => {
      const activities: EventActivity[] = [
        {
          ...mockActivities[0],
          _id: '1' as any,
          start_time: '10:00',
          end_time: '11:00',
        },
        {
          ...mockActivities[1],
          _id: '2' as any,
          start_time: '10:30', // starts before activity 1 ends
          end_time: '11:30',
          depends_on: ['1' as any],
        },
      ]

      const conflicts = detectConflicts(activities)
      const depConflicts = conflicts.filter((c) => c.type === 'dependency_violation')
      expect(depConflicts.length).toBeGreaterThan(0)
    })

    it('should not detect conflicts for non-overlapping activities', () => {
      const activities: EventActivity[] = [
        {
          ...mockActivities[0],
          _id: '1' as any,
          start_time: '10:00',
          end_time: '11:00',
          location: 'Hall A',
        },
        {
          ...mockActivities[1],
          _id: '2' as any,
          start_time: '12:00',
          end_time: '13:00',
          location: 'Hall B',
        },
      ]

      const conflicts = detectConflicts(activities)
      expect(conflicts).toHaveLength(0)
    })

    it('should return empty array for empty input', () => {
      const conflicts = detectConflicts([])
      expect(conflicts).toHaveLength(0)
    })

    it('should return empty array for single activity', () => {
      const conflicts = detectConflicts([mockActivities[0]])
      expect(conflicts).toHaveLength(0)
    })
  })

  describe('hasConflict', () => {
    const conflicts = [
      {
        id: 'conflict-1',
        type: 'time_overlap' as const,
        severity: 'medium' as const,
        description: 'Test conflict',
        affected_activities: ['1' as any, '2' as any],
        suggested_resolution: 'Fix it',
      },
    ]

    it('should return true for activity with conflict', () => {
      expect(hasConflict('1' as any, conflicts)).toBe(true)
    })

    it('should return false for activity without conflict', () => {
      expect(hasConflict('3' as any, conflicts)).toBe(false)
    })
  })

  describe('getActivityConflicts', () => {
    const conflicts = [
      {
        id: 'conflict-1',
        type: 'time_overlap' as const,
        severity: 'medium' as const,
        description: 'Test conflict 1',
        affected_activities: ['1' as any, '2' as any],
        suggested_resolution: 'Fix it',
      },
      {
        id: 'conflict-2',
        type: 'vendor_double_booking' as const,
        severity: 'high' as const,
        description: 'Test conflict 2',
        affected_activities: ['1' as any, '3' as any],
        suggested_resolution: 'Fix it',
      },
    ]

    it('should return all conflicts for an activity', () => {
      const activityConflicts = getActivityConflicts('1' as any, conflicts)
      expect(activityConflicts).toHaveLength(2)
    })

    it('should return empty array for activity without conflicts', () => {
      const activityConflicts = getActivityConflicts('4' as any, conflicts)
      expect(activityConflicts).toHaveLength(0)
    })
  })

  describe('sortActivitiesByTime', () => {
    it('should sort activities by start time', () => {
      const activities: EventActivity[] = [
        {
          ...({} as EventActivity),
          _id: '1' as any,
          start_time: '14:00',
          activity: 'Activity 1',
        },
        {
          ...({} as EventActivity),
          _id: '2' as any,
          start_time: '10:00',
          activity: 'Activity 2',
        },
        {
          ...({} as EventActivity),
          _id: '3' as any,
          start_time: '12:00',
          activity: 'Activity 3',
        },
      ]

      const sorted = sortActivitiesByTime(activities)
      expect(sorted[0].start_time).toBe('10:00')
      expect(sorted[1].start_time).toBe('12:00')
      expect(sorted[2].start_time).toBe('14:00')
    })

    it('should not mutate original array', () => {
      const activities: EventActivity[] = [
        {
          ...({} as EventActivity),
          _id: '1' as any,
          start_time: '14:00',
        },
      ]

      const original = [...activities]
      sortActivitiesByTime(activities)
      expect(activities).toEqual(original)
    })
  })

  describe('formatTimeDisplay', () => {
    it('should format time in 12-hour format', () => {
      expect(formatTimeDisplay('14:30')).toMatch(/2:30 [ap]m/i)
    })

    it('should format midnight correctly', () => {
      expect(formatTimeDisplay('00:00')).toMatch(/12:00 am/i)
    })

    it('should format noon correctly', () => {
      expect(formatTimeDisplay('12:00')).toMatch(/12:00 pm/i)
    })

    it('should format morning time correctly', () => {
      expect(formatTimeDisplay('09:15')).toMatch(/9:15 am/i)
    })
  })

  describe('formatDurationDisplay', () => {
    it('should format minutes only', () => {
      expect(formatDurationDisplay(45)).toBe('45m')
    })

    it('should format hours only', () => {
      expect(formatDurationDisplay(120)).toBe('2h')
    })

    it('should format hours and minutes', () => {
      expect(formatDurationDisplay(90)).toBe('1h 30m')
    })

    it('should handle zero duration', () => {
      expect(formatDurationDisplay(0)).toBe('0m')
    })

    it('should handle large durations', () => {
      expect(formatDurationDisplay(735)).toBe('12h 15m')
    })
  })

  describe('generateTimeSlots', () => {
    it('should generate hourly time slots', () => {
      const slots = generateTimeSlots(9, 12, 60)
      expect(slots).toEqual(['09:00', '10:00', '11:00', '12:00'])
    })

    it('should generate 30-minute intervals', () => {
      const slots = generateTimeSlots(9, 11, 30)
      expect(slots).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00'])
    })

    it('should generate 15-minute intervals', () => {
      const slots = generateTimeSlots(9, 10, 15)
      expect(slots).toEqual(['09:00', '09:15', '09:30', '09:45', '10:00'])
    })

    it('should handle single hour', () => {
      const slots = generateTimeSlots(9, 10, 60)
      expect(slots).toEqual(['09:00', '10:00'])
    })

    it('should work within same day bounds', () => {
      // generateTimeSlots doesn't cross midnight - it works within start/end range
      const slots = generateTimeSlots(9, 12, 60)
      expect(slots).toContain('09:00')
      expect(slots).toContain('10:00')
      expect(slots).toContain('11:00')
      expect(slots).toContain('12:00')
    })
  })
})
