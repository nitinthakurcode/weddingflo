'use client'

/**
 * Chat Panel Component
 *
 * February 2026 - AI Command Chatbot Feature
 *
 * Slide-in panel from right with:
 * - Real-time streaming responses (token-by-token)
 * - Message history with user/assistant bubbles
 * - Tool call preview cards with confirmation
 * - Context indicator (current client)
 * - Voice input support (7 languages)
 * - Connection state indicator
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { trpc } from '@/lib/trpc/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Send,
  X,
  Sparkles,
  User,
  Bot,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  Mic,
  MicOff,
  Wifi,
  WifiOff,
  RefreshCw,
  History,
  Clock,
  MessageSquare,
  Zap,
} from 'lucide-react'
import { ConfirmationDialog } from './confirmation-dialog'
import { ConversationHistory } from './conversation-history'
import { DayOfPanel } from './day-of-panel'
import { TemplateManager } from './template-manager'
import { useVoiceInput } from '../hooks/use-voice-input'
import { useStreamingChat, type StreamMessage, type ConnectionState } from '../hooks/use-streaming-chat'
import type { ToolPreview } from '../server/services/tool-executor'
import type { ChatbotConversation, ChatbotMessage } from '@/lib/db/schema-chatbot'

// ============================================
// TYPES
// ============================================

interface ChatPanelProps {
  isOpen: boolean
  onClose: () => void
  clientId?: string
}

// ============================================
// CONNECTION STATUS COMPONENT
// ============================================

function ConnectionStatus({ state }: { state: ConnectionState }) {
  if (state === 'idle') return null

  const statusConfig = {
    connecting: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      text: 'Connecting...',
      className: 'text-blue-500',
    },
    streaming: {
      icon: <Wifi className="h-3 w-3" />,
      text: 'Streaming',
      className: 'text-green-500',
    },
    reconnecting: {
      icon: <RefreshCw className="h-3 w-3 animate-spin" />,
      text: 'Reconnecting...',
      className: 'text-yellow-500',
    },
    error: {
      icon: <WifiOff className="h-3 w-3" />,
      text: 'Connection error',
      className: 'text-red-500',
    },
  }

  const config = statusConfig[state]
  if (!config) return null

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full',
        config.className
      )}
      data-testid="connection-state"
    >
      {config.icon}
      <span>{config.text}</span>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

type PanelView = 'chat' | 'history' | 'day-of' | 'templates'

export function ChatPanel({ isOpen, onClose, clientId: propClientId }: ChatPanelProps) {
  const t = useTranslations('chatbot')
  const pathname = usePathname()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // State
  const [inputValue, setInputValue] = useState('')
  const [currentView, setCurrentView] = useState<PanelView>('chat')
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    pendingCallId: string
    preview: ToolPreview
    messageId: string
    toolCall: {
      id: string
      name: string
      arguments: string
    }
  } | null>(null)
  const [lastSuccessfulCommand, setLastSuccessfulCommand] = useState<string | null>(null)

  // Extract clientId from URL or use prop
  const extractedClientId = pathname.match(/\/dashboard\/clients\/([0-9a-f-]{36})/i)?.[1]
  const clientId = propClientId || extractedClientId

  // Check if today is wedding day for auto Day-Of mode prompt
  const { data: context } = trpc.chatbot.getContext.useQuery(
    { clientId, pathname },
    { enabled: isOpen && !!clientId }
  )

  const isWeddingDay = context?.client?.weddingDate
    ? (() => {
        const weddingDate = new Date(context.client.weddingDate)
        const today = new Date()
        return (
          weddingDate.getFullYear() === today.getFullYear() &&
          weddingDate.getMonth() === today.getMonth() &&
          weddingDate.getDate() === today.getDate()
        )
      })()
    : false

  // Streaming chat hook
  const {
    messages,
    setMessages,
    connectionState,
    isStreaming,
    sendMessage: streamSendMessage,
    cancelStream,
  } = useStreamingChat({
    clientId,
    pathname,
    onToolCall: (toolCall, requiresConfirmation) => {
      if (requiresConfirmation && toolCall) {
        // Parse arguments to create preview
        try {
          const args = JSON.parse(toolCall.arguments)
          const preview: ToolPreview = {
            toolName: toolCall.name,
            action: 'Create/Update',
            description: `Execute ${toolCall.name}`,
            fields: Object.entries(args).map(([name, value]) => ({
              name,
              value: value as string | number | boolean | null,
              displayValue: String(value),
            })),
            cascadeEffects: [],
            warnings: [],
            requiresConfirmation: true,
          }

          // Find the assistant message that triggered this
          const assistantMessageId = messages.find(
            (m) => m.role === 'assistant' && (m.status === 'streaming' || m.status === 'pending')
          )?.id

          if (assistantMessageId) {
            setPendingConfirmation({
              pendingCallId: toolCall.id,
              preview,
              messageId: assistantMessageId,
              toolCall,
            })
          }
        } catch (e) {
          console.error('Failed to parse tool call arguments:', e)
        }
      }
    },
    onError: (error) => {
      console.error('[Chat Panel] Stream error:', error)
    },
  })

  // Voice input
  const voiceInput = useVoiceInput({
    language: 'en',
    continuous: false,
    onResult: (result) => {
      if (result.isFinal && result.transcript.trim()) {
        setInputValue((prev) => prev + (prev ? ' ' : '') + result.transcript.trim())
      }
    },
    onError: (error) => {
      console.error('[Voice Input]', error)
    },
  })

  // tRPC mutations for confirmation
  const confirmMutation = trpc.chatbot.confirmToolCall.useMutation()
  const cancelMutation = trpc.chatbot.cancelToolCall.useMutation()
  const saveTemplateMutation = trpc.chatbot.saveTemplate.useMutation({
    onSuccess: () => {
      setLastSuccessfulCommand(null)
    },
  })

  // Get AI usage
  const { data: usage } = trpc.chatbot.getUsage.useQuery(undefined, {
    enabled: isOpen,
  })

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Send message handler
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isStreaming) return

    const content = inputValue.trim()
    setInputValue('')

    await streamSendMessage(content)
  }, [inputValue, isStreaming, streamSendMessage])

  // Confirm tool call
  const handleConfirm = useCallback(async () => {
    if (!pendingConfirmation) return

    const confirmingId = pendingConfirmation.messageId

    try {
      const result = await confirmMutation.mutateAsync({
        pendingCallId: pendingConfirmation.pendingCallId,
        toolName: pendingConfirmation.preview.toolName,
        args: pendingConfirmation.preview.fields.reduce(
          (acc, f) => {
            acc[f.name] = f.value
            return acc
          },
          {} as Record<string, unknown>
        ),
        clientId,
      })

      // Add success message
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.message,
          timestamp: new Date(),
          status: 'success',
          toolResult: {
            toolName: pendingConfirmation.preview.toolName,
            success: true,
            data: result.data,
          },
        },
      ])

      // Track for "Save as template" prompt
      // Find the original user message that triggered this
      const userMessages = messages.filter((m) => m.role === 'user')
      const lastUserMessage = userMessages[userMessages.length - 1]
      if (lastUserMessage) {
        setLastSuccessfulCommand(lastUserMessage.content)
      }

      setPendingConfirmation(null)
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: error instanceof Error ? error.message : 'Failed to execute action',
          timestamp: new Date(),
          status: 'error',
        },
      ])
      setPendingConfirmation(null)
    }
  }, [pendingConfirmation, confirmMutation, clientId, setMessages])

  // Cancel tool call
  const handleCancel = useCallback(async () => {
    if (!pendingConfirmation) return

    try {
      await cancelMutation.mutateAsync({
        pendingCallId: pendingConfirmation.pendingCallId,
      })

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Action cancelled. What else can I help you with?',
          timestamp: new Date(),
          status: 'success',
        },
      ])
    } catch (error) {
      console.error('Cancel error:', error)
    }

    setPendingConfirmation(null)
  }, [pendingConfirmation, cancelMutation, setMessages])

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Handle quick action click
  const handleQuickAction = useCallback(
    (command: string, immediate: boolean = false) => {
      setInputValue(command)
      if (immediate) {
        setTimeout(async () => {
          await streamSendMessage(command)
          setInputValue('')
        }, 100)
      } else {
        inputRef.current?.focus()
      }
    },
    [streamSendMessage]
  )

  // Handle conversation resume from history
  const handleSelectConversation = useCallback(
    (conversation: ChatbotConversation, dbMessages: ChatbotMessage[]) => {
      // Convert DB messages to StreamMessage format
      const convertedMessages: StreamMessage[] = dbMessages.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
        timestamp: new Date(m.createdAt),
        status: (m.status as 'success' | 'error') || 'success',
        toolResult: m.toolResult
          ? {
              toolName: m.toolName || 'unknown',
              success: true,
              data: m.toolResult,
            }
          : undefined,
      }))
      setMessages(convertedMessages)
      setCurrentView('chat')
    },
    [setMessages]
  )

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[450px] p-0 flex flex-col"
      >
        {/* Day-Of Mode View */}
        {currentView === 'day-of' && clientId && (
          <DayOfPanel
            clientId={clientId}
            onSwitchToChat={() => setCurrentView('chat')}
          />
        )}

        {/* Conversation History View */}
        {currentView === 'history' && (
          <ConversationHistory
            clientId={clientId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={() => {
              setMessages([])
              setCurrentView('chat')
            }}
            onClose={() => setCurrentView('chat')}
          />
        )}

        {/* Templates View */}
        {currentView === 'templates' && (
          <TemplateManager
            onSelectTemplate={(command) => {
              setInputValue(command)
              setCurrentView('chat')
              setTimeout(() => inputRef.current?.focus(), 100)
            }}
            onClose={() => setCurrentView('chat')}
          />
        )}

        {/* Main Chat View */}
        {currentView === 'chat' && (
          <>
            {/* Header */}
            <SheetHeader className="px-4 py-3 border-b bg-gradient-to-r from-teal-50 to-gold-50 dark:from-teal-950 dark:to-gold-950">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 to-gold-500 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <SheetTitle className="text-sm font-semibold">
                      {t('title') || 'AI Assistant'}
                    </SheetTitle>
                    <SheetDescription className="text-xs">
                      {context?.hasClient
                        ? context.client?.displayName
                        : t('noClientSelected') || 'No wedding selected'}
                    </SheetDescription>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <ConnectionStatus state={connectionState} />
                  {/* Templates button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentView('templates')}
                    title="Quick Commands"
                  >
                    <Zap className="h-4 w-4" />
                  </Button>
                  {/* History button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentView('history')}
                    title="Conversation History"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  {/* Day-Of Mode button (show if wedding day or has client) */}
                  {clientId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-8 w-8',
                        isWeddingDay && 'text-gold-500 animate-pulse'
                      )}
                      onClick={() => setCurrentView('day-of')}
                      title={isWeddingDay ? "It's the wedding day! Switch to Day-Of Mode" : 'Day-Of Mode'}
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onClose}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Wedding day prompt */}
              {isWeddingDay && currentView === 'chat' && (
                <div
                  className="mt-2 p-2 bg-gold-100 dark:bg-gold-900/30 rounded-lg flex items-center justify-between cursor-pointer hover:bg-gold-200 dark:hover:bg-gold-900/50 transition-colors"
                  onClick={() => setCurrentView('day-of')}
                >
                  <div className="flex items-center gap-2 text-xs text-gold-700 dark:text-gold-300">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">It's the wedding day!</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 text-xs">
                    Day-Of Mode
                  </Button>
                </div>
              )}

              {/* Usage indicator */}
              {usage && !isWeddingDay && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 bg-mocha-200 dark:bg-mocha-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-gold-500 transition-all"
                      style={{ width: `${usage.percentageUsed}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-mocha-500">
                    {usage.remaining}/{usage.limit} queries
                  </span>
                </div>
              )}
            </SheetHeader>

            {/* Context indicator */}
            {context?.hasClient && (
              <div className="px-4 py-2 bg-cloud-50 dark:bg-mocha-800/50 border-b flex items-center gap-2 text-xs">
                <Info className="h-3 w-3 text-teal-500" />
                <span className="text-mocha-600 dark:text-mocha-300">
                  {context.guests.total} guests | {context.events.total} events | $
                  {context.budget.totalBudget.toLocaleString()} budget
                </span>
              </div>
            )}

        {/* Messages */}
        <ScrollArea className="flex-1 px-4">
          <div className="py-4 space-y-4">
            {/* Welcome message if empty */}
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-teal-100 to-gold-100 dark:from-teal-900 dark:to-gold-900 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-teal-500" />
                </div>
                <h3 className="font-medium text-mocha-900 dark:text-mocha-100">
                  {t('welcomeTitle') || 'How can I help?'}
                </h3>
                <p className="text-sm text-mocha-500 mt-1 max-w-[280px] mx-auto">
                  {t('welcomeDescription') ||
                    'Ask me to add guests, update budgets, create events, or anything else.'}
                </p>

                {/* Quick action categories */}
                <div className="mt-4 space-y-3">
                  {/* Common queries */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wide text-mocha-400 block mb-1.5">
                      Quick Stats
                    </span>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {[
                        { label: 'Wedding Summary', command: 'Give me a full wedding summary' },
                        { label: 'Guest Stats', command: 'Show me guest statistics' },
                        { label: 'Budget Overview', command: "What's my budget status?" },
                        { label: 'Recommendations', command: 'What should I focus on?' },
                      ].map((action) => (
                        <button
                          key={action.label}
                          className="px-2.5 py-1 text-xs rounded-full bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/30 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 transition-colors border border-teal-200 dark:border-teal-800"
                          onClick={() => handleQuickAction(action.command, true)}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Common actions */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wide text-mocha-400 block mb-1.5">
                      Quick Actions
                    </span>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {[
                        { label: 'Add Guest', command: 'Add a guest' },
                        { label: 'Create Event', command: 'Create a new event' },
                        { label: 'Book Vendor', command: 'Add a vendor' },
                        { label: 'Update Budget', command: 'Update budget item' },
                      ].map((action) => (
                        <button
                          key={action.label}
                          className="px-2.5 py-1 text-xs rounded-full bg-gold-50 hover:bg-gold-100 dark:bg-gold-900/30 dark:hover:bg-gold-900/50 text-gold-700 dark:text-gold-300 transition-colors border border-gold-200 dark:border-gold-800"
                          onClick={() => handleQuickAction(action.command, false)}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Workflow templates */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wide text-mocha-400 block mb-1.5">
                      Workflows
                    </span>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {[
                        {
                          label: 'RSVP Reminders',
                          command: 'Send RSVP reminder to all pending guests',
                          icon: '📧',
                        },
                        {
                          label: 'Day-Of Mode',
                          command: 'Show me day-of recommendations and timeline',
                          icon: '🎉',
                        },
                        {
                          label: 'Payment Check',
                          command: 'Show me all overdue vendor payments',
                          icon: '💰',
                        },
                        {
                          label: 'Seating Check',
                          command: 'Which guests need table assignments?',
                          icon: '🪑',
                        },
                      ].map((action) => (
                        <button
                          key={action.label}
                          className="px-2.5 py-1 text-xs rounded-full bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 transition-colors border border-purple-200 dark:border-purple-800 flex items-center gap-1"
                          onClick={() => handleQuickAction(action.command, true)}
                        >
                          <span>{action.icon}</span>
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Message list */}
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-2',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
                data-testid="chat-message"
              >
                {/* Avatar */}
                {message.role === 'assistant' && (
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-teal-500 to-gold-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}

                {/* Message bubble */}
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2.5',
                    message.role === 'user'
                      ? 'bg-teal-500 text-white rounded-br-md'
                      : 'bg-cloud-100 dark:bg-mocha-800 text-mocha-900 dark:text-mocha-100 rounded-bl-md',
                    message.status === 'pending' && 'animate-pulse',
                    message.status === 'streaming' && 'border-l-2 border-teal-500'
                  )}
                >
                  {message.status === 'pending' ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                        {message.status === 'streaming' && (
                          <span className="inline-block w-1 h-4 ml-0.5 bg-teal-500 animate-pulse" />
                        )}
                      </p>

                      {/* Tool result badge */}
                      {message.toolResult && (
                        <div className="mt-2 flex items-center gap-1">
                          {message.toolResult.success ? (
                            <Badge
                              variant="outline"
                              className="text-green-600 border-green-300"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {message.toolResult.toolName}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-red-600 border-red-300"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              {message.toolResult.toolName}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Pending confirmation preview */}
                      {pendingConfirmation?.messageId === message.id && (
                        <div className="mt-3 p-3 bg-white/50 dark:bg-mocha-900/50 rounded-lg border border-gold-200 dark:border-gold-800">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="h-4 w-4 text-gold-500" />
                            <span className="text-xs font-medium text-gold-700 dark:text-gold-300">
                              Confirmation Required
                            </span>
                          </div>

                          <div className="space-y-1">
                            {pendingConfirmation.preview.fields.slice(0, 4).map((field) => (
                              <div key={field.name} className="flex justify-between text-xs">
                                <span className="text-mocha-500">{field.name}:</span>
                                <span className="font-medium">{field.displayValue}</span>
                              </div>
                            ))}
                            {pendingConfirmation.preview.fields.length > 4 && (
                              <div className="text-xs text-mocha-400">
                                +{pendingConfirmation.preview.fields.length - 4} more fields
                              </div>
                            )}
                          </div>

                          {pendingConfirmation.preview.cascadeEffects.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gold-100 dark:border-gold-900">
                              <span className="text-[10px] uppercase tracking-wide text-mocha-400">
                                Also creates:
                              </span>
                              <ul className="mt-1 text-xs text-mocha-600 dark:text-mocha-300">
                                {pendingConfirmation.preview.cascadeEffects.map((effect, i) => (
                                  <li key={i}>• {effect}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 h-8 bg-teal-500 hover:bg-teal-600"
                              onClick={handleConfirm}
                              disabled={confirmMutation.isPending}
                            >
                              {confirmMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Confirm'
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-8"
                              onClick={handleCancel}
                              disabled={confirmMutation.isPending}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* User avatar */}
                {message.role === 'user' && (
                  <div className="h-7 w-7 rounded-full bg-mocha-200 dark:bg-mocha-700 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-mocha-600 dark:text-mocha-300" />
                  </div>
                )}
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t bg-white dark:bg-mocha-900">
          {/* Save as template prompt */}
          {lastSuccessfulCommand && !voiceInput.isListening && (
            <div className="mb-2 p-2 bg-gold-50 dark:bg-gold-900/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gold-700 dark:text-gold-300">
                <Zap className="h-4 w-4" />
                <span>Save this as a quick command?</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => {
                    saveTemplateMutation.mutate({
                      name: lastSuccessfulCommand.slice(0, 30) + (lastSuccessfulCommand.length > 30 ? '...' : ''),
                      command: lastSuccessfulCommand,
                      category: 'custom',
                    })
                  }}
                  disabled={saveTemplateMutation.isPending}
                >
                  {saveTemplateMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    'Save'
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-mocha-400"
                  onClick={() => setLastSuccessfulCommand(null)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {/* Voice input indicator */}
          {voiceInput.isListening && (
            <div className="mb-2 flex items-center gap-2 text-xs text-teal-600 dark:text-teal-400">
              <div className="flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </span>
                <span>Listening...</span>
              </div>
              {voiceInput.interimTranscript && (
                <span className="text-mocha-400 italic truncate flex-1">
                  {voiceInput.interimTranscript}
                </span>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                voiceInput.isListening
                  ? 'Speak now...'
                  : t('inputPlaceholder') || 'Type or speak a command...'
              }
              disabled={isStreaming || !!pendingConfirmation}
              className="flex-1"
              data-testid="chat-input"
            />

            {/* Voice input button */}
            {voiceInput.isSupported && (
              <Button
                type="button"
                variant={voiceInput.isListening ? 'default' : 'outline'}
                size="icon"
                onClick={() => {
                  if (voiceInput.isListening) {
                    voiceInput.stopListening()
                  } else {
                    voiceInput.resetTranscript()
                    voiceInput.startListening()
                  }
                }}
                disabled={isStreaming || !!pendingConfirmation || !voiceInput.isMicrophoneAvailable}
                className={cn(
                  'transition-all',
                  voiceInput.isListening && 'bg-red-500 hover:bg-red-600 border-red-500'
                )}
                title={
                  !voiceInput.isMicrophoneAvailable
                    ? 'Microphone access denied'
                    : voiceInput.isListening
                      ? 'Stop listening'
                      : 'Start voice input'
                }
              >
                {voiceInput.isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            )}

            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isStreaming || !!pendingConfirmation}
              className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
              data-testid="send-button"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Voice error message */}
          {voiceInput.error && (
            <div className="mt-2 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {voiceInput.error}
            </div>
          )}
        </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default ChatPanel
