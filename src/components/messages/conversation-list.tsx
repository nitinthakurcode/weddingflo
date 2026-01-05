'use client';

import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Search, PenSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';

/**
 * Conversation interface - uses camelCase fields (December 2025)
 */
interface Conversation {
  client: {
    id: string;
    partner1FirstName: string;
    partner1LastName?: string | null;
    partner2FirstName?: string | null;
    partner1Email: string;
    weddingDate?: string | null;
  };
  lastMessage?: {
    senderName: string;
    content: string;
    createdAt: string;
  };
  unreadCount: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedClientId?: string;
  onSelectConversation: (clientId: string) => void;
}

export function ConversationList({
  conversations,
  selectedClientId,
  onSelectConversation,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessageOpen, setNewMessageOpen] = useState(false);

  // Get all clients (companyId comes from session context)
  const { data: allClients } = trpc.clients.list.useQuery(
    { search: searchQuery || undefined }
  );

  // Helper to get client display name
  const getClientDisplayName = (client: { partner1FirstName: string; partner1LastName?: string | null; partner2FirstName?: string | null }) => {
    return client.partner2FirstName
      ? `${client.partner1FirstName} & ${client.partner2FirstName}`
      : `${client.partner1FirstName} ${client.partner1LastName || ''}`.trim();
  };

  // Filter conversations based on search
  const filteredConversations = conversations.filter((conv) =>
    getClientDisplayName(conv.client).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get client IDs that already have conversations
  const conversationClientIds = new Set(conversations.map((c) => c.client.id));

  // Clients returned from the list query match the search already
  const availableClients = allClients || [];

  const handleSelectNewClient = (clientId: string) => {
    setNewMessageOpen(false);
    setSearchQuery('');
    onSelectConversation(clientId);
  };

  return (
    <div className="flex flex-col h-full border-r bg-mocha-50 dark:bg-mocha-900">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Messages</h2>
          <Dialog open={newMessageOpen} onOpenChange={setNewMessageOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <PenSquare className="h-4 w-4 mr-2" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Message</DialogTitle>
                <DialogDescription>
                  Select a client to start a conversation
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1">
                    {availableClients.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No clients found
                      </p>
                    ) : (
                      availableClients.map((client) => (
                        <button
                          key={client.id}
                          onClick={() => handleSelectNewClient(client.id)}
                          className="w-full px-3 py-2 text-left hover:bg-mocha-100 dark:hover:bg-mocha-800 rounded-md transition-colors"
                        >
                          <div className="font-medium text-sm">{getClientDisplayName(client)}</div>
                          <div className="text-xs text-muted-foreground">{client.partner1Email}</div>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversations list */}
      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.client.id}
                onClick={() => onSelectConversation(conversation.client.id)}
                className={cn(
                  'w-full px-4 py-3 text-left hover:bg-white transition-colors',
                  selectedClientId === conversation.client.id && 'bg-white dark:bg-mocha-800 border-l-4 border-teal-600'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Client name */}
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className={cn(
                          'font-semibold text-sm truncate',
                          conversation.unreadCount > 0 && 'text-teal-600 dark:text-teal-400'
                        )}
                      >
                        {getClientDisplayName(conversation.client)}
                      </h3>
                      {conversation.unreadCount > 0 && (
                        <Badge variant="default" className="ml-auto flex-shrink-0">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>

                    {/* Last message preview */}
                    {conversation.lastMessage ? (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground truncate">
                          {conversation.lastMessage.senderName}:{' '}
                          {conversation.lastMessage.content}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(conversation.lastMessage.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No messages yet</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
