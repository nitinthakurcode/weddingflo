'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff, Wifi, AlertCircle } from 'lucide-react';
import { getQueueStats } from '@/lib/offline/offline-queue';

/**
 * Offline Indicator
 * Shows banner when device is offline with pending actions count
 */
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine);
    setShowBanner(!navigator.onLine);

    // Update pending count
    updatePendingCount();

    // Listen for online/offline events
    const handleOnline = () => {
      console.log('🌐 Device is online');
      setIsOnline(true);
      setShowBanner(true);
      // Hide success banner after 5 seconds
      setTimeout(() => {
        if (navigator.onLine) {
          setShowBanner(false);
        }
      }, 5000);
    };

    const handleOffline = () => {
      console.log('📴 Device is offline');
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for queue updates
    const handleQueueUpdate = () => {
      updatePendingCount();
    };

    window.addEventListener('offline-queue-updated', handleQueueUpdate);

    // Periodic update of pending count
    const interval = setInterval(updatePendingCount, 10000); // Every 10 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-updated', handleQueueUpdate);
      clearInterval(interval);
    };
  }, []);

  async function updatePendingCount() {
    try {
      const stats = await getQueueStats();
      setPendingCount(stats.pending);
    } catch (error) {
      console.error('Failed to get queue stats:', error);
    }
  }

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-300">
      <Alert
        variant={isOnline ? 'default' : 'destructive'}
        className={`rounded-none border-x-0 border-t-0 ${
          isOnline
            ? 'bg-green-50 border-green-200 text-green-900'
            : 'bg-destructive/90 text-destructive-foreground'
        }`}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5" />
            )}
            <AlertDescription className="font-medium">
              {isOnline ? (
                <>
                  Back online!
                  {pendingCount > 0 && (
                    <span className="ml-2 text-sm">
                      Syncing {pendingCount} pending {pendingCount === 1 ? 'action' : 'actions'}...
                    </span>
                  )}
                </>
              ) : (
                <>
                  You are offline
                  {pendingCount > 0 && (
                    <span className="ml-2 text-sm">
                      · {pendingCount} {pendingCount === 1 ? 'action' : 'actions'} pending
                    </span>
                  )}
                </>
              )}
            </AlertDescription>
          </div>

          {!isOnline && (
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>Changes will sync when reconnected</span>
            </div>
          )}
        </div>
      </Alert>
    </div>
  );
}

/**
 * Compact offline indicator for header/navbar
 */
export function CompactOfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    updatePendingCount();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleQueueUpdate = () => updatePendingCount();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-updated', handleQueueUpdate);

    const interval = setInterval(updatePendingCount, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-updated', handleQueueUpdate);
      clearInterval(interval);
    };
  }, []);

  async function updatePendingCount() {
    try {
      const stats = await getQueueStats();
      setPendingCount(stats.pending);
    } catch (error) {
      console.error('Failed to get queue stats:', error);
    }
  }

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-sm">
      {isOnline ? (
        <>
          <Wifi className="h-3 w-3 text-green-600" />
          <span className="text-xs text-muted-foreground">
            Syncing {pendingCount}...
          </span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3 text-destructive" />
          <span className="text-xs text-destructive">Offline</span>
          {pendingCount > 0 && (
            <span className="text-xs text-muted-foreground">
              · {pendingCount} pending
            </span>
          )}
        </>
      )}
    </div>
  );
}
