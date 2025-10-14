import { openai, AI_MODELS } from './openai-client';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AssistantContext {
  clientName?: string;
  eventDate?: string;
  guestCount?: number;
  totalBudget?: number;
  recentActivity?: string[];
}

export async function* chatWithAssistant(
  messages: Message[],
  context: AssistantContext
): AsyncGenerator<string> {
  // Build system prompt with context
  const systemPrompt = `You are a helpful wedding planning assistant for WeddingFlow Pro. You help users manage their wedding planning with insights, recommendations, and actionable advice.

CONTEXT ABOUT THIS WEDDING:
${context.clientName ? `- Client: ${context.clientName}` : ''}
${context.eventDate ? `- Event Date: ${context.eventDate}` : ''}
${context.guestCount ? `- Guest Count: ${context.guestCount}` : ''}
${context.totalBudget ? `- Total Budget: $${context.totalBudget.toLocaleString()}` : ''}
${context.recentActivity?.length ? `- Recent Activity:\n  ${context.recentActivity.join('\n  ')}` : ''}

CAPABILITIES:
- Answer questions about wedding planning
- Provide insights based on their data
- Suggest optimizations and improvements
- Help with decisions and recommendations
- Explain features and how to use them

GUIDELINES:
- Be friendly, supportive, and professional
- Provide specific, actionable advice
- Reference their actual data when available
- Keep responses concise but helpful
- Ask clarifying questions when needed
- Suggest using AI features (seating optimizer, budget predictor, etc.) when relevant`;

  const stream = await openai.chat.completions.create({
    model: AI_MODELS.COMPLEX,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    temperature: 0.7,
    max_tokens: 1000,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
