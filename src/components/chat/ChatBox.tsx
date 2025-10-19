'use client';

import { useEffect, useState, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';

/**
 * Message interface matching existing messages table schema
 */
interface Message {
  id: string;
  client_id: string;
  sender_id: string;
  recipient_id: string;
  subject: string | null;
  body: string;
  is_read: boolean;
  read_at: string | null;
  parent_message_id: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface ChatBoxProps {
  clientId: string;
  currentUserId: string;
  otherUserId: string;
  currentUserName: string;
  otherUserName: string;
}

/**
 * Real-time chat component using Supabase Realtime
 *
 * Features:
 * - Real-time message updates via Supabase Realtime
 * - Auto-scroll to bottom on new messages
 * - Mark messages as read when viewed
 * - Send/receive messages with tRPC
 * - Uses existing messages table schema
 *
 * Session Claims: NO database queries for auth checks
 * - All auth via ctx.companyId from session claims
 * - RLS policies enforce data isolation
 */
export function ChatBox({
  clientId,
  currentUserId,
  otherUserId,
  currentUserName,
  otherUserName,
}: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Create Supabase client for Realtime
  // Uses @supabase/supabase-js (NOT @supabase/ssr) per preflight checklist
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  // Fetch conversation using tRPC
  const { data, isLoading } = trpc.messages.getConversation.useQuery({
    clientId,
    otherUserId,
  });

  // Update local state when data loads
  useEffect(() => {
    if (data) {
      setMessages(data);
    }
  }, [data]);

  // Subscribe to Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${clientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;

          // Only add if it's part of this conversation
          if (
            (newMessage.sender_id === currentUserId &&
              newMessage.recipient_id === otherUserId) ||
            (newMessage.sender_id === otherUserId &&
              newMessage.recipient_id === currentUserId)
          ) {
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, currentUserId, otherUserId, supabase]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read
  const markAsReadMutation = trpc.messages.markAsRead.useMutation();

  useEffect(() => {
    const unreadIds = messages
      .filter((m) => !m.is_read && m.recipient_id === currentUserId)
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
      body: input,
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
            const isOwnMessage = message.sender_id === currentUserId;
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
                    {message.body}
                  </p>

                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs opacity-70">
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>

                    {isOwnMessage && (
                      <span className="text-xs opacity-70">
                        {message.is_read ? '✓✓' : '✓'}
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
