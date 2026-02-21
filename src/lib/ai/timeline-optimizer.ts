import { openai, AI_MODELS, AI_DEFAULTS } from './openai-client';

export interface TimelineEvent {
  id: string;
  title: string;
  startTime: string; // ISO 8601 format
  endTime: string;
  category: string; // ceremony, reception, vendor, etc.
  location?: string;
  vendors?: string[]; // Vendor IDs or names
  dependencies?: string[]; // Event IDs that must happen before this
}

export interface ConflictDetection {
  conflictType: 'overlap' | 'vendor_conflict' | 'travel_time' | 'dependency';
  severity: 'high' | 'medium' | 'low';
  eventIds: string[];
  description: string;
  suggestion: string;
}

export interface OptimizationSuggestion {
  eventId: string;
  currentTime: string;
  suggestedTime: string;
  reasoning: string;
  impact: string;
}

export interface TimelineOptimizationResult {
  conflicts: ConflictDetection[];
  suggestions: OptimizationSuggestion[];
  optimizationScore: number;
  reasoning: string;
}

export async function optimizeTimeline(
  events: TimelineEvent[]
): Promise<TimelineOptimizationResult> {
  const prompt = `You are a wedding timeline optimizer. Analyze the event schedule and identify conflicts, inefficiencies, and optimization opportunities.

TIMELINE EVENTS (${events.length} total):
${events.map(e => `
- ID: ${e.id}
  Title: ${e.title}
  Time: ${e.startTime} to ${e.endTime}
  Category: ${e.category}
  Location: ${e.location || 'Not specified'}
  Vendors: ${e.vendors?.join(', ') || 'None'}
  Dependencies: ${e.dependencies?.join(', ') || 'None'}
`).join('\n')}

INSTRUCTIONS:
1. Detect conflicts:
   - Time overlaps for events requiring same people/vendors
   - Vendor scheduling conflicts
   - Insufficient travel time between locations
   - Dependency violations (event before its prerequisite)
2. Provide optimization suggestions:
   - Better timing for events
   - Reordering for better flow
   - Buffer time additions
   - Vendor schedule optimization
3. Rate severity: high (must fix), medium (should fix), low (nice to fix)
4. Provide overall optimization score (0-100)

Respond ONLY with valid JSON in this exact format:
{
  "conflicts": [
    {
      "conflictType": "overlap",
      "severity": "high",
      "eventIds": ["event1", "event2"],
      "description": "What the conflict is",
      "suggestion": "How to fix it"
    }
  ],
  "suggestions": [
    {
      "eventId": "event1",
      "currentTime": "2024-06-15T14:00:00Z",
      "suggestedTime": "2024-06-15T15:00:00Z",
      "reasoning": "Why this change is better",
      "impact": "What improves"
    }
  ],
  "optimizationScore": 75,
  "reasoning": "Overall timeline assessment"
}`;

  const response = await openai.chat.completions.create({
    model: AI_MODELS.COMPLEX, // GPT-4o-mini handles complex scheduling efficiently
    messages: [
      {
        role: 'system',
        content: 'You are an expert wedding planner with deep knowledge of event scheduling, logistics, and timeline optimization. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: AI_DEFAULTS.temperature,
    max_tokens: 3000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  const result = JSON.parse(content);
  return result as TimelineOptimizationResult;
}
