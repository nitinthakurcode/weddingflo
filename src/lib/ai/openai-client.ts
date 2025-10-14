import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Model configurations for different use cases
export const AI_MODELS = {
  // Use GPT-4o for complex tasks (seating, timeline optimization)
  COMPLEX: 'gpt-4o' as const,
  // Use GPT-4o-mini for simple tasks (email generation, simple predictions)
  SIMPLE: 'gpt-4o-mini' as const,
} as const;

// Common API parameters
export const AI_DEFAULTS = {
  temperature: 0.7,
  max_tokens: 2000,
} as const;
