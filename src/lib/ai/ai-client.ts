import OpenAI from 'openai'

// =====================================================
// MULTI-PROVIDER AI CLIENT (June 2026)
// =====================================================
// Any OpenAI-compatible provider plugs in via env — no code changes needed to
// swap or reorder providers. A provider is active only if its API key env var is
// set, so the app runs on whatever is configured (graceful degradation/migration).
//
// Failover is automatic and transparent across the active providers, in the order
// given by `AI_PROVIDER_ORDER` (comma-separated; default `groq,cerebras,openai`):
//
//   • Non-streaming: tries each provider; fails over on a thrown error OR on an
//     EMPTY completion (no content AND no tool_calls — the "provider accepted the
//     request but returned nothing" failure mode, e.g. an overloaded model).
//   • Streaming:    `streamChatWithFailover` forwards chunks live and fails over
//     when a provider's stream errors before emitting anything OR ends EMPTY.
//     (The plain `openai.chat.completions.create` failover only covers the initial
//      call; streaming consumers MUST use `streamChatWithFailover` to get
//      empty-stream failover — this is what fixes the chatbot's empty replies when
//      the primary provider is "busy"/503.)
//
// PROVIDER STRATEGY — privacy-safe, free-first, then paid backstop:
//   This app holds customer PII (guest contacts, vendor data, budgets) and serves
//   EU users, so we route ONLY through providers that do NOT train on prompts and
//   offer Zero Data Retention (ZDR). That rules out DeepSeek-direct (China-hosted,
//   trains by default) and every "free" Gemini / OpenRouter free-tier model (those
//   train on free-tier prompts). Default chain:
//     1. groq     — free tier, US/GCP host + ZDR, ~500 tok/s, strong tool-calling.
//                   Replaced Gemini as primary after Gemini's chronic 503 overload.
//     2. cerebras — free tier (1M tokens/day), never stores/logs/reuses data.
//                   Catches a throttled/overloaded Groq at $0.
//     3. openai   — PAID backstop (gpt-4.1-mini), API data excluded from training.
//                   Fires only when both free providers fail → ≈ $0 in steady state.
//   Gemini stays defined (a PAID Gemini/Vertex key is privacy-safe) but is OUT of
//   the default order. All concrete model ids are env-overridable; verify exact ids
//   against each provider's GET /v1/models before changing the pinned defaults.
// =====================================================

export type ProviderName = 'groq' | 'cerebras' | 'openai' | 'openrouter' | 'gemini' | 'deepseek'

interface ProviderDef {
  /** Env var holding this provider's API key; provider is skipped if unset. */
  apiKeyEnv: string
  /** OpenAI-compatible base URL (omit for OpenAI's own default). */
  baseURL?: string
  /** Standard tier model id (most chat + tool calls). Env-overridable. */
  model: string
  /** Cheap/fast tier model id (simple one-shot tasks). Env-overridable. */
  fastModel: string
}

// ---- Logical model tiers -------------------------------------------------
// Callers pass these tokens as `model`; the active provider's concrete model id
// is substituted at call time, keeping call sites provider-agnostic.
const TIER_STANDARD = 'wf:chat-standard'
const TIER_FAST = 'wf:chat-fast'

