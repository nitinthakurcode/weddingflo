import OpenAI from 'openai'

// =====================================================
// OPENAI AI ARCHITECTURE (February 2026)
// =====================================================
// Primary: GPT-4o-mini ($0.15/$0.60 per 1M tokens)
// Fallback: GPT-4o ($2.50/$10 per 1M tokens)
// Error handling: Seamless failover for 100% uptime
// Lazy initialization: Client created on first use (not at build time)
// =====================================================

// Lazy initialization - client created on first use
let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Missing OPENAI_API_KEY environment variable')
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

// Export getter for AI client (OpenAI)
export function getAIClient(): OpenAI {
  return getOpenAIClient()
}

// Legacy exports for backward compatibility
export const openai = new Proxy({} as OpenAI, {
  get(_, prop) {
    return (getAIClient() as any)[prop]
  }
})

// Fallback AI client (same as primary, but uses gpt-4o for reliability)
export const fallbackAI = new Proxy({} as OpenAI, {
  get(_, prop) {
    return (getOpenAIClient() as any)[prop]
  }
})

// Export provider status (evaluated at runtime)
export const AI_PROVIDER = {
  get primary() { return 'openai' as const },
  get hasFallback() { return true },
  get isUsingDeepSeek() { return false },
} as const

// Model configuration (evaluated at runtime)
export const AI_CONFIG = {
  get model() {
    return process.env.OPENAI_MODEL || 'gpt-4o-mini'
  },
  fallbackModel: 'gpt-4o',
  maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
  temperature: 0.7,
  get provider() { return AI_PROVIDER.primary },
} as const

// Cost calculation (per token)
// February 2026 pricing - OpenAI models
const PRICING = {
  // Primary model - cost effective
  'gpt-4o-mini': {
    input: 0.00000015, // $0.15 per 1M tokens
    output: 0.0000006, // $0.60 per 1M tokens
  },
  // Fallback model - more capable
  'gpt-4o': {
    input: 0.0000025, // $2.50 per 1M tokens
    output: 0.00001, // $10 per 1M tokens
  },
  // Legacy support
  'gpt-4-turbo': {
    input: 0.00001, // $10 per 1M tokens
    output: 0.00003, // $30 per 1M tokens
  },
} as const

export function calculateAICost(
  promptTokens: number,
  completionTokens: number,
  model: string = AI_CONFIG.model
): number {
  const pricing = PRICING[model as keyof typeof PRICING] || PRICING['gpt-4o-mini']

  const inputCost = promptTokens * pricing.input
  const outputCost = completionTokens * pricing.output

  return parseFloat((inputCost + outputCost).toFixed(4))
}

// AI quota limits by subscription tier
export const AI_QUOTA_LIMITS = {
  free: 5,
  starter: 50,
  professional: 200,
  enterprise: 1000,
} as const

export type AIFeatureType =
  | 'budget_prediction'
  | 'email_generation'
  | 'timeline_optimization'
  | 'seating_optimization'
  | 'general_assistant'

// Model constants for explicit model selection
export const AI_MODELS = {
  // OpenAI models
  GPT4O: 'gpt-4o',
  GPT4O_MINI: 'gpt-4o-mini',
  GPT4_TURBO: 'gpt-4-turbo',
  // Smart aliases (use primary model)
  COMPLEX: 'gpt-4o-mini', // Mini handles most complex tasks well
  SIMPLE: 'gpt-4o-mini', // Optimized for simple tasks
} as const

export const AI_DEFAULTS = {
  model: AI_CONFIG.model,
  maxTokens: AI_CONFIG.maxTokens,
  temperature: AI_CONFIG.temperature,
  provider: AI_CONFIG.provider,
} as const
