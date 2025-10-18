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
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/client';

interface Conversation {
  client: {
    id: string;
    client_name: string;
    email: string;
    wedding_date: string;
  };
  lastMessage?: {
    sender_name: string;
    message: string;
    created_at: string;
  };
  unreadCount: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedClientId?: string;
  onSelectConversation: (clientId: string) => void;
  companyId?: string;
}

export function ConversationList({
  conversations,
  selectedClientId,
  onSelectConversation,
  companyId,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const supabase = useSupabase();

  // Get all clients for the company
  const { data: allClients } = useQuery<any[]>({
    queryKey: ['clients', companyId],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase client not ready');
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', companyId);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId && !!supabase,
  });

  // Filter conversations based on search
  const filteredConversations = conversations.filter((conv) =>
    conv.client.client_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get client IDs that already have conversations
  const conversationClientIds = new Set(conversations.map((c) => c.client.id));

  // Filter clients for new message dialog
  const availableClients = allClients?.filter(
    (client) => client.client_name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleSelectNewClient = (clientId: string) => {
    setNewMessageOpen(false);
    setSearchQuery('');
    onSelectConversation(clientId);
  };

  return (
    <div className="flex flex-col h-full border-r bg-gray-50">
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
                          className="w-full px-3 py-2 text-left hover:bg-gray-100 rounded-md transition-colors"
                        >
                          <div className="font-medium text-sm">{client.client_name}</div>
                          <div className="text-xs text-muted-foreground">{client.email}</div>
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
                  selectedClientId === conversation.client.id && 'bg-white border-l-4 border-blue-600'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Client name */}
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className={cn(
                          'font-semibold text-sm truncate',
                          conversation.unreadCount > 0 && 'text-blue-600'
                        )}
                      >
                        {conversation.client.client_name}
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
                          {conversation.lastMessage.sender_name}:{' '}
                          {conversation.lastMessage.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(conversation.lastMessage.created_at), {
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