// ---- Built-in provider definitions (all model ids env-overridable) -------
const PROVIDER_DEFS: Record<ProviderName, ProviderDef> = {
  openrouter: {
    apiKeyEnv: 'OPENROUTER_API_KEY',
    baseURL: 'https://openrouter.ai/api/v1',
    // DeepSeek V3.2 via OpenRouter: cheap, strong tool-calling, multilingual,
    // multi-provider (OpenRouter load-balances it). Pin to avoid deprecation churn.
    model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3.2',
    fastModel: process.env.OPENROUTER_FAST_MODEL || process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3.2',
  },
  openai: {
    apiKeyEnv: 'OPENAI_API_KEY',
    // gpt-4.1-mini for the standard tier: this is the PAID backstop that only fires
    // when both free providers fail, so we buy best-in-class tool-calling reliability
    // for the moment it actually matters. Fast tier stays on the cheaper nano.
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    fastModel: process.env.OPENAI_FAST_MODEL || 'gpt-4.1-nano',
  },
  gemini: {
    apiKeyEnv: 'GEMINI_API_KEY',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
    fastModel: process.env.GEMINI_FAST_MODEL || 'gemini-3.1-flash-lite',
  },
  deepseek: {
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    baseURL: 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    fastModel: process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat',
  },
  groq: {
    apiKeyEnv: 'GROQ_API_KEY',
    baseURL: 'https://api.groq.com/openai/v1',
    // PRIMARY. llama-3.3-70b-versatile / llama-3.1-8b-instant were DEPRECATED by Groq
    // on 2026-06-17; the official replacements are openai/gpt-oss-120b (standard) and
    // openai/gpt-oss-20b (fast) — both support streaming tool_calls + JSON mode.
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    fastModel: process.env.GROQ_FAST_MODEL || 'openai/gpt-oss-20b',
  },
  cerebras: {
    apiKeyEnv: 'CEREBRAS_API_KEY',
    baseURL: 'https://api.cerebras.ai/v1',
    // SECONDARY (free, 1M tokens/day, US-hosted, never stores/logs/reuses prompts).
    // Qwen3-32B is a strong tool-caller; verify the live id via GET /v1/models.
    model: process.env.CEREBRAS_MODEL || 'qwen-3-32b',
    fastModel: process.env.CEREBRAS_FAST_MODEL || process.env.CEREBRAS_MODEL || 'qwen-3-32b',
  },
}

const DEFAULT_ORDER: ProviderName[] = ['groq', 'cerebras', 'openai']

/** Provider priority from `AI_PROVIDER_ORDER` (csv), filtered to known names. */
function providerOrder(): ProviderName[] {
  const raw = process.env.AI_PROVIDER_ORDER
  if (raw) {
    const parsed = raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s): s is ProviderName => s in PROVIDER_DEFS)
    if (parsed.length) return parsed
  }
  return DEFAULT_ORDER
}

// ---- Lazy client cache (keyed by provider; null = unconfigured) ----------
const clientCache = new Map<ProviderName, OpenAI | null>()

function getClient(name: ProviderName): OpenAI | null {
  if (clientCache.has(name)) return clientCache.get(name) ?? null
  const def = PROVIDER_DEFS[name]
  const key = process.env[def.apiKeyEnv]
  let client: OpenAI | null = null
  if (key) {
    client = new OpenAI({
      apiKey: key,
      ...(def.baseURL ? { baseURL: def.baseURL } : {}),
      // Transient capacity/throttle errors (not auth/quota) get a few SDK retries
      // with backoff before we fail over: Gemini 503 "high demand", and the free
      // Groq/Cerebras tiers' 429 rate-limit bursts. Paid/OpenAI keep the default 2.
      maxRetries: name === 'gemini' ? 4 : name === 'groq' || name === 'cerebras' ? 3 : 2,
      ...(name === 'openrouter'
        ? {
            defaultHeaders: {
              'HTTP-Referer': process.env.APP_URL || 'https://weddingflo.app',
              'X-Title': 'WeddingFlo',
            },
          }
        : {}),
    })
  }
  clientCache.set(name, client)
  return client
}

interface ActiveProvider {
  name: ProviderName
  client: OpenAI
  model: string
  fastModel: string
}

/** Configured providers (key present), in priority order. */
function activeProviders(): ActiveProvider[] {
  const out: ActiveProvider[] = []
  for (const name of providerOrder()) {
    const client = getClient(name)
    if (client) {
      const def = PROVIDER_DEFS[name]
      out.push({ name, client, model: def.model, fastModel: def.fastModel })
    }
  }
  return out
}

