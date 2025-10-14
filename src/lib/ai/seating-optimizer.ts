import { openai, AI_MODELS, AI_DEFAULTS } from './openai-client';

export interface Guest {
  id: string;
  name: string;
  relationship?: string;
  dietaryRestrictions?: string[];
  conflicts?: string[]; // IDs of guests they shouldn't sit with
  preferences?: string[]; // IDs of guests they'd like to sit with
}

export interface Table {
  id: string;
  name: string;
  capacity: number;
}

export interface SeatingAssignment {
  tableId: string;
  tableName: string;
  guests: string[]; // Guest IDs
  compatibilityScore: number;
  reasoning: string;
}

export interface SeatingOptimizationResult {
  assignments: SeatingAssignment[];
  overallScore: number;
  reasoning: string;
  warnings: string[];
}

export async function optimizeSeating(
  guests: Guest[],
  tables: Table[]
): Promise<SeatingOptimizationResult> {
  // Prepare the prompt for GPT-4
  const prompt = `You are a wedding seating optimizer. Given a list of guests and tables, create optimal seating arrangements.

GUESTS (${guests.length} total):
${guests.map(g => `
- ID: ${g.id}
  Name: ${g.name}
  Relationship: ${g.relationship || 'Not specified'}
  Dietary: ${g.dietaryRestrictions?.join(', ') || 'None'}
  Conflicts with: ${g.conflicts?.map(id => guests.find(x => x.id === id)?.name || id).join(', ') || 'None'}
  Prefers to sit with: ${g.preferences?.map(id => guests.find(x => x.id === id)?.name || id).join(', ') || 'None'}
`).join('\n')}

TABLES (${tables.length} total):
${tables.map(t => `- ${t.name} (Capacity: ${t.capacity})`).join('\n')}

INSTRUCTIONS:
1. Assign guests to tables, respecting capacity limits
2. Keep conflicting guests at different tables
3. Try to seat preferred guests together when possible
4. Group guests by relationship when it makes sense (family, friends, coworkers)
5. Consider dietary restrictions for catering logistics
6. Provide a compatibility score (0-100) for each table
7. Explain your reasoning

Respond ONLY with valid JSON in this exact format:
{
  "assignments": [
    {
      "tableId": "table_id",
      "tableName": "Table 1",
      "guestIds": ["guest_id_1", "guest_id_2"],
      "compatibilityScore": 85,
      "reasoning": "Why these guests work well together"
    }
  ],
  "overallScore": 88,
  "reasoning": "Overall seating strategy explanation",
  "warnings": ["Any issues or concerns"]
}`;

  const response = await openai.chat.completions.create({
    model: AI_MODELS.COMPLEX,
    messages: [
      {
        role: 'system',
        content: 'You are an expert wedding planner specializing in seating arrangements. You understand social dynamics and create harmonious table assignments.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: AI_DEFAULTS.temperature,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  const result = JSON.parse(content);

  // Validate and transform the response
  const assignments: SeatingAssignment[] = result.assignments.map((a: any) => ({
    tableId: a.tableId,
    tableName: a.tableName,
    guests: a.guestIds,
    compatibilityScore: a.compatibilityScore,
    reasoning: a.reasoning,
  }));

  return {
    assignments,
    overallScore: result.overallScore,
    reasoning: result.reasoning,
    warnings: result.warnings || [],
  };
}
