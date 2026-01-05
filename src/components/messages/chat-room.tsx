'use client';

import { useEffect } from 'react';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Calendar, Mail, Phone, Sparkles } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';

interface ChatRoomProps {
  clientId: string;
  companyId: string;
  currentUserId: string;
  currentUserName: string;
  onRequestAIAssistant?: () => void;
  onBack?: () => void;
}

export function ChatRoom({
  clientId,
  companyId,
  currentUserId,
  currentUserName,
  onRequestAIAssistant,
  onBack,
}: ChatRoomProps) {
  const utils = trpc.useUtils();

  // Fetch client details
  const { data: client } = trpc.clients.getById.useQuery(
    { id: clientId },
    { enabled: !!clientId }
  );

  // Fetch messages using getMessages procedure
  const { data: messagesData } = trpc.messages.getMessages.useQuery(
    { clientId, limit: 50 },
    { enabled: !!clientId }
  );
  const messages = messagesData?.messages || [];

  // Poll for new messages (replaces realtime subscription)
  // TODO: Consider implementing Server-Sent Events or WebSockets for true realtime
  useEffect(() => {
    if (!clientId) return;

    const pollInterval = setInterval(() => {
      utils.messages.getMessages.invalidate({ clientId });
    }, 5000); // Poll every 5 seconds for chat

    return () => {
      clearInterval(pollInterval);
    };
  }, [clientId, utils]);

  // Send message mutation
  const sendMessageMutation = trpc.messages.sendMessage.useMutation({
    onSuccess: () => {
      utils.messages.getMessages.invalidate({ clientId });
    },
  });

  const handleSendMessage = async (message: string) => {
    await sendMessageMutation.mutateAsync({
      clientId,
      recipientId: currentUserId, // For now, send to self (will need proper recipient logic)
      content: message,
    });
  };

  if (!client) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  // Build client display name from partner fields
  const clientDisplayName = client.partner2FirstName
    ? `${client.partner1FirstName} & ${client.partner2FirstName}`
    : `${client.partner1FirstName} ${client.partner1LastName || ''}`.trim();

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold truncate">{clientDisplayName}</h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              {client.partner1Email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{client.partner1Email}</span>
                </div>
              )}
              {client.partner1Phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{client.partner1Phone}</span>
                </div>
              )}
              {client.weddingDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{format(new Date(client.weddingDate), 'MMM dd, yyyy')}</span>
                </div>
              )}
            </div>
          </div>

          {/* AI Assistant Button */}
          {onRequestAIAssistant && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRequestAIAssistant}
              className="ml-4"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Assistant
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <MessageList
        messages={messages || []}
        currentUserId={currentUserId}
        isLoading={!messages}
      />

      {/* Message Input */}
      <MessageInput onSend={handleSendMessage} />
    </div>
  );
}
