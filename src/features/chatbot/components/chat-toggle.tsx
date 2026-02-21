'use client'

/**
 * Chat Toggle Component
 *
 * February 2026 - AI Command Chatbot Feature
 *
 * Floating action button to toggle the AI chat panel.
 * Placed in the dashboard layout, outside the sidebar.
 */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatPanel } from './chat-panel'

export function ChatToggle() {
  const t = useTranslations('chatbot')
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Floating Action Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                'fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40',
                'bg-gradient-to-br from-teal-500 to-gold-500 hover:from-teal-600 hover:to-gold-600',
                'transition-all duration-300 ease-in-out',
                isOpen && 'rotate-90'
              )}
              aria-label={t('toggleLabel') || 'Toggle AI Assistant'}
            >
              {isOpen ? (
                <X className="h-6 w-6 text-white" />
              ) : (
                <Sparkles className="h-6 w-6 text-white" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="mr-2">
            <p>{isOpen ? (t('close') || 'Close') : (t('open') || 'AI Assistant')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Chat Panel */}
      <ChatPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}

export default ChatToggle
