'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { trpc } from '@/lib/trpc/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Send,
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
import { ConfirmationDialog } from '@/features/chatbot/components/confirmation-dialog'
import { ConversationHistory } from '@/features/chatbot/components/conversation-history'
import { DayOfPanel } from '@/features/chatbot/components/day-of-panel'
import { TemplateManager } from '@/features/chatbot/components/template-manager'
import { useVoiceInput } from '@/features/chatbot/hooks/use-voice-input'
import { useStreamingChat, type StreamMessage, type ConnectionState } from '@/features/chatbot/hooks/use-streaming-chat'
import type { ToolPreview } from '@/features/chatbot/server/services/tool-executor'

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
    <div className={cn('flex items-center gap-1.5 text-xs px-2 py-1 rounded-full', config.className)}>
      {config.icon}
      <span>{config.text}</span>
    </div>
  )
}

type PageView = 'chat' | 'history' | 'day-of' | 'templates'

export default function AIChatPage() {
  const t = useTranslations('chatbot')
  const pathname = usePathname()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [inputValue, setInputValue] = useState('')
  const [currentView, setCurrentView] = useState<PageView>('chat')
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    pendingCallId: string
    preview: ToolPreview
    messageId: string
    toolCall: { id: string; name: string; arguments: string }
  } | null>(null)
  const [lastSuccessfulCommand, setLastSuccessfulCommand] = useState<string | null>(null)

  const extractedClientId = pathname.match(/\/dashboard\/clients\/([0-9a-f-]{36})/i)?.[1]
  const clientId = extractedClientId

  const { data: context } = trpc.chatbot.getContext.useQuery(
    { clientId, pathname },
    { enabled: !!clientId }
  )

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

          const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant')
          setPendingConfirmation({
            pendingCallId: toolCall.id,
            preview,
            messageId: lastAssistantMsg?.id || '',
            toolCall: {
              id: toolCall.id,
              name: toolCall.name,
              arguments: toolCall.arguments,
            },
          })
        } catch {
          // If parsing fails, auto-confirm
        }
      }
    },
  })

  const { isListening, isSupported: voiceSupported, startListening, stopListening } = useVoiceInput({
    onResult: (result) => {
      if (result.isFinal) {
        setInputValue(result.transcript)
      }
    },
    language: 'en',
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSend = useCallback(async () => {
    const text = inputValue.trim()
    if (!text || isStreaming) return

    setInputValue('')
    await streamSendMessage(text)
  }, [inputValue, isStreaming, streamSendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  if (currentView === 'history') {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className="text-xl font-semibold">{t('title') || 'AI Assistant'}</h1>
          <Button variant="ghost" size="sm" onClick={() => setCurrentView('chat')}>
            Back to Chat
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <ConversationHistory
            clientId={clientId}
            onSelectConversation={() => {
              setCurrentView('chat')
            }}
            onNewConversation={() => {
              setMessages([])
              setCurrentView('chat')
            }}
            onClose={() => setCurrentView('chat')}
          />
        </div>
      </div>
    )
  }

  if (currentView === 'day-of') {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className="text-xl font-semibold">Day-Of Coordination</h1>
          <Button variant="ghost" size="sm" onClick={() => setCurrentView('chat')}>
            Back to Chat
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <DayOfPanel clientId={clientId!} onSwitchToChat={() => setCurrentView('chat')} />
        </div>
      </div>
    )
  }

  if (currentView === 'templates') {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className="text-xl font-semibold">Command Templates</h1>
          <Button variant="ghost" size="sm" onClick={() => setCurrentView('chat')}>
            Back to Chat
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <TemplateManager
            onSelectTemplate={(template) => {
              setInputValue(template)
              setCurrentView('chat')
            }}
            onClose={() => setCurrentView('chat')}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-gold-500 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{t('title') || 'AI Assistant'}</h1>
            {clientId && context?.client?.displayName && (
              <p className="text-xs text-muted-foreground">
                Context: {context.client.displayName}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionStatus state={connectionState} />
          <Button variant="ghost" size="sm" onClick={() => setCurrentView('history')}>
            <History className="h-4 w-4 mr-1" />
            History
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentView('templates')}>
            <Zap className="h-4 w-4 mr-1" />
            Templates
          </Button>
          {clientId && (
            <Button variant="ghost" size="sm" onClick={() => setCurrentView('day-of')}>
              <Clock className="h-4 w-4 mr-1" />
              Day-Of
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-teal-500/20 to-gold-500/20 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-teal-500" />
            </div>
            <h3 className="text-lg font-medium mb-2">{t('welcomeTitle') || 'How can I help you today?'}</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {t('welcomeDescription') || 'Ask me about your clients, guests, vendors, budgets, or anything else.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-teal-500 to-gold-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-xl px-4 py-2.5 text-sm',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.role === 'assistant' && message.content === '' && isStreaming && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          {voiceSupported && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => isListening ? stopListening() : startListening()}
              className={cn(isListening && 'text-red-500')}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('inputPlaceholder') || 'Type a message...'}
            disabled={isStreaming}
            className="flex-1"
          />
          {isStreaming ? (
            <Button variant="ghost" size="icon" onClick={cancelStream}>
              <XCircle className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="bg-gradient-to-br from-teal-500 to-gold-500 hover:from-teal-600 hover:to-gold-600"
            >
              <Send className="h-4 w-4 text-primary-foreground" />
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {pendingConfirmation && (
        <ConfirmationDialog
          isOpen={!!pendingConfirmation}
          onClose={() => setPendingConfirmation(null)}
          preview={pendingConfirmation.preview}
          onConfirm={async () => {
            setPendingConfirmation(null)
          }}
        />
      )}
    </div>
  )
}