/** Resolve a logical tier token to a provider's concrete model id. */
function resolveModel(requested: unknown, p: ActiveProvider): string {
  return requested === TIER_FAST ? p.fastModel : p.model
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && (err.name === 'AbortError' || err.name === 'APIUserAbortError')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CreateBody = Record<string, any>

/**
 * Provider-failover replacement for `client.chat.completions.create`.
 * Tries each active provider in order, substituting its concrete model. Fails
 * over on a thrown error and (for non-streaming calls) on an EMPTY completion.
 * For STREAMING calls this only covers the initial call — use
 * `streamChatWithFailover` to also fail over on empty/errored streams.
 */
async function createWithFailover(body: CreateBody, options?: unknown): Promise<unknown> {
  const providers = activeProviders()
  if (providers.length === 0) {
    throw new Error('No AI provider configured — set GROQ_API_KEY, CEREBRAS_API_KEY and/or OPENAI_API_KEY')
  }

  let lastError: unknown
  for (let i = 0; i < providers.length; i++) {
    const p = providers[i]
    const hasNext = i < providers.length - 1
    try {
      const model = resolveModel(body.model, p)
      const resp = await p.client.chat.completions.create(
        { ...body, model } as Parameters<OpenAI['chat']['completions']['create']>[0],
        options as Parameters<OpenAI['chat']['completions']['create']>[1],
      )

      // Non-streaming empty-completion failover: provider answered but returned
      // nothing usable (no content + no tool calls) → try the next provider.
      if (!body.stream && hasNext) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = (resp as any)?.choices?.[0]?.message
        const empty = !!msg && !msg.content && !(Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0)
        if (empty) {
          console.warn(`[AI] provider "${p.name}" returned an empty completion, failing over to "${providers[i + 1].name}"`)
          continue
        }
      }
      return resp
    } catch (error) {
      lastError = error
      if (isAbortError(error)) throw error
      if (!hasNext) break
      console.warn(
        `[AI] provider "${p.name}" failed, failing over to "${providers[i + 1].name}":`,
        error instanceof Error ? error.message : String(error),
      )
    }
  }
  throw lastError
}

/**
 * Streaming chat completion with empty/errored-stream failover.
 *
 * Forwards each chunk LIVE (no buffering, so latency is unchanged on the happy
 * path) while tracking whether the provider emitted any content or tool-call. If
 * the stream ends EMPTY, or errors BEFORE emitting anything, it transparently
 * moves to the next provider — because nothing meaningful was forwarded yet, the
 * fallback's output streams cleanly. If a provider errors AFTER emitting, the
 * error is rethrown (a partially-streamed turn can't be cleanly restarted).
 *
 * Consumers MUST emit terminal SSE events (`done`/`[DONE]`) only AFTER iterating
 * this generator, so an empty primary's `finish_reason: stop` chunk doesn't close
 * the stream before failover.
 */
export async function* streamChatWithFailover(
  body: CreateBody,
  options?: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): AsyncGenerator<any, void, unknown> {
  const providers = activeProviders()
  if (providers.length === 0) {
    throw new Error('No AI provider configured — set GROQ_API_KEY, CEREBRAS_API_KEY and/or OPENAI_API_KEY')
  }

  let lastError: unknown
  for (let i = 0; i < providers.length; i++) {
    const p = providers[i]
    const hasNext = i < providers.length - 1
    const model = resolveModel(body.model, p)
    // A provider has "succeeded" only if it streamed real CONTENT or COMPLETED a
    // tool call (finish_reason === 'tool_calls'). A bare stop with no output, or a
    // tool call that streams partial args but never completes (a degenerate
    // response from an overloaded model — observed with Gemini under load), counts
    // as a failure and triggers failover.
    let sawContent = false
    let sawCompletedToolCall = false
    try {
      const stream = (await p.client.chat.completions.create(
        { ...body, model, stream: true } as Parameters<OpenAI['chat']['completions']['create']>[0],
        options as Parameters<OpenAI['chat']['completions']['create']>[1],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      )) as unknown as AsyncIterable<any>

      for await (const chunk of stream) {
        const choice = chunk?.choices?.[0]
        if (choice?.delta?.content) sawContent = true
        if (choice?.finish_reason === 'tool_calls') sawCompletedToolCall = true
        yield chunk
      }

      if (sawContent || sawCompletedToolCall) return // usable output → done
      if (!hasNext) return // last provider, nothing usable — nothing more to try
      console.warn(`[AI] provider "${p.name}" produced no usable output, failing over to "${providers[i + 1].name}"`)
    } catch (error) {
      lastError = error
      // Don't fail over on a deliberate abort, on the last provider, or once we've
      // already streamed CONTENT (can't cleanly restart a partial answer). A
      // partial-but-incomplete tool call (no content yet) IS safe to retry — the
      // consumer resets its tool-call assembly when the next provider sends a new id.
      if (isAbortError(error) || sawContent || !hasNext) throw error
      console.warn(
        `[AI] provider "${p.name}" stream errored before usable output, failing over to "${providers[i + 1].name}":`,
        error instanceof Error ? error.message : String(error),
      )
    }
  }
  if (lastError) throw lastError
}

