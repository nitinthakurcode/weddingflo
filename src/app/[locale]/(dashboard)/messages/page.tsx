'use client';

import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Users, Hash, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function MessagesPage() {
  const t = useTranslations('messages');

  const { data: channels, isLoading } = trpc.messages.getTeamChannels.useQuery();

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Messages</h2>
          <p className="text-muted-foreground">
            Team channels and conversations
          </p>
        </div>
      </div>

      {/* Channels */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : channels && channels.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => (
            <Card key={channel.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                {channel.type === 'team_global' ? (
                  <Hash className="h-5 w-5 text-teal-600" />
                ) : (
                  <Users className="h-5 w-5 text-teal-600" />
                )}
                <div>
                  <CardTitle className="text-base">{channel.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {channel.type === 'team_global' ? 'Company-wide channel' : 'Client team channel'}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No channels yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Team channels will appear here when you are assigned to clients or have team members.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
