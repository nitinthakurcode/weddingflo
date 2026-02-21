'use client';

import { useEffect, useRef } from 'react';
import { MessageBubble } from './message-bubble';
import { Loader2 } from 'lucide-react';

/**
 * Message interface - aligned with Drizzle schema (February 2026)
 * Uses 'unknown' for metadata since that's what Drizzle returns
 * All optional fields match database nullable columns
 */
interface Message {
  id: string;
  companyId: string;
  clientId: string | null;
  guestId?: string | null;
  senderId: string;
  receiverId: string | null;
  subject?: string | null;
  content: string;
  messageType?: string | null;
  type?: string | null;
  isRead: boolean | null;
  readAt: Date | null;
  parentId?: string | null;
  metadata?: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  isLoading?: boolean;
}

export function MessageList({ messages, currentUserId, isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    };

    // Scroll immediately on mount
    scrollToBottom();

    // Scroll when messages change
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground">No messages yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Start the conversation by sending a message.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto px-4 py-4"
      style={{ scrollBehavior: 'smooth' }}
    >
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isOwnMessage={message.senderId === currentUserId}
        />
      ))}
      {/* Invisible div at the end for auto-scroll target */}
      <div ref={messagesEndRef} />
    </div>
  );
}
