'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff, Wifi, Clock } from 'lucide-react';
import { offlineQueue } from '@/lib/offline/queue-manager';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        offlineQueue.processQueue();
      }
    };

    const updateQueueSize = async () => {
      const size = await offlineQueue.getQueueSize();
      setQueueSize(size);
    };

    // Initial check
    updateOnlineStatus();
    updateQueueSize();

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Poll queue size every 5 seconds
    const interval = setInterval(updateQueueSize, 5000);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(interval);
    };
  }, []);

  if (isOnline && queueSize === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      {!isOnline && (
        <Alert variant="destructive" className="mb-2">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            You're offline. Changes will be saved when you reconnect.
          </AlertDescription>
        </Alert>
      )}

      {queueSize > 0 && (
        <Alert className="bg-gold-50 border-gold-200 dark:bg-gold-950/30 dark:border-gold-800">
          <Clock className="h-4 w-4 text-gold-600 dark:text-gold-400" />
          <AlertDescription className="text-gold-800 dark:text-gold-300">
            {queueSize} pending {queueSize === 1 ? 'change' : 'changes'} waiting to sync
            {isOnline && ' - syncing now...'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
