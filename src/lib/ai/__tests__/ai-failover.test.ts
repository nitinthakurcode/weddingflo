/**
 * AI provider failover contract.
 *
 * Guards the reliability fix: the chatbot must NEVER return an empty reply when a
 * provider is overloaded — it must transparently fail over to the next provider on
 * an empty OR errored stream (and on an empty non-streaming completion), while
 * NOT failing over on a deliberate abort.
 *
 * `openai` is mocked so each provider client is identified by its apiKey, and we
 * script per-provider behavior (empty stream / errored / content / abort).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => ({ behaviors: new Map<string, (body?: unknown) => unknown>() }))

vi.mock('openai', () => ({
  default: class MockOpenAI {
    apiKey: string
    chat: { completions: { create: (body: unknown) => Promise<unknown> } }
    constructor(opts: { apiKey: string }) {
      this.apiKey = opts.apiKey
      const apiKey = this.apiKey
      this.chat = {
        completions: {
          create: async (body: unknown) => {
            const fn = h.behaviors.get(apiKey)
            if (!fn) return { choices: [{ message: { content: 'noop' } }] }
            return fn(body) // may throw, return an async-iterable stream, or a response
          },
        },
      }
    }
  },
}))

async function* gen(chunks: unknown[]) {
  for (const c of chunks) yield c
}
const contentChunk = (c: string) => ({ choices: [{ delta: { content: c }, finish_reason: null }] })
const stopChunk = () => ({ choices: [{ delta: {}, finish_reason: 'stop' }] })

async function load() {
  vi.resetModules()
  return import('../ai-client')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function collectStream(it: AsyncIterable<any>): Promise<string> {
  let text = ''
  for await (const ch of it) text += ch?.choices?.[0]?.delta?.content || ''
  return text
}

beforeEach(() => {
  h.behaviors.clear()
  process.env.AI_PROVIDER_ORDER = 'openai,gemini' // p1=openai(k1), p2=gemini(k2)
  process.env.OPENAI_API_KEY = 'k1'
  process.env.GEMINI_API_KEY = 'k2'
  delete process.env.OPENROUTER_API_KEY
  delete process.env.DEEPSEEK_API_KEY
  delete process.env.GROQ_API_KEY
})

describe('streamChatWithFailover', () => {
  it('fails over when the primary returns an EMPTY stream', async () => {
    h.behaviors.set('k1', () => gen([stopChunk()])) // empty: stop, no content
    h.behaviors.set('k2', () => gen([contentChunk('hello'), stopChunk()]))
    const mod = await load()
    const text = await collectStream(mod.streamChatWithFailover({ model: mod.AI_CONFIG.model, messages: [] }))
    expect(text).toBe('hello')
  })

  it('fails over when the primary stream ERRORS before emitting', async () => {
    h.behaviors.set('k1', () => {
      throw new Error('503 high demand')
    })
    h.behaviors.set('k2', () => gen([contentChunk('recovered')]))
    const mod = await load()
    const text = await collectStream(mod.streamChatWithFailover({ model: mod.AI_CONFIG.model, messages: [] }))
    expect(text).toBe('recovered')
  })

  it('fails over when the primary streams a PARTIAL tool call that never completes', async () => {
    // Observed Gemini-under-load failure: streams a tool_call arg fragment but ends
    // with finish_reason 'stop' instead of 'tool_calls' → no usable output.
    const partialToolChunk = {
      choices: [{ delta: { tool_calls: [{ index: 0, id: 'x', function: { name: 'foo', arguments: '{' } }] }, finish_reason: null }],
    }
    const badStop = { choices: [{ delta: {}, finish_reason: 'stop' }] }
    h.behaviors.set('k1', () => gen([partialToolChunk, badStop]))
    h.behaviors.set('k2', () => gen([contentChunk('recovered')]))
    const mod = await load()
    const text = await collectStream(mod.streamChatWithFailover({ model: mod.AI_CONFIG.model, messages: [] }))
    expect(text).toBe('recovered')
  })

  it('treats a COMPLETED tool call (finish_reason tool_calls) as success — no failover', async () => {
    let p2called = false
    const toolChunk = {
      choices: [{ delta: { tool_calls: [{ index: 0, id: 'y', function: { name: 'foo', arguments: '{}' } }] }, finish_reason: 'tool_calls' }],
    }
    h.behaviors.set('k1', () => gen([toolChunk]))
    h.behaviors.set('k2', () => {
      p2called = true
      return gen([contentChunk('nope')])
    })
    const mod = await load()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chunks: any[] = []
    for await (const c of mod.streamChatWithFailover({ model: mod.AI_CONFIG.model, messages: [] })) chunks.push(c)
    expect(chunks.some((c) => c.choices[0]?.finish_reason === 'tool_calls')).toBe(true)
    expect(p2called).toBe(false)
  })

  it('does NOT fail over on a deliberate abort', async () => {
    let p2called = false
    const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' })
    h.behaviors.set('k1', () => {
      throw abortErr
    })
    h.behaviors.set('k2', () => {
      p2called = true
      return gen([contentChunk('should-not-run')])
    })
    const mod = await load()
    await expect(collectStream(mod.streamChatWithFailover({ model: mod.AI_CONFIG.model, messages: [] }))).rejects.toThrow('aborted')
    expect(p2called).toBe(false)
  })

  it('throws when ALL providers fail', async () => {
    h.behaviors.set('k1', () => {
      throw new Error('down-1')
    })
    h.behaviors.set('k2', () => {
      throw new Error('down-2')
    })
    const mod = await load()
    await expect(collectStream(mod.streamChatWithFailover({ model: mod.AI_CONFIG.model, messages: [] }))).rejects.toThrow()
  })
})

describe('createWithFailover (non-streaming, via openai proxy)', () => {
  it('fails over when the primary returns an EMPTY completion', async () => {
    h.behaviors.set('k1', () => ({ choices: [{ message: { content: '', tool_calls: undefined } }] }))
    h.behaviors.set('k2', () => ({ choices: [{ message: { content: 'answer' } }] }))
    const mod = await load()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resp: any = await mod.openai.chat.completions.create({ model: mod.AI_CONFIG.model, messages: [] })
    expect(resp.choices[0].message.content).toBe('answer')
  })

  it('keeps a non-empty primary completion (no needless failover)', async () => {
    let p2called = false
    h.behaviors.set('k1', () => ({ choices: [{ message: { content: 'primary' } }] }))
    h.behaviors.set('k2', () => {
      p2called = true
      return { choices: [{ message: { content: 'secondary' } }] }
    })
    const mod = await load()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resp: any = await mod.openai.chat.completions.create({ model: mod.AI_CONFIG.model, messages: [] })
    expect(resp.choices[0].message.content).toBe('primary')
    expect(p2called).toBe(false)
  })
})

describe('provider registry (env-driven)', () => {
  it('activates only providers whose key env is set, in AI_PROVIDER_ORDER', async () => {
    const mod = await load()
    expect(mod.AI_PROVIDER.configured).toEqual(['openai', 'gemini'])
    expect(mod.AI_PROVIDER.primary).toBe('openai')
    expect(mod.AI_PROVIDER.hasFallback).toBe(true)
  })

  it('reorders by AI_PROVIDER_ORDER', async () => {
    process.env.AI_PROVIDER_ORDER = 'gemini,openai'
    const mod = await load()
    expect(mod.AI_PROVIDER.primary).toBe('gemini')
  })
})

describe('default privacy-safe chain & model ids', () => {
  beforeEach(() => {
    // Exercise the built-in DEFAULT_ORDER (no AI_PROVIDER_ORDER override).
    delete process.env.AI_PROVIDER_ORDER
    delete process.env.GEMINI_API_KEY
    delete process.env.GROQ_MODEL
    delete process.env.GROQ_FAST_MODEL
    delete process.env.CEREBRAS_MODEL
    process.env.GROQ_API_KEY = 'g'
    process.env.CEREBRAS_API_KEY = 'c'
    process.env.OPENAI_API_KEY = 'o'
  })

  it('defaults to groq → cerebras → openai (privacy-safe, free-first)', async () => {
    const mod = await load()
    expect(mod.AI_PROVIDER.configured).toEqual(['groq', 'cerebras', 'openai'])
    expect(mod.AI_PROVIDER.primary).toBe('groq')
  })

  it('resolves the COMPLEX tier to Groq gpt-oss-120b and SIMPLE to gpt-oss-20b', async () => {
    const models: string[] = []
    h.behaviors.set('g', (body) => {
      models.push((body as { model: string }).model)
      return gen([contentChunk('ok')])
    })
    const mod = await load()
    await collectStream(mod.streamChatWithFailover({ model: mod.AI_MODELS.COMPLEX, messages: [] }))
    await collectStream(mod.streamChatWithFailover({ model: mod.AI_MODELS.SIMPLE, messages: [] }))
    expect(models).toEqual(['openai/gpt-oss-120b', 'openai/gpt-oss-20b'])
  })

  it('does NOT include gemini in the default chain even when its key is set', async () => {
    process.env.GEMINI_API_KEY = 'gem'
    const mod = await load()
    expect(mod.AI_PROVIDER.configured).not.toContain('gemini')
  })
})
