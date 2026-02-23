/**
 * Streaming Chatbot API Endpoint
 *
 * February 2026 - AI Command Chatbot Feature
 *
 * Provides Server-Sent Events (SSE) for streaming LLM responses.
 * Enables token-by-token response display for better UX.
 *
 * Features:
 * - Streaming responses via SSE
 * - Tool call detection and routing
 * - Rate limiting
 * - Context injection
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/server'
import { getAIClient, AI_CONFIG, fallbackAI } from '@/lib/ai/openai-client'
import { checkRateLimit } from '@/lib/ai/rate-limiter'
import { CHATBOT_TOOLS, isQueryTool } from '@/features/chatbot/tools/definitions'
import { buildChatbotContext, extractClientIdFromPath } from '@/features/chatbot/server/services/context-builder'
import { buildChatbotSystemPrompt } from '@/lib/ai/prompts/chatbot-system'
import type { ChatCompletionMessageParam, ChatCompletionToolChoiceOption } from 'openai/resources/chat/completions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface StreamMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    // Get session
    const session = await getServerSession()
    const { userId, user } = session

    if (!userId || !user?.companyId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const companyId = user.companyId

    // Rate limit check
    try {
      await checkRateLimit(userId)
    } catch (error) {
      if (error instanceof Error && error.message.includes('Rate limit')) {
        return new NextResponse(error.message, { status: 429 })
      }
      throw error
    }

    // Parse request body
    const body = await request.json()
    const { messages, clientId: providedClientId, pathname } = body as {
      messages: StreamMessage[]
      clientId?: string
      pathname?: string
    }

    if (!messages || !Array.isArray(messages)) {
      return new NextResponse('Invalid messages', { status: 400 })
    }

    // Extract clientId from URL or use provided
    const clientId = providedClientId || (pathname ? extractClientIdFromPath(pathname) : null)

    // Build context
    const context = await buildChatbotContext(clientId, companyId)
    const systemPrompt = buildChatbotSystemPrompt(context)

    // Prepare messages for API
    const apiMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m): ChatCompletionMessageParam => ({
        role: m.role,
        content: m.content,
      })),
    ]

    // Create readable stream for SSE
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        // FIX S5-M07: Abort controller with 30s timeout for OpenAI API call
        const abortController = new AbortController()
        const timeout = setTimeout(() => abortController.abort(), 30000)

        try {
          const client = getAIClient()

          // Try streaming with primary AI
          let streamResponse
          try {
            streamResponse = await client.chat.completions.create({
              model: AI_CONFIG.model,
              messages: apiMessages,
              tools: CHATBOT_TOOLS,
              tool_choice: 'auto' as ChatCompletionToolChoiceOption,
              max_tokens: AI_CONFIG.maxTokens,
              temperature: 0.7,
              stream: true,
            }, { signal: abortController.signal })
          } catch (primaryError) {
            console.warn('[Chatbot Stream] Primary AI failed, falling back to GPT-4o:', primaryError)

            // FIX S5-M12: Wrap fallback in its own try-catch
            try {
              streamResponse = await fallbackAI.chat.completions.create({
                model: AI_CONFIG.fallbackModel,
                messages: apiMessages,
                tools: CHATBOT_TOOLS,
                tool_choice: 'auto' as ChatCompletionToolChoiceOption,
                max_tokens: AI_CONFIG.maxTokens,
                temperature: 0.7,
                stream: true,
              }, { signal: abortController.signal })
            } catch (fallbackError) {
              console.error('[Chatbot Stream] Fallback AI also failed:', fallbackError)
              const sseData = JSON.stringify({
                type: 'error',
                error: 'An error occurred while generating the response. Please try again.',
              })
              controller.enqueue(encoder.encode(`data: ${sseData}\n\n`))
              controller.close()
              return
            }
          }

          // Track tool calls
          let currentToolCall: {
            id: string
            name: string
            arguments: string
          } | null = null

          // Process stream
          for await (const chunk of streamResponse) {
            const delta = chunk.choices[0]?.delta

            // Check for tool calls
            if (delta?.tool_calls && delta.tool_calls.length > 0) {
              const toolCallDelta = delta.tool_calls[0]

              if (toolCallDelta.id) {
                // New tool call starting
                currentToolCall = {
                  id: toolCallDelta.id,
                  name: toolCallDelta.function?.name || '',
                  arguments: toolCallDelta.function?.arguments || '',
                }
              } else if (currentToolCall) {
                // Continue building tool call arguments
                if (toolCallDelta.function?.name) {
                  currentToolCall.name = toolCallDelta.function.name
                }
                if (toolCallDelta.function?.arguments) {
                  currentToolCall.arguments += toolCallDelta.function.arguments
                }
              }
            }

            // Stream content tokens
            if (delta?.content) {
              const sseData = JSON.stringify({
                type: 'content',
                content: delta.content,
              })
              controller.enqueue(encoder.encode(`data: ${sseData}\n\n`))
            }

            // Check for finish reason
            const finishReason = chunk.choices[0]?.finish_reason

            if (finishReason === 'tool_calls' && currentToolCall) {
              // Tool call completed - send tool call event
              const sseData = JSON.stringify({
                type: 'tool_call',
                toolCall: {
                  id: currentToolCall.id,
                  name: currentToolCall.name,
                  arguments: currentToolCall.arguments,
                },
                // Indicate if this requires confirmation
                requiresConfirmation: !isQueryTool(currentToolCall.name),
              })
              controller.enqueue(encoder.encode(`data: ${sseData}\n\n`))
            }

            if (finishReason === 'stop') {
              // Normal completion
              const sseData = JSON.stringify({
                type: 'done',
                finishReason: 'stop',
              })
              controller.enqueue(encoder.encode(`data: ${sseData}\n\n`))
            }
          }

          // End stream
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          // FIX S5-M06: Log real error server-side, send generic message to client
          console.error('[Chatbot Stream] Error:', error)

          // Detect timeout vs other errors
          const isTimeout = error instanceof Error && error.name === 'AbortError'
          const clientMessage = isTimeout
            ? 'The response timed out. Please try a simpler request or try again.'
            : 'An error occurred while generating the response. Please try again.'

          const sseData = JSON.stringify({
            type: 'error',
            error: clientMessage,
          })
          controller.enqueue(encoder.encode(`data: ${sseData}\n\n`))
          controller.close()
        } finally {
          clearTimeout(timeout)
        }
      },
    })

    // Return SSE response
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    console.error('[Chatbot Stream] Request error:', error)

    return new NextResponse(
      'An error occurred processing your request. Please try again.',
      { status: 500 }
    )
  }
}
