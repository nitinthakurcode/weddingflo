import { formatDistanceToNow } from 'date-fns';
import { Check, CheckCheck, User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: {
    id: string;
    sender_type: 'company' | 'client' | 'ai_assistant';
    sender_name: string;
    message: string;
    created_at: number;
    read: boolean;
    read_by: string[];
    ai_generated: boolean;
    edited_at?: number;
  };
  isOwnMessage: boolean;
}

export function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  const isAI = message.sender_type === 'ai_assistant';

  return (
    <div
      className={cn(
        'flex gap-3 mb-4',
        isOwnMessage ? 'justify-end' : 'justify-start'
      )}
    >
      {!isOwnMessage && (
        <div className="flex-shrink-0">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              isAI ? 'bg-primary/10' : 'bg-blue-100'
            )}
          >
            {isAI ? (
              <Bot className="h-4 w-4 text-primary" />
            ) : (
              <User className="h-4 w-4 text-blue-600" />
            )}
          </div>
        </div>
      )}

      <div className={cn('flex flex-col max-w-[70%]', isOwnMessage && 'items-end')}>
        {/* Sender name */}
        {!isOwnMessage && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-700">
              {message.sender_name}
            </span>
            {isAI && (
              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                AI
              </span>
            )}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            'px-4 py-2 rounded-2xl',
            isOwnMessage
              ? 'bg-blue-600 text-white rounded-br-sm'
              : isAI
              ? 'bg-primary/5 text-gray-900 border border-primary/20 rounded-bl-sm'
              : 'bg-gray-100 text-gray-900 rounded-bl-sm'
          )}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
        </div>

        {/* Timestamp and read status */}
        <div
          className={cn(
            'flex items-center gap-1 mt-1',
            isOwnMessage ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(message.created_at, { addSuffix: true })}
          </span>
          {message.edited_at && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
          {isOwnMessage && (
            <div className="text-muted-foreground">
              {message.read_by.length > 1 ? (
                <CheckCheck className="h-3 w-3 text-blue-600" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </div>
          )}
        </div>
      </div>

      {isOwnMessage && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}
