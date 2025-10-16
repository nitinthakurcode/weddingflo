'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/client';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Calendar, Mail, Phone, Sparkles } from 'lucide-react';

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
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  // Fetch client details
  const { data: client } = useQuery({
    queryKey: ['clients', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Fetch messages
  const { data: messages } = useQuery({
    queryKey: ['messages', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Real-time subscription for new messages
  useEffect(() => {
    if (!clientId) return;

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
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', clientId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, supabase, queryClient]);

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          company_id: companyId,
          client_id: clientId,
          sender_type: 'company',
          sender_id: currentUserId,
          sender_name: currentUserName,
          message,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', clientId] });
    },
  });

  const handleSendMessage = async (message: string) => {
    await sendMessage.mutateAsync(message);
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
        isLoading={!messages}
      />

      {/* Message Input */}
      <MessageInput onSend={handleSendMessage} />
    </div>
  );
}
