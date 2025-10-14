'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Check, X, Clock, AlertCircle } from 'lucide-react';
import { getQueueStats, getAllActions } from '@/lib/offline/offline-queue';
import { getSyncManager, SyncResult } from '@/lib/offline/sync-manager';
import { getDatabaseInfo } from '@/lib/offline/indexed-db';
import { useToast } from '@/hooks/use-toast';

/**
 * Sync Status Component
 * Shows detailed sync status and allows manual sync
 */
export function SyncStatus() {
  const { toast } = useToast();
  const [stats, setStats] = useState({ total: 0, pending: 0, syncing: 0, failed: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [dbInfo, setDbInfo] = useState<any>(null);

  useEffect(() => {
    loadStats();
    loadDbInfo();

    const interval = setInterval(loadStats, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  async function loadStats() {
    try {
      const queueStats = await getQueueStats();
      setStats(queueStats);

      const syncManager = getSyncManager();
      const lastSyncTime = await syncManager.getLastSyncTimestamp();
      if (lastSyncTime) {
        setLastSync(new Date(lastSyncTime));
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  async function loadDbInfo() {
    try {
      const info = await getDatabaseInfo();
      setDbInfo(info);
    } catch (error) {
      console.error('Failed to load DB info:', error);
    }
  }

  async function handleSync() {
    if (!navigator.onLine) {
      toast({
        title: 'Cannot sync',
        description: 'You are currently offline. Please connect to the internet to sync.',
        variant: 'destructive',
      });
      return;
    }

    setIsSyncing(true);
    setSyncProgress({ current: 0, total: stats.pending });

    const syncManager = getSyncManager({
      onProgress: (current, total) => {
        setSyncProgress({ current, total });
      },
      onComplete: (result: SyncResult) => {
        setIsSyncing(false);
        loadStats();
        loadDbInfo();

        if (result.success) {
          toast({
            title: 'Sync complete',
            description: `Successfully synced ${result.synced} actions.`,
          });
        } else {
          toast({
            title: 'Sync partially failed',
            description: `Synced ${result.synced}, failed ${result.failed}. Check console for details.`,
            variant: 'destructive',
          });
        }
      },
      onError: (error) => {
        setIsSyncing(false);
        toast({
          title: 'Sync failed',
          description: error.message,
          variant: 'destructive',
        });
      },
    });

    await syncManager.syncOfflineActions();
  }

  const progressPercent = syncProgress.total > 0
    ? (syncProgress.current / syncProgress.total) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sync Status</CardTitle>
            <CardDescription>
              {lastSync ? (
                <span>Last synced {lastSync.toLocaleString()}</span>
              ) : (
                <span>Never synced</span>
              )}
            </CardDescription>
          </div>
          <Button
            onClick={handleSync}
            disabled={isSyncing || stats.pending === 0 || !navigator.onLine}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sync Progress */}
        {isSyncing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Syncing actions...</span>
              <span>{syncProgress.current} / {syncProgress.total}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        {/* Queue Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <X className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">Failed</span>
            </div>
            <div className="text-2xl font-bold">{stats.failed}</div>
          </div>
        </div>

        {/* Database Info */}
        {dbInfo && (
          <div className="pt-4 border-t space-y-2">
            <h4 className="font-medium text-sm">Local Database</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Guests:</span>{' '}
                <span className="font-medium">{dbInfo.counts.guests}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Budgets:</span>{' '}
                <span className="font-medium">{dbInfo.counts.budgets}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Vendors:</span>{' '}
                <span className="font-medium">{dbInfo.counts.vendors}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Storage:</span>{' '}
                <span className="font-medium">
                  {(dbInfo.size.usage / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Offline Warning */}
        {!navigator.onLine && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <strong>You are offline.</strong> Changes will sync automatically when you reconnect.
            </div>
          </div>
        )}

        {/* Actions List (if pending or failed) */}
        {stats.total > 0 && <ActionsList />}
      </CardContent>
    </Card>
  );
}

/**
 * Actions List - Shows pending/failed actions
 */
function ActionsList() {
  const [actions, setActions] = useState<any[]>([]);

  useEffect(() => {
    loadActions();
  }, []);

  async function loadActions() {
    try {
      const allActions = await getAllActions();
      setActions(allActions.filter((a) => a.status !== 'syncing'));
    } catch (error) {
      console.error('Failed to load actions:', error);
    }
  }

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="pt-4 border-t space-y-2">
      <h4 className="font-medium text-sm">Queued Actions</h4>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {actions.map((action) => (
          <div
            key={action.id}
            className="flex items-center justify-between p-2 bg-muted rounded-md text-sm"
          >
            <div className="flex items-center gap-2">
              {action.status === 'pending' ? (
                <Clock className="h-3 w-3 text-yellow-600" />
              ) : (
                <X className="h-3 w-3 text-red-600" />
              )}
              <span className="font-medium capitalize">{action.type.replace('-', ' ')}</span>
              {action.retryCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Retry {action.retryCount}
                </Badge>
              )}
            </div>
            <Badge variant={action.status === 'pending' ? 'secondary' : 'destructive'}>
              {action.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
