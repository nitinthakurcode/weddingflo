import OpenAI from 'openai'

// =====================================================
// DUAL AI PROVIDER ARCHITECTURE (October 2025)
// =====================================================
// Primary: DeepSeek V3 (10x cheaper, $0.27/$1.10 per 1M tokens)
// Fallback: OpenAI GPT-4o ($2.50/$10 per 1M tokens)
// Auto-switching: Seamless failover for 100% uptime
// Cost Savings: 85-90% reduction vs OpenAI-only
// =====================================================

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable (required for fallback)')
}

// Initialize DeepSeek client (primary provider)
const deepseek = process.env.DEEPSEEK_API_KEY
  ? new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1',
    })
  : null

// Initialize OpenAI client (fallback provider)
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Export primary client (DeepSeek if available, otherwise OpenAI)
export const openai = deepseek || openaiClient

// Export fallback client for explicit use
export const fallbackAI = openaiClient

// Export provider status
export const AI_PROVIDER = {
  primary: deepseek ? 'deepseek' : 'openai',
  hasFallback: !!deepseek, // Only true if DeepSeek is primary
  isUsingDeepSeek: !!deepseek,
} as const

// Model configuration
export const AI_CONFIG = {
  model: deepseek
    ? process.env.DEEPSEEK_MODEL || 'deepseek-chat'
    : process.env.OPENAI_MODEL || 'gpt-4o',
  fallbackModel: process.env.OPENAI_MODEL || 'gpt-4o',
  maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
  temperature: 0.7,
  provider: AI_PROVIDER.primary,
} as const

// Cost calculation (per token)
// Updated October 2025 pricing with DeepSeek
const PRICING = {
  // DeepSeek V3 (Primary - 85-90% cheaper)
  'deepseek-chat': {
    input: 0.00000027, // $0.27 per 1M tokens
    output: 0.0000011, // $1.10 per 1M tokens
  },
  'deepseek-coder': {
    input: 0.00000027, // $0.27 per 1M tokens
    output: 0.0000011, // $1.10 per 1M tokens
  },
  // OpenAI (Fallback)
  'gpt-4o': {
    input: 0.0000025, // $2.50 per 1M tokens
    output: 0.00001, // $10 per 1M tokens
  },
  'gpt-4o-mini': {
    input: 0.00000015, // $0.15 per 1M tokens
    output: 0.0000006, // $0.60 per 1M tokens
  },
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
  const pricing = PRICING[model as keyof typeof PRICING] || PRICING['gpt-4o']

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

// Legacy exports for backward compatibility with existing API routes
export const AI_MODELS = {
  // DeepSeek models (Primary - use when available)
  DEEPSEEK_CHAT: 'deepseek-chat',
  DEEPSEEK_CODER: 'deepseek-coder',
  // OpenAI models (Fallback)
  GPT4O: 'gpt-4o',
  GPT4O_MINI: 'gpt-4o-mini',
  GPT4_TURBO: 'gpt-4-turbo',
  // Smart aliases (use primary provider)
  COMPLEX: AI_CONFIG.model, // Uses DeepSeek if available, else GPT-4o
  SIMPLE: AI_CONFIG.model, // Same model for all tasks (DeepSeek is cheap enough)
} as const

export const AI_DEFAULTS = {
  model: AI_CONFIG.model,
  maxTokens: AI_CONFIG.maxTokens,
  temperature: AI_CONFIG.temperature,
  provider: AI_CONFIG.provider,
} as const
