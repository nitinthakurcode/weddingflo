'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSupabaseClient } from '@/lib/supabase/client';
import { useUser } from '@clerk/nextjs';
import { PageLoader } from '@/components/ui/loading-spinner';
import { ConversationList } from '@/components/messages/conversation-list';
import { ChatRoom } from '@/components/messages/chat-room';
import { AIAssistantPanel } from '@/components/messages/ai-assistant-panel';

export default function MessagesPage() {
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const queryClient = useQueryClient();

  // Get current user
  const { data: currentUser, isLoading: isLoadingUser } = useQuery<any>({
    queryKey: ['currentUser', user?.id],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase client not ready');
      if (!user?.id) throw new Error('User ID not available');
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!supabase,
  });

  // Get conversations
  const { data: conversations, isLoading: isLoadingConversations } = useQuery<any[]>({
    queryKey: ['conversations', currentUser?.company_id, currentUser?.clerk_id],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase client not ready');
      if (!user?.id) throw new Error('User ID not available');
      if (!currentUser?.company_id || !currentUser?.clerk_id) return [];

      // Get all messages for this company
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*, clients(*)')
        .eq('company_id', currentUser.company_id)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Group by client to create conversations
      const conversationMap = new Map();
      messagesData?.forEach((message: any) => {
        const clientId = message.client_id;
        if (!conversationMap.has(clientId)) {
          conversationMap.set(clientId, {
            client: message.clients,
            lastMessage: message,
            unreadCount: 0,
          });
        }
      });

      return Array.from(conversationMap.values());
    },
    enabled: !!currentUser?.company_id && !!currentUser?.clerk_id && !!supabase,
  });

  // Set up realtime subscription for messages
  useEffect(() => {
    if (!currentUser?.company_id || !supabase) return;

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `company_id=eq.${currentUser.company_id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          queryClient.invalidateQueries({ queryKey: ['messages'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `company_id=eq.${currentUser.company_id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          queryClient.invalidateQueries({ queryKey: ['messages'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.company_id, queryClient, supabase]);

  // Loading state
  if (isLoadingUser || isLoadingConversations) {
    return <PageLoader />;
  }

  // Not authenticated
  if (!user || !currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Authentication Required</h2>
          <p className="text-muted-foreground mt-2">
            Please sign in to view your messages.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)]">
      {/* Conversations List (Left Panel) - Hidden on mobile when chat is selected */}
      <div className={`w-full sm:w-72 md:w-80 flex-shrink-0 ${selectedClientId ? 'hidden sm:block' : 'block'}`}>
        <ConversationList
          conversations={conversations || []}
          selectedClientId={selectedClientId}
          onSelectConversation={(clientId) => {
            setSelectedClientId(clientId as string);
            setShowAIAssistant(false); // Close AI panel when switching conversations
          }}
          companyId={currentUser.company_id}
        />
      </div>

      {/* Chat Room (Center Panel) - Full width on mobile */}
      <div className={`flex-1 ${!selectedClientId ? 'hidden sm:flex' : 'flex'}`}>
        {selectedClientId ? (
          <ChatRoom
            clientId={selectedClientId}
            companyId={currentUser.company_id}
            currentUserId={currentUser.clerk_id}
            currentUserName={currentUser.name}
            onRequestAIAssistant={() => setShowAIAssistant(!showAIAssistant)}
            onBack={() => setSelectedClientId(undefined)} // Add back button for mobile
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50 p-4">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg
                  className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 break-words px-2">
                Select a conversation
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground break-words px-2">
                Choose a client from the list to start messaging
              </p>
            </div>
          </div>
        )}
      </div>

      {/* AI Assistant Panel (Right Panel - Conditional) - Hidden on small screens */}
      {showAIAssistant && selectedClientId && (
        <div className="hidden lg:block">
          <AIAssistantPanel
            clientId={selectedClientId}
            companyId={currentUser.company_id}
            onClose={() => setShowAIAssistant(false)}
          />
        </div>
      )}
    </div>
  );
}
