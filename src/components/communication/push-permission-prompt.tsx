'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Bell, BellOff, X } from 'lucide-react';
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
} from '@/lib/notifications/push-service';

export function PushPermissionPrompt() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsSupported(isPushSupported());
    setPermission(getNotificationPermission());

    // Check if user previously dismissed
    const wasDismissed = localStorage.getItem('push-prompt-dismissed');
    if (wasDismissed === 'true') {
      setDismissed(true);
    }
  }, []);

  const handleRequestPermission = async () => {
    setLoading(true);
    try {
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);

      if (newPermission === 'granted') {
        // Subscribe to push notifications
        // You would typically save this subscription to your database
        console.log('Push notifications enabled');
      }
    } catch (error) {
      console.error('Failed to request permission:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('push-prompt-dismissed', 'true');
  };

  // Don't show if not supported, already granted/denied, or dismissed
  if (
    !isSupported ||
    permission !== 'default' ||
    dismissed
  ) {
    return null;
  }

  return (
    <Card className="p-4 border-2 border-primary/20 bg-primary/5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 rounded-full bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">
              Enable Notifications
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Stay updated with real-time notifications for check-ins, messages,
              and important updates.
            </p>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleRequestPermission}
                disabled={loading}
              >
                {loading ? 'Requesting...' : 'Enable Notifications'}
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </div>

        <Button
          size="icon"
          variant="ghost"
          onClick={handleDismiss}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
