import { formatDistanceToNow } from 'date-fns';
import { Check, CheckCheck, User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Message interface - aligned with Drizzle schema (February 2026)
 * Uses 'unknown' for metadata since that's what Drizzle returns
 */
interface MessageBubbleProps {
  message: {
    id: string;
    senderId: string;
    content: string | null;
    isRead: boolean | null;
    createdAt: Date;
    updatedAt: Date;
    metadata?: unknown;
  };
  isOwnMessage: boolean;
}

export function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  // Safely extract sender info from metadata
  const meta = (message.metadata && typeof message.metadata === 'object')
    ? (message.metadata as Record<string, unknown>)
    : {};
  const senderType = (meta.senderType as string) || 'company';
  const senderName = (meta.senderName as string) || 'Unknown';
  const isAI = senderType === 'ai_assistant';

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
              isAI ? 'bg-primary/10' : 'bg-teal-100 dark:bg-teal-900/30'
            )}
          >
            {isAI ? (
              <Bot className="h-4 w-4 text-primary" />
            ) : (
              <User className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            )}
          </div>
        </div>
      )}

      <div className={cn('flex flex-col max-w-[70%]', isOwnMessage && 'items-end')}>
        {/* Sender name */}
        {!isOwnMessage && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-mocha-700 dark:text-mocha-300">
              {senderName}
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
              ? 'bg-teal-600 text-white rounded-br-sm'
              : isAI
              ? 'bg-primary/5 text-mocha-900 dark:text-mocha-100 border border-primary/20 rounded-bl-sm'
              : 'bg-mocha-100 dark:bg-mocha-800 text-mocha-900 dark:text-mocha-100 rounded-bl-sm'
          )}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        {/* Timestamp and read status */}
        <div
          className={cn(
            'flex items-center gap-1 mt-1',
            isOwnMessage ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </span>
          {message.updatedAt && message.updatedAt !== message.createdAt && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
          {isOwnMessage && (
            <div className="text-muted-foreground">
              {message.isRead ? (
                <CheckCheck className="h-3 w-3 text-teal-600 dark:text-teal-400" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </div>
          )}
        </div>
      </div>

      {isOwnMessage && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}
