'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { PageLoader } from '@/components/ui/loading-spinner';
import { ConversationList } from '@/components/messages/conversation-list';
import { ChatRoom } from '@/components/messages/chat-room';
import { AIAssistantPanel } from '@/components/messages/ai-assistant-panel';
import { Id } from '@/convex/_generated/dataModel';

export default function MessagesPage() {
  const [selectedClientId, setSelectedClientId] = useState<Id<'clients'> | undefined>();
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  // Get current user
  const currentUser = useQuery(api.users.getCurrent);

  // Get conversations
  const conversations = useQuery(
    api.messages.getConversations,
    currentUser?.company_id && currentUser?.clerk_id
      ? { companyId: currentUser.company_id, userId: currentUser.clerk_id }
      : 'skip'
  );

  // Loading state
  if (currentUser === undefined || conversations === undefined) {
    return <PageLoader />;
  }

  // Not authenticated
  if (currentUser === null) {
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
          conversations={conversations}
          selectedClientId={selectedClientId}
          onSelectConversation={(clientId) => {
            setSelectedClientId(clientId as Id<'clients'>);
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
