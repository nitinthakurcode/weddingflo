'use client'

import { ChatBox } from '@/components/chat/ChatBox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageCircle } from 'lucide-react'

interface ChatPageProps {
  clientId: string
  currentUserId: string
  currentUserName: string
  plannerUserId: string
  plannerName: string
  companyName: string
}

export function ChatPage({
  clientId,
  currentUserId,
  currentUserName,
  plannerUserId,
  plannerName,
  companyName
}: ChatPageProps) {
  return (
    <div className="container max-w-4xl mx-auto p-4 sm:p-6 h-[calc(100vh-4rem)] flex flex-col">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg sm:text-xl">
                Chat with {companyName}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {plannerName}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <ChatBox
            clientId={clientId}
            currentUserId={currentUserId}
            otherUserId={plannerUserId}
            currentUserName={currentUserName}
            otherUserName={plannerName}
          />
        </CardContent>
      </Card>
    </div>
  )
}
