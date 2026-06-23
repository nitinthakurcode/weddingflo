import OpenAI from 'openai'

// =====================================================
// MULTI-PROVIDER AI CLIENT (June 2026)
// =====================================================
// Primary:  Google Gemini 3.5 Flash  — FREE tier (1,500 RPD, 1M TPM),
//           strongest Flash-tier tool-caller, 1M context, multilingual.
//           Reached via Gemini's OpenAI-compatible endpoint, so the entire
//           codebase keeps using the `openai` SDK surface unchanged.
// Fallback: OpenAI GPT-4o-mini — paid but cheap, real SLA, no model churn,
//           native to the SDK (zero tool-call translation risk). Only fires
//           when Gemini is down or rate-limited → near-zero spend.
//
// Failover is automatic and transparent: every `openai.chat.completions.create`
// call tries the primary provider, then the next, before throwing. Streaming
// and non-streaming are both supported (failover applies to the initial call).
//
// A provider with no API key is skipped, so the app keeps working on whichever
// provider is configured (graceful migration / degradation).
// =====================================================

type ProviderName = 'gemini' | 'openai'

interface ProviderConfig {
  name: ProviderName
  /** Concrete model id for the standard tier (most chat + tool calls). */
  model: string
  /** Concrete model id for the cheap/fast tier (simple one-shot tasks). */
  fastModel: string
  /** Returns a lazily-instantiated OpenAI-compatible client, or null if unconfigured. */
  getClient: () => OpenAI | null
}

// ---- Logical model tiers -------------------------------------------------
// Callers pass these tokens as `model`; the active provider's concrete model
// is substituted at call time. This keeps call sites provider-agnostic.
const TIER_STANDARD = 'wf:chat-standard'
const TIER_FAST = 'wf:chat-fast'

// ---- Lazy client singletons ---------------------------------------------
let geminiClient: OpenAI | null = null
let openaiClient: OpenAI | null = null

function getGeminiClient(): OpenAI | null {
  if (!process.env.GEMINI_API_KEY) return null
  if (!geminiClient) {
    geminiClient = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      // Gemini returns transient 503 "high demand" (capacity, not auth/quota) —
      // affects all tiers. The SDK retries 429/5xx with exponential backoff;
      // only after these are exhausted do we fail over to OpenAI.
      maxRetries: 4,
    })
  }
  return geminiClient
}

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiClient
}

// ---- Provider registry (priority order: primary first) -------------------
const PROVIDERS: ProviderConfig[] = [
  {
    name: 'gemini',
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
    fastModel: process.env.GEMINI_FAST_MODEL || 'gemini-3.1-flash-lite',
    getClient: getGeminiClient,
  },
  {
    name: 'openai',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    fastModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    getClient: getOpenAIClient,
  },
]

interface ActiveProvider {
  config: ProviderConfig
  client: OpenAI
}

/** Providers that currently have an API key, in priority order. */
function activeProviders(): ActiveProvider[] {
  const active: ActiveProvider[] = []
  for (const config of PROVIDERS) {
    const client = config.getClient()
    if (client) active.push({ config, client })
  }
  return active
}

/** Resolve a logical tier token (or any model string) to a provider's model. */
function resolveModel(requested: unknown, config: ProviderConfig): string {
  return requested === TIER_FAST ? config.fastModel : config.model
}

/**
 * Provider-failover replacement for `client.chat.completions.create`.
 * Tries each configured provider in priority order, substituting that
 * provider's concrete model for our logical tier token. Forwards request
 * options (e.g. AbortSignal) untouched. Works for streaming + non-streaming.
 */
