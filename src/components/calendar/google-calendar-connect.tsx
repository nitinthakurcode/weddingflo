'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Calendar, Loader2 } from 'lucide-react';
import { useRouter } from '@/lib/navigation';

export function GoogleCalendarConnect() {
  const { toast } = useToast();
  const router = useRouter();

  const { data: status, refetch } = trpc.calendar.getGoogleCalendarStatus.useQuery();
  const disconnectMutation = trpc.calendar.disconnectGoogleCalendar.useMutation({
    onSuccess: () => {
      refetch();
      toast({ title: 'Google Calendar disconnected' });
    },
  });

  const handleConnect = () => {
    window.location.href = '/api/calendar/google/auth';
  };

  const handleDisconnect = () => {
    if (confirm('Disconnect Google Calendar? Synced events will remain in Google Calendar.')) {
      disconnectMutation.mutate();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar Integration
        </CardTitle>
        <CardDescription>
          Two-way sync with Google Calendar for automatic event updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.connected ? (
          <>
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Connected to Google Calendar
            </div>
            <div className="text-sm text-muted-foreground">
              Calendar ID: {status.calendarId}
            </div>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disconnect
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Connect your Google Calendar to automatically sync wedding events. Changes sync both ways.
            </p>
            <Button onClick={handleConnect}>
              Connect Google Calendar
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
