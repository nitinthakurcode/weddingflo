'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Calendar, Mail, Phone, Sparkles } from 'lucide-react';
import { Id } from '@/convex/_generated/dataModel';

interface ChatRoomProps {
  clientId: Id<'clients'>;
  companyId: Id<'companies'>;
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
  // Fetch client details
  const client = useQuery(api.clients.get, { clientId });

  // Fetch messages
  const messages = useQuery(api.messages.list, { clientId });

  // Send message mutation
  const sendMessage = useMutation(api.messages.send);

  const handleSendMessage = async (message: string) => {
    await sendMessage({
      company_id: companyId,
      client_id: clientId,
      sender_type: 'company',
      sender_id: currentUserId,
      sender_name: currentUserName,
      message,
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

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold truncate">{client.client_name}</h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                <span className="truncate">{client.email}</span>
              </div>
              {client.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{client.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{format(client.wedding_date, 'MMM dd, yyyy')}</span>
              </div>
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
        isLoading={messages === undefined}
      />

      {/* Message Input */}
      <MessageInput onSend={handleSendMessage} />
    </div>
  );
}
