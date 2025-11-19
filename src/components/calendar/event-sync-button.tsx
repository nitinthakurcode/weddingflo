'use client';

import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';
import { Cloud, Loader2 } from 'lucide-react';

interface EventSyncButtonProps {
  eventId: string;
}

export function EventSyncButton({ eventId }: EventSyncButtonProps) {
  const { toast } = useToast();

  const syncMutation = trpc.calendar.syncEventToGoogle.useMutation({
    onSuccess: () => {
      toast({ title: 'Event synced to Google Calendar' });
    },
    onError: (error) => {
      toast({
        title: 'Sync failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => syncMutation.mutate({ eventId })}
      disabled={syncMutation.isPending}
    >
      {syncMutation.isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Cloud className="mr-2 h-4 w-4" />
      )}
      Sync to Google
    </Button>
  );
}
