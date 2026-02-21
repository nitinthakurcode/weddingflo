'use client'

/**
 * Conversation History Component
 *
 * February 2026 - AI Command Chatbot Feature
 *
 * Displays past conversations with:
 * - Conversation list with titles and timestamps
 * - Resume functionality
 * - Delete option
 * - Auto-generated titles from first message
 */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { trpc } from '@/lib/trpc/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  History,
  MessageSquare,
  MoreVertical,
  Trash2,
  Clock,
  ChevronLeft,
  Plus,
  Loader2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { ChatbotConversation, ChatbotMessage } from '@/lib/db/schema-chatbot'

// ============================================
// TYPES
// ============================================

interface ConversationHistoryProps {
  clientId?: string | null
  onSelectConversation: (conversation: ChatbotConversation, messages: ChatbotMessage[]) => void
  onNewConversation: () => void
  onClose: () => void
}

// ============================================
// COMPONENT
// ============================================

export function ConversationHistory({
  clientId,
  onSelectConversation,
  onNewConversation,
  onClose,
}: ConversationHistoryProps) {
  const t = useTranslations('chatbot')

  // State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null)

  // Queries
  const {
    data: conversationsData,
    isLoading,
    refetch,
  } = trpc.chatbot.listConversations.useQuery({
    clientId,
    limit: 50,
  })

  // Mutations
  const deleteMutation = trpc.chatbot.deleteConversation.useMutation({
    onSuccess: () => {
      refetch()
      setDeleteDialogOpen(false)
      setConversationToDelete(null)
    },
  })

  // Utils for fetching conversation
  const utils = trpc.useUtils()

  // Handlers
  const handleSelectConversation = async (conversation: ChatbotConversation) => {
    try {
      const result = await utils.chatbot.getConversation.fetch({
        conversationId: conversation.id,
        messageLimit: 50,
      })
      onSelectConversation(result.conversation, result.messages)
    } catch (error) {
      console.error('Failed to load conversation:', error)
    }
  }

  const handleDeleteClick = (conversationId: string) => {
    setConversationToDelete(conversationId)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (conversationToDelete) {
      await deleteMutation.mutateAsync({ conversationId: conversationToDelete })
    }
  }

  const conversations = conversationsData?.conversations || []

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between bg-cloud-50 dark:bg-mocha-800/50">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-mocha-500" />
            <span className="font-medium text-sm">
              {t('conversationHistory') || 'Conversation History'}
            </span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
          onClick={onNewConversation}
        >
          <Plus className="h-4 w-4" />
          <span className="text-xs">{t('newChat') || 'New'}</span>
        </Button>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-mocha-400" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 mx-auto text-mocha-300 mb-2" />
              <p className="text-sm text-mocha-500">
                {t('noConversations') || 'No previous conversations'}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={onNewConversation}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('startNewChat') || 'Start New Chat'}
              </Button>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  'group relative flex items-start gap-3 p-3 rounded-lg',
                  'hover:bg-cloud-100 dark:hover:bg-mocha-800',
                  'cursor-pointer transition-colors'
                )}
                onClick={() => handleSelectConversation(conversation)}
              >
                {/* Icon */}
                <div className="h-8 w-8 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-4 w-4 text-teal-500" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-mocha-900 dark:text-mocha-100 truncate">
                    {conversation.title || t('untitledConversation') || 'Untitled Conversation'}
                  </h4>

                  <div className="flex items-center gap-2 mt-1 text-xs text-mocha-500">
                    <Clock className="h-3 w-3" />
                    <span>
                      {conversation.updatedAt
                        ? formatDistanceToNow(new Date(conversation.updatedAt), {
                            addSuffix: true,
                          })
                        : 'Unknown'}
                    </span>

                    {conversation.messageCount !== null && conversation.messageCount > 0 && (
                      <>
                        <span>•</span>
                        <span>
                          {conversation.messageCount}{' '}
                          {conversation.messageCount === 1 ? 'message' : 'messages'}
                        </span>
                      </>
                    )}
                  </div>

                  {conversation.summary && (
                    <p className="text-xs text-mocha-400 mt-1 line-clamp-2">
                      {conversation.summary}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteClick(conversation.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('deleteConversation') || 'Delete'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('deleteConversationTitle') || 'Delete Conversation?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConversationDescription') ||
                'This will permanently delete this conversation and all its messages. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('delete') || 'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ConversationHistory
