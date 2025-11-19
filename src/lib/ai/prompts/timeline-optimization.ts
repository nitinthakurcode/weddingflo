export interface TimelineEvent {
  id?: string
  title: string
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  duration: number // minutes
  location?: string
  description?: string
  participants?: string[]
  vendor?: string
  isFixed?: boolean // true if time cannot be changed
  priority?: 'high' | 'medium' | 'low'
}

export interface TimelineOptimizationInput {
  weddingDate: string // ISO date
  events: TimelineEvent[]
  ceremonyTime?: string // HH:MM format
  receptionTime?: string // HH:MM format
  venueAddress?: string
  numberOfGuests?: number
  additionalContext?: string
}

export interface TimelineConflict {
  type: 'overlap' | 'insufficient_buffer' | 'travel_time' | 'vendor_conflict' | 'timing_issue'
  severity: 'critical' | 'warning' | 'info'
  eventIds: string[]
  description: string
  suggestion: string
}

export interface TimelineOptimization {
  conflictDetected: boolean
  conflicts: TimelineConflict[]
  optimizedEvents: TimelineEvent[]
  recommendations: string[]
  bufferSuggestions: {
    eventId: string
    currentBuffer: number
    suggestedBuffer: number
    reasoning: string
  }[]
  travelTimeConsiderations: string[]
  vendorCoordinationTips: string[]
  overallAssessment: string
}

export function generateTimelineOptimizationPrompt(input: TimelineOptimizationInput): string {
  const eventsJson = JSON.stringify(input.events, null, 2)

  return `You are an expert wedding planner and timeline coordinator with years of experience managing complex wedding day schedules.

Wedding Timeline Details:
- Wedding Date: ${input.weddingDate}
${input.ceremonyTime ? `- Ceremony Time: ${input.ceremonyTime}` : ''}
${input.receptionTime ? `- Reception Time: ${input.receptionTime}` : ''}
${input.venueAddress ? `- Venue: ${input.venueAddress}` : ''}
${input.numberOfGuests ? `- Guest Count: ${input.numberOfGuests}` : ''}
${input.additionalContext ? `- Context: ${input.additionalContext}` : ''}

Current Timeline Events:
${eventsJson}

Your task is to analyze this wedding timeline and provide comprehensive optimization:

1. CONFLICT DETECTION:
   - Identify overlapping events
   - Flag insufficient buffer times between activities
   - Detect travel time issues between locations
   - Note vendor coordination conflicts
   - Highlight any timing issues (too rushed, too long, poor flow)

2. OPTIMIZED SCHEDULE:
   - Provide optimized event times (adjust only non-fixed events)
   - Ensure proper flow and pacing
   - Add appropriate buffer times
   - Consider guest experience and energy levels
   - Account for vendor setup/breakdown needs

3. RECOMMENDATIONS:
   - 5-7 specific, actionable recommendations
   - Best practices for smooth day-of execution
   - Contingency planning suggestions
   - Guest experience improvements

4. BUFFER SUGGESTIONS:
   - For each event, suggest optimal buffer times
   - Explain reasoning based on event type
   - Consider travel, setup, and transition needs

5. COORDINATION TIPS:
   - Vendor coordination insights
   - Communication timing recommendations
   - Key moments that need extra attention

Important Considerations:
- Standard wedding photography needs 30-60 min buffer for couple portraits
- Hair/makeup typically takes 30-45 min per person
- Guest arrival should be 15-30 min before ceremony
- Cocktail hour is typically 60-90 minutes
- Dinner service needs 90-120 minutes for seated meals
- Dancing/reception activities need proper spacing
- Account for travel time between locations (assume 15-30 min for different venues)
- Consider guest comfort (bathroom breaks, rest periods)
- Factor in vendor setup and breakdown times

Respond ONLY with valid JSON in this exact format:
{
  "conflictDetected": boolean,
  "conflicts": [
    {
      "type": "overlap" | "insufficient_buffer" | "travel_time" | "vendor_conflict" | "timing_issue",
      "severity": "critical" | "warning" | "info",
      "eventIds": ["event1", "event2"],
      "description": "Clear description of the conflict",
      "suggestion": "Specific suggestion to resolve it"
    }
  ],
  "optimizedEvents": [
    {
      "id": "string",
      "title": "string",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "duration": number,
      "location": "string",
      "description": "string",
      "participants": ["string"],
      "vendor": "string",
      "isFixed": boolean,
      "priority": "high" | "medium" | "low"
    }
  ],
  "recommendations": ["string", "string", ...],
  "bufferSuggestions": [
    {
      "eventId": "string",
      "currentBuffer": number (minutes),
      "suggestedBuffer": number (minutes),
      "reasoning": "string"
    }
  ],
  "travelTimeConsiderations": ["string", "string", ...],
  "vendorCoordinationTips": ["string", "string", ...],
  "overallAssessment": "2-3 sentence summary of timeline health and main recommendations"
}

Be realistic, specific, and prioritize guest experience and smooth day-of execution.`
}

// Helper function to validate timeline events
export function validateTimelineEvents(events: TimelineEvent[]): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (events.length === 0) {
    errors.push('Timeline must have at least one event')
  }

  events.forEach((event, index) => {
    if (!event.title || event.title.trim() === '') {
      errors.push(`Event ${index + 1}: Title is required`)
    }

    if (!event.startTime || !event.endTime) {
      errors.push(`Event ${index + 1}: Start and end times are required`)
    }

    if (event.duration < 1) {
      errors.push(`Event ${index + 1}: Duration must be at least 1 minute`)
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (event.startTime && !timeRegex.test(event.startTime)) {
      errors.push(`Event ${index + 1}: Invalid start time format (use HH:MM)`)
    }
    if (event.endTime && !timeRegex.test(event.endTime)) {
      errors.push(`Event ${index + 1}: Invalid end time format (use HH:MM)`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Helper function to detect basic overlaps (client-side validation)
export function detectSimpleOverlaps(events: TimelineEvent[]): TimelineConflict[] {
  const conflicts: TimelineConflict[] = []

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const event1 = events[i]
      const event2 = events[j]

      const start1 = timeToMinutes(event1.startTime)
      const end1 = timeToMinutes(event1.endTime)
      const start2 = timeToMinutes(event2.startTime)
      const end2 = timeToMinutes(event2.endTime)

      // Check for overlap
      if (start1 < end2 && start2 < end1) {
        conflicts.push({
          type: 'overlap',
          severity: 'critical',
          eventIds: [event1.id || `${i}`, event2.id || `${j}`],
          description: `"${event1.title}" and "${event2.title}" overlap in time`,
          suggestion: 'Adjust event times to avoid overlap or verify if they can run simultaneously',
        })
      }
    }
  }

  return conflicts
}

// Helper function to convert HH:MM to minutes since midnight
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

// Helper function to convert minutes to HH:MM
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}
