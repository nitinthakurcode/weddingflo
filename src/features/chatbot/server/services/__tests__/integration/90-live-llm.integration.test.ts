/**
 * Layer 3 — LIVE end-to-end through the real AI client (OpenAI, per .env.local provider
 * chain) against the actual 51-tool CHATBOT_TOOLS schema. Proves the non-deterministic
 * half of the app flow: the LLM correctly SELECTS + PARAMETERIZES a tool from a natural
 * language command, streaming tool_calls, in English AND a non-English locale.
 *
 * Combined with Layers 1-2 (the selected tool then executes + cascades correctly), this
 * verifies the full chatbot flow: NL → tool_call → mutation → automation.
 *
 * Skips automatically if no live AI key is configured.
 */
import { describe, it, expect } from 'vitest'
import { streamChatWithFailover, AI_MODELS, AI_PROVIDER } from '@/lib/ai/ai-client'
import { CHATBOT_TOOLS } from '@/features/chatbot/tools/definitions'

const hasKey = !!(process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY || process.env.CEREBRAS_API_KEY)

const SYSTEM =
  'You are WeddingFlo\'s planning assistant. When the user asks to take an action, ALWAYS call the single most appropriate tool with correctly extracted parameters. Do not ask follow-up questions for clearly specified requests.'

/** Drive a one-shot streamed completion and assemble any tool call the model emits. */
async function assembleToolCall(userMessage: string) {
  let name = ''
  let argStr = ''
  let textContent = ''
  for await (const chunk of streamChatWithFailover({
    model: AI_MODELS.COMPLEX,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: userMessage },
    ],
    tools: CHATBOT_TOOLS,
    tool_choice: 'auto',
    temperature: 0,
    max_tokens: 500,
  })) {
    const choice = chunk?.choices?.[0]
    if (choice?.delta?.content) textContent += choice.delta.content
    const tc = choice?.delta?.tool_calls?.[0]
    if (tc?.function?.name) name = tc.function.name
    if (tc?.function?.arguments) argStr += tc.function.arguments
  }
  let args: Record<string, unknown> = {}
  try { args = argStr ? JSON.parse(argStr) : {} } catch { /* partial */ }
  return { name, args, textContent }
}

describe.skipIf(!hasKey)('LIVE chatbot LLM tool-calling (real provider)', () => {
  it('resolves to a configured provider', () => {
    expect(AI_PROVIDER.configured.length).toBeGreaterThan(0)
    // eslint-disable-next-line no-console
    console.log('[live] active AI providers:', AI_PROVIDER.configured.join(', '), '| primary:', AI_PROVIDER.primary)
  })

  it('English: "Add a guest named John Smith" → add_guest tool call with the name', async () => {
    const { name, args } = await assembleToolCall('Add a guest named John Smith.')
    expect(name).toBe('add_guest')
    expect(String(args.firstName ?? '').toLowerCase()).toContain('john')
  }, 30000)

  it('Spanish: "Añade una invitada llamada María García" → add_guest tool call', async () => {
    const { name, args } = await assembleToolCall('Añade una invitada llamada María García a la lista de invitados.')
    expect(name).toBe('add_guest')
    expect(String(args.firstName ?? '').toLowerCase()).toContain('mar')
  }, 30000)

  it('Query intent: "How many guests have confirmed?" → a guest/query tool', async () => {
    const { name } = await assembleToolCall('How many guests have confirmed their RSVP?')
    expect(['get_guest_stats', 'query_data', 'search_entities']).toContain(name)
  }, 30000)
})
