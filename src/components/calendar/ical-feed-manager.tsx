'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ICalFeedManager() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const utils = trpc.useUtils();

  const { data: tokenData } = trpc.calendar.getOrCreateICalToken.useQuery();

  const regenerateMutation = trpc.calendar.regenerateICalToken.useMutation({
    onSuccess: () => {
      utils.calendar.getOrCreateICalToken.invalidate();
      toast({ title: 'Feed URL regenerated successfully' });
    },
  });

  // Optimistic update for feed toggle
  const toggleFeedMutation = trpc.calendar.enableICalFeed.useMutation({
    onMutate: async () => {
      await utils.calendar.getOrCreateICalToken.cancel();
      const previousToken = utils.calendar.getOrCreateICalToken.getData();

      // Optimistically update UI
      utils.calendar.getOrCreateICalToken.setData(undefined, (old: typeof previousToken) => {
        if (!old) return old;
        return { ...old, isActive: true };
      });

      return { previousToken };
    },
    onError: (_error, _vars, context) => {
      if (context?.previousToken) {
        utils.calendar.getOrCreateICalToken.setData(undefined, context.previousToken);
      }
      toast({ title: 'Failed to enable feed', variant: 'destructive' });
    },
    onSettled: () => {
      utils.calendar.getOrCreateICalToken.invalidate();
    },
  });

  const disableFeedMutation = trpc.calendar.disableICalFeed.useMutation({
    onMutate: async () => {
      await utils.calendar.getOrCreateICalToken.cancel();
      const previousToken = utils.calendar.getOrCreateICalToken.getData();

      // Optimistically update UI
      utils.calendar.getOrCreateICalToken.setData(undefined, (old: typeof previousToken) => {
        if (!old) return old;
        return { ...old, isActive: false };
      });

      return { previousToken };
    },
    onError: (_error, _vars, context) => {
      if (context?.previousToken) {
        utils.calendar.getOrCreateICalToken.setData(undefined, context.previousToken);
      }
      toast({ title: 'Failed to disable feed', variant: 'destructive' });
    },
    onSettled: () => {
      utils.calendar.getOrCreateICalToken.invalidate();
    },
  });

  const handleCopy = async () => {
    if (!tokenData?.feedUrl) return;
    await navigator.clipboard.writeText(tokenData.feedUrl);
    setCopied(true);
    toast({ title: 'Feed URL copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    if (confirm('This will invalidate your old feed URL. Continue?')) {
      regenerateMutation.mutate();
    }
  };

  const handleToggleFeed = () => {
    if (tokenData?.isActive) {
      disableFeedMutation.mutate();
    } else {
      toggleFeedMutation.mutate();
    }
  };

  if (!tokenData) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>iCal Feed URL</CardTitle>
          <CardDescription>
            Subscribe to this URL in any calendar app (Apple Calendar, Google Calendar, Outlook, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={tokenData.feedUrl}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              disabled={!tokenData.isActive}
            >
              {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRegenerate}
              disabled={regenerateMutation.isPending}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Feed Status</Label>
              <p className="text-sm text-muted-foreground">
                {tokenData.isActive ? 'Active - Calendar apps can sync events' : 'Disabled - Feed is not accessible'}
              </p>
            </div>
            <Switch
              checked={tokenData.isActive ?? false}
              onCheckedChange={handleToggleFeed}
            />
          </div>

          <Alert>
            <AlertDescription>
              <strong>How to use:</strong>
              <ol className="mt-2 ml-4 list-decimal space-y-1 text-sm">
                <li>Copy the feed URL above</li>
                <li>Open your calendar app (Apple Calendar, Google, Outlook)</li>
                <li>Add calendar by URL or subscribe to calendar</li>
                <li>Paste the URL and save</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instructions by Platform</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="font-medium">Apple Calendar (iPhone/Mac)</h4>
            <p className="text-sm text-muted-foreground">
              Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar
            </p>
          </div>
          <div>
            <h4 className="font-medium">Google Calendar</h4>
            <p className="text-sm text-muted-foreground">
              Settings → Add calendar → From URL → Paste URL
            </p>
          </div>
          <div>
            <h4 className="font-medium">Microsoft Outlook</h4>
            <p className="text-sm text-muted-foreground">
              Calendar → Add calendar → Subscribe from web → Paste URL
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
