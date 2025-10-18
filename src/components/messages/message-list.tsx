'use client';

import { useEffect, useRef } from 'react';
import { MessageBubble } from './message-bubble';
import { Loader2 } from 'lucide-react';

interface Message {
  id: string;
  sender_type: 'company' | 'client' | 'ai_assistant';
  sender_id?: string;
  sender_name: string;
  message: string;
  created_at: number;
  read: boolean;
  read_by: string[];
  ai_generated: boolean;
  edited_at?: number;
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
          isOwnMessage={message.sender_id === currentUserId}
        />
      ))}
      {/* Invisible div at the end for auto-scroll target */}
      <div ref={messagesEndRef} />
    </div>
  );
}