// ---- Public client surface (drop-in for the old `openai` export) ---------
// Typed as `OpenAI` so all existing call sites keep their types.
// `.chat.completions.create` is intercepted for failover; everything else
// forwards to the highest-priority active client.
const aiFacade = {
  chat: { completions: { create: createWithFailover } },
}

export const openai = new Proxy(aiFacade as unknown as OpenAI, {
  get(target, prop, receiver) {
    if (prop === 'chat') return (target as unknown as typeof aiFacade).chat
    const primary = activeProviders()[0]?.client
    if (!primary) {
      throw new Error('No AI provider configured — set GROQ_API_KEY, CEREBRAS_API_KEY and/or OPENAI_API_KEY')
    }
    return Reflect.get(primary, prop, receiver)
  },
})

// ---- Provider status -----------------------------------------------------
export const AI_PROVIDER = {
  get primary(): ProviderName {
    return activeProviders()[0]?.name ?? providerOrder()[0]
  },
  get hasFallback(): boolean {
    return activeProviders().length > 1
  },
  get configured(): ProviderName[] {
    return activeProviders().map((p) => p.name)
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
// Approximate per-token rates (June 2026) for usage tracking. Tier tokens map to
// a low-cost default; concrete ids are listed for when callers pass them through.
const PRICING: Record<string, { input: number; output: number }> = {
  // Tiers approximate the default primary (Groq gpt-oss). On the free tier real cost
  // is $0; these rates are for usage tracking once paid limits are crossed.
  [TIER_STANDARD]: { input: 0.00000015, output: 0.0000006 }, // ~groq openai/gpt-oss-120b
  [TIER_FAST]: { input: 0.000000075, output: 0.0000003 }, // ~groq openai/gpt-oss-20b
  'openai/gpt-oss-120b': { input: 0.00000015, output: 0.0000006 },
  'openai/gpt-oss-20b': { input: 0.000000075, output: 0.0000003 },
  'qwen-3-32b': { input: 0.0000004, output: 0.0000008 }, // ~cerebras paid (free below limit)
  'deepseek/deepseek-chat-v3.2': { input: 0.00000028, output: 0.00000042 },
  'deepseek-chat': { input: 0.00000014, output: 0.00000028 },
  'gpt-4.1-nano': { input: 0.0000001, output: 0.0000004 },
  'gpt-4.1-mini': { input: 0.0000004, output: 0.0000016 },
  'gpt-4o-mini': { input: 0.00000015, output: 0.0000006 },
  'gemini-3.5-flash': { input: 0.0000015, output: 0.000009 },
  'gemini-3.1-flash-lite': { input: 0.0000001, output: 0.0000004 },
  'llama-3.3-70b-versatile': { input: 0.00000059, output: 0.00000079 },
}

export function calculateAICost(
  promptTokens: number,
  completionTokens: number,
  model: string = TIER_STANDARD,
): number {
  const pricing = PRICING[model] || PRICING[TIER_STANDARD]
  const inputCost = promptTokens * pricing.input
  const outputCost = completionTokens * pricing.output
  return parseFloat((inputCost + outputCost).toFixed(6))
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
  COMPLEX: TIER_STANDARD, // full model — handles tools + complex tasks
  SIMPLE: TIER_FAST, // cheaper/faster tier for simple one-shot tasks
} as const

export const AI_DEFAULTS = {
  model: AI_CONFIG.model,
  maxTokens: AI_CONFIG.maxTokens,
  temperature: AI_CONFIG.temperature,
  provider: AI_CONFIG.provider,
} as const
