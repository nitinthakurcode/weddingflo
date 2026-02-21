/**
 * Streaming Chat Hook
 *
 * February 2026 - AI Command Chatbot Feature
 *
 * Production-grade streaming hook with:
 * - Real-time token-by-token display
 * - Exponential backoff retry logic
 * - Graceful fallback to tRPC on persistent failures
 * - Connection state management
 * - Abort controller for timeouts
 * - Tool call handling with confirmation flow
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { trpc } from '@/lib/trpc/client'
import type { ToolPreview } from '../server/services/tool-executor'

// ============================================
// TYPES
// ============================================

export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'streaming'
  | 'error'
  | 'reconnecting'

export interface StreamMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  status?: 'pending' | 'streaming' | 'success' | 'error'
  toolResult?: {
    toolName: string
    success: boolean
    data?: unknown
  }
  pendingConfirmation?: {
    pendingCallId: string
    preview: ToolPreview
  }
}

interface StreamEvent {
  type: 'content' | 'tool_call' | 'done' | 'error'
  content?: string
  toolCall?: {
    id: string
    name: string
    arguments: string
  }
  requiresConfirmation?: boolean
  finishReason?: string
  error?: string
}

interface UseStreamingChatOptions {
  clientId?: string | null
  pathname?: string
  onToolCall?: (toolCall: StreamEvent['toolCall'], requiresConfirmation: boolean) => void
  onError?: (error: Error) => void
}

interface UseStreamingChatReturn {
  messages: StreamMessage[]
  setMessages: React.Dispatch<React.SetStateAction<StreamMessage[]>>
  connectionState: ConnectionState
  isStreaming: boolean
  sendMessage: (content: string) => Promise<void>
  cancelStream: () => void
  retryCount: number
}

// ============================================
// CONSTANTS
// ============================================

const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 2000, 4000] // Exponential backoff
const STREAM_TIMEOUT = 30000 // 30 seconds

// ============================================
// CUSTOM ERROR
// ============================================

class StreamError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message)
    this.name = 'StreamError'
  }
}

// ============================================
// HOOK
// ============================================

export function useStreamingChat({
  clientId,
  pathname,
  onToolCall,
  onError,
}: UseStreamingChatOptions): UseStreamingChatReturn {
  // State
  const [messages, setMessages] = useState<StreamMessage[]>([])
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle')

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null)
  const retryCountRef = useRef(0)
  const currentAssistantMessageIdRef = useRef<string | null>(null)

  // tRPC fallback mutation
  const chatMutation = trpc.chatbot.chat.useMutation()

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  // Cancel current stream
  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort()
    setConnectionState('idle')
  }, [])

  // Fallback to tRPC when streaming consistently fails
  const fallbackToTrpc = useCallback(
    async (userContent: string, messageHistory: StreamMessage[]) => {
      console.warn('[Chatbot] Streaming failed, falling back to tRPC')

      try {
        const result = await chatMutation.mutateAsync({
          messages: messageHistory
            .filter((m) => m.role !== 'system')
            .map((m) => ({
              role: m.role,
              content: m.content,
            })),
          clientId: clientId || undefined,
          pathname,
        })

        // Update the pending assistant message
        if (currentAssistantMessageIdRef.current) {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== currentAssistantMessageIdRef.current) return m

              if (result.type === 'confirmation_required') {
                return {
                  ...m,
                  content: result.content,
                  status: 'success' as const,
                  pendingConfirmation: {
                    pendingCallId: result.pendingCallId!,
                    preview: result.preview!,
                  },
                }
              }

              if (result.type === 'error') {
                return {
                  ...m,
                  content: result.content,
                  status: 'error' as const,
                }
              }

              return {
                ...m,
                content: result.content,
                status: 'success' as const,
                toolResult: result.toolResult,
              }
            })
          )

          // Notify about tool call if needed
          if (result.type === 'confirmation_required' && result.preview && onToolCall) {
            onToolCall(
              {
                id: result.pendingCallId!,
                name: result.preview.toolName,
                arguments: JSON.stringify(
                  result.preview.fields.reduce(
                    (acc, f) => ({ ...acc, [f.name]: f.value }),
                    {}
                  )
                ),
              },
              true
            )
          }
        }

        setConnectionState('idle')
      } catch (error) {
        console.error('[Chatbot] tRPC fallback also failed:', error)

        if (currentAssistantMessageIdRef.current) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === currentAssistantMessageIdRef.current
                ? {
                    ...m,
                    content:
                      error instanceof Error
                        ? `Error: ${error.message}`
                        : 'Sorry, something went wrong. Please try again.',
                    status: 'error' as const,
                  }
                : m
            )
          )
        }

        setConnectionState('error')
        onError?.(error instanceof Error ? error : new Error('Unknown error'))
      }
    },
    [chatMutation, clientId, pathname, onToolCall, onError]
  )

  // Process SSE stream
  const processStream = useCallback(
    async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Process complete SSE events
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || '' // Keep incomplete event in buffer

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue

            const data = line.slice(6) // Remove 'data: ' prefix

            if (data === '[DONE]') {
              setConnectionState('idle')
              return
            }

            try {
              const event: StreamEvent = JSON.parse(data)

              switch (event.type) {
                case 'content':
                  // Append content to current assistant message
                  if (currentAssistantMessageIdRef.current && event.content) {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === currentAssistantMessageIdRef.current
                          ? {
                              ...m,
                              content: m.content + event.content,
                              status: 'streaming' as const,
                            }
                          : m
                      )
                    )
                  }
                  break

                case 'tool_call':
                  // Handle tool call
                  if (event.toolCall && onToolCall) {
                    onToolCall(event.toolCall, event.requiresConfirmation ?? false)
                  }

                  // Update message with tool call info
                  if (currentAssistantMessageIdRef.current && event.toolCall) {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === currentAssistantMessageIdRef.current
                          ? {
                              ...m,
                              status: 'success' as const,
                              ...(event.requiresConfirmation
                                ? {
                                    // Will be handled by confirmation dialog
                                  }
                                : {
                                    toolResult: {
                                      toolName: event.toolCall!.name,
                                      success: true,
                                    },
                                  }),
                            }
                          : m
                      )
                    )
                  }
                  break

                case 'done':
                  // Mark message as complete
                  if (currentAssistantMessageIdRef.current) {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === currentAssistantMessageIdRef.current
                          ? { ...m, status: 'success' as const }
                          : m
                      )
                    )
                  }
                  setConnectionState('idle')
                  break

                case 'error':
                  // Handle error event
                  if (currentAssistantMessageIdRef.current) {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === currentAssistantMessageIdRef.current
                          ? {
                              ...m,
                              content: event.error || 'An error occurred',
                              status: 'error' as const,
                            }
                          : m
                      )
                    )
                  }
                  setConnectionState('error')
                  onError?.(new Error(event.error || 'Stream error'))
                  break
              }
            } catch (parseError) {
              console.warn('[Chatbot] Failed to parse SSE event:', parseError)
            }
          }
        }

        // Mark as complete if stream ended normally
        if (currentAssistantMessageIdRef.current) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === currentAssistantMessageIdRef.current && m.status === 'streaming'
                ? { ...m, status: 'success' as const }
                : m
            )
          )
        }
        setConnectionState('idle')
      } finally {
        reader.releaseLock()
      }
    },
    [onToolCall, onError]
  )

  // Send message with streaming
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return

      // Create user message
      const userMessage: StreamMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
        status: 'success',
      }

      // Create pending assistant message
      const assistantMessageId = crypto.randomUUID()
      currentAssistantMessageIdRef.current = assistantMessageId

      const assistantMessage: StreamMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        status: 'pending',
      }

      // Update messages
      setMessages((prev) => [...prev, userMessage, assistantMessage])

      // Prepare message history for API
      const messageHistory = [...messages, userMessage]

      // Retry loop
      const attemptStream = async (): Promise<boolean> => {
        try {
          setConnectionState('connecting')

          // Create abort controller with timeout
          const controller = new AbortController()
          abortControllerRef.current = controller

          const timeoutId = setTimeout(() => {
            controller.abort()
          }, STREAM_TIMEOUT)

          const response = await fetch('/api/chatbot/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: messageHistory.map((m) => ({
                role: m.role,
                content: m.content,
              })),
              clientId,
              pathname,
            }),
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          if (!response.ok) {
            throw new StreamError(response.status, await response.text())
          }

          if (!response.body) {
            throw new StreamError(500, 'No response body')
          }

          setConnectionState('streaming')
          retryCountRef.current = 0 // Reset on success

          // Process the stream
          const reader = response.body.getReader()
          await processStream(reader)

          return true
        } catch (error) {
          // Handle abort (timeout or manual cancel)
          if (error instanceof DOMException && error.name === 'AbortError') {
            console.warn('[Chatbot] Stream aborted (timeout or cancel)')
            return false
          }

          // Check if we should retry
          if (retryCountRef.current < MAX_RETRIES) {
            const retryDelay = RETRY_DELAYS[retryCountRef.current]
            console.warn(
              `[Chatbot] Stream failed, retrying in ${retryDelay}ms (attempt ${retryCountRef.current + 1}/${MAX_RETRIES})`
            )

            setConnectionState('reconnecting')
            retryCountRef.current++

            await new Promise((resolve) => setTimeout(resolve, retryDelay))
            return attemptStream() // Recursive retry
          }

          // Max retries exceeded
          return false
        }
      }

      const success = await attemptStream()

      if (!success && connectionState !== 'idle') {
        // Fall back to tRPC
        await fallbackToTrpc(content, messageHistory)
      }
    },
    [messages, clientId, pathname, processStream, fallbackToTrpc, connectionState]
  )

  return {
    messages,
    setMessages,
    connectionState,
    isStreaming: connectionState === 'streaming' || connectionState === 'connecting',
    sendMessage,
    cancelStream,
    retryCount: retryCountRef.current,
  }
}

export default useStreamingChat