async function createWithFailover(body: Record<string, unknown>, options?: unknown): Promise<unknown> {
  const providers = activeProviders()
  if (providers.length === 0) {
    throw new Error('No AI provider configured — set GEMINI_API_KEY and/or OPENAI_API_KEY')
  }

  let lastError: unknown
  for (let i = 0; i < providers.length; i++) {
    const { config, client } = providers[i]
    try {
      const model = resolveModel(body.model, config)
      return await client.chat.completions.create(
        { ...body, model } as Parameters<OpenAI['chat']['completions']['create']>[0],
        options as Parameters<OpenAI['chat']['completions']['create']>[1]
      )
    } catch (error) {
      lastError = error
      const willFailover = i < providers.length - 1
      console.warn(
        `[AI] provider "${config.name}" failed${willFailover ? `, failing over to "${providers[i + 1].config.name}"` : ''}:`,
        error instanceof Error ? error.message : String(error)
      )
    }
  }
  throw lastError
}

// ---- Public client surface (drop-in for the old `openai` export) ---------
// Typed as `OpenAI` so all existing call sites keep their types (stream
// overloads, tool params, response_format, etc.). `.chat.completions.create`
// is intercepted for failover; everything else forwards to the primary client.
const aiFacade = {
  chat: { completions: { create: createWithFailover } },
}

export const openai = new Proxy(aiFacade as unknown as OpenAI, {
  get(target, prop, receiver) {
    if (prop === 'chat') return (target as unknown as typeof aiFacade).chat
    const primary = activeProviders()[0]?.client
    if (!primary) {
      throw new Error('No AI provider configured — set GEMINI_API_KEY and/or OPENAI_API_KEY')
    }
    return Reflect.get(primary, prop, receiver)
  },
})

// ---- Provider status -----------------------------------------------------
export const AI_PROVIDER = {
  get primary(): ProviderName {
    return activeProviders()[0]?.config.name ?? 'gemini'
  },
  get hasFallback(): boolean {
    return activeProviders().length > 1
  },
  get configured(): ProviderName[] {
    return activeProviders().map((p) => p.config.name)
  },
} as const

// ---- Model configuration (provider-agnostic tier tokens) -----------------
export const AI_CONFIG = {
  /** Standard chat/tool tier — resolved to the active provider's model. */
  get model() {
    return TIER_STANDARD
  },
  /** Retained for back-compat; failover is automatic so this is rarely needed. */
  get fallbackModel() {
    return TIER_STANDARD
  },
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || process.env.OPENAI_MAX_TOKENS || '2000'),
  temperature: 0.7,
  get provider() {
    return AI_PROVIDER.primary
  },
} as const

// ---- Cost calculation ----------------------------------------------------
// Published per-token rates (June 2026). Primary traffic runs on Gemini's
// free tier ($0 in practice); rates below are upper-bound estimates used for
// usage tracking. Tier tokens map to the primary provider's published rate.
const PRICING = {
  [TIER_STANDARD]: { input: 0.0000015, output: 0.000009 }, // gemini-3.5-flash
  [TIER_FAST]: { input: 0.0000001, output: 0.0000004 }, // gemini-3.1-flash-lite (approx)
  'gemini-3.5-flash': { input: 0.0000015, output: 0.000009 },
  'gemini-3.1-flash-lite': { input: 0.0000001, output: 0.0000004 },
  'gpt-4o-mini': { input: 0.00000015, output: 0.0000006 },
  'gpt-4o': { input: 0.0000025, output: 0.00001 },
} as const

export function calculateAICost(
  promptTokens: number,
  completionTokens: number,
  model: string = TIER_STANDARD
): number {
  const pricing = PRICING[model as keyof typeof PRICING] || PRICING[TIER_STANDARD]
  const inputCost = promptTokens * pricing.input
  const outputCost = completionTokens * pricing.output
  return parseFloat((inputCost + outputCost).toFixed(4))
}

// ---- AI quota limits by subscription tier --------------------------------
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

// ---- Logical model aliases (provider-agnostic tiers) ---------------------
export const AI_MODELS = {
  COMPLEX: TIER_STANDARD, // full Flash model — handles tools + complex tasks
  SIMPLE: TIER_FAST, // cheaper/faster tier for simple one-shot tasks
} as const

export const AI_DEFAULTS = {
  model: AI_CONFIG.model,
  maxTokens: AI_CONFIG.maxTokens,
  temperature: AI_CONFIG.temperature,
  provider: AI_CONFIG.provider,
} as const
