'use client'

import { useState, useRef, useEffect } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sparkles, Send, Loader2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AIAssistantProps {
  clientId?: string
}

export function AIAssistant({ clientId }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your AI wedding planning assistant. How can I help you today?",
    },
  ])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const chatMutation = trpc.ai.chat.useMutation()

  const suggestedPrompts = [
    'Help me create a seating plan',
    'Predict my final budget',
    'Generate vendor thank you emails',
    'Optimize my wedding timeline',
  ]

  const handleSend = async (message?: string) => {
    const userMessage = message || input
    if (!userMessage.trim()) return

    // Add user message
    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: userMessage },
    ]
    setMessages(newMessages)
    setInput('')

    try {
      // Call AI
      const response = await chatMutation.mutateAsync({
        messages: newMessages,
        clientId,
      })

      // Add AI response
      setMessages([
        ...newMessages,
        { role: 'assistant', content: response.response },
      ])
    } catch (error: any) {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: `Error: ${error.message || 'Failed to get response'}` },
      ])
    }
  }

  const handleSuggestedPrompt = (prompt: string) => {
    handleSend(prompt)
  }

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <Card className="w-full max-w-2xl mx-auto h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          AI Wedding Assistant
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Messages */}
        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}

            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Suggested Prompts (show only if no messages yet) */}
        {messages.length === 1 && (
          <div className="grid grid-cols-2 gap-2">
            {suggestedPrompts.map((prompt, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestedPrompt(prompt)}
                className="text-xs"
              >
                {prompt}
              </Button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything about wedding planning..."
            disabled={chatMutation.isPending}
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || chatMutation.isPending}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
