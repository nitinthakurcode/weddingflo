'use client';

import { useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
import { useState } from 'react';

/**
 * Message interface matching Drizzle schema (camelCase)
 */
interface Message {
  id: string;
  companyId: string;
  clientId: string | null;
  senderId: string;
  receiverId: string | null;
  subject: string | null;
  content: string;
  messageType: string | null;
  isRead: boolean | null;
  readAt: Date | null;
  parentId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface ChatBoxProps {
  clientId: string;
  currentUserId: string;
  otherUserId: string;
  currentUserName: string;
  otherUserName: string;
}

/**
 * Real-time chat component using polling
 *
 * December 2025 - Migrated from Supabase Realtime to polling
 *
 * Features:
 * - Polling-based updates (3 second interval)
 * - Auto-scroll to bottom on new messages
 * - Mark messages as read when viewed
 * - Send/receive messages with tRPC
 * - Uses Drizzle schema with camelCase fields
 *
 * Session: Uses BetterAuth session
 * - All auth via ctx.companyId from session
 * - Application-level RLS enforces data isolation
 */
export function ChatBox({
  clientId,
  currentUserId,
  otherUserId,
  currentUserName,
  otherUserName,
}: ChatBoxProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  // Fetch conversation using tRPC with polling for real-time updates
  const { data: messages = [], isLoading } = trpc.messages.getConversation.useQuery(
    {
      clientId,
      otherUserId,
    },
    {
      // Poll every 3 seconds for new messages
      refetchInterval: 3000,
      // Keep polling even when window loses focus
      refetchIntervalInBackground: true,
    }
  ) as { data: Message[]; isLoading: boolean };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read
  const markAsReadMutation = trpc.messages.markAsRead.useMutation();

  useEffect(() => {
    const unreadIds = messages
      .filter((m) => !m.isRead && m.receiverId === currentUserId)
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      markAsReadMutation.mutate({ messageIds: unreadIds });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, currentUserId]);

  // Send message mutation
  const sendMutation = trpc.messages.sendMessage.useMutation({
    onSuccess: () => {
      setInput('');
    },
  });

  const handleSend = () => {
    if (!input.trim() || sendMutation.isPending) return;

    sendMutation.mutate({
      clientId,
      recipientId: otherUserId,
      content: input,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          )}

          {messages.map((message) => {
            const isOwnMessage = message.senderId === currentUserId;
            const senderName = isOwnMessage ? currentUserName : otherUserName;

            return (
              <div
                key={message.id}
                className={`flex ${
                  isOwnMessage ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    isOwnMessage
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                  }`}
                >
                  {!isOwnMessage && (
                    <p className="text-xs font-semibold mb-1 opacity-70">
                      {senderName}
                    </p>
                  )}

                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>

                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs opacity-70">
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>

                    {isOwnMessage && (
                      <span className="text-xs opacity-70">
                        {message.isRead ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-4 bg-background">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            disabled={sendMutation.isPending}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={sendMutation.isPending || !input.trim()}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {sendMutation.isPending && (
          <p className="text-xs text-muted-foreground mt-2">Sending...</p>
        )}
      </div>
    </div>
  );
}
