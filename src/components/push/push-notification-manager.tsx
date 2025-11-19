/**
 * Push Notification Manager Component
 *
 * Provides UI for:
 * - Enabling/disabling push notifications
 * - Checking browser support
 * - Requesting permission
 * - Managing subscriptions
 * - Viewing subscription status
 *
 * Integrates with Firebase Cloud Messaging and tRPC backend
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc/client';
import { toast } from 'sonner';
import { Bell, BellOff, Loader2, CheckCircle2, AlertCircle, Smartphone, Monitor, Tablet } from 'lucide-react';
import { pushNotificationManager, PushNotificationManager } from '@/lib/firebase/push-manager';
import type { NotificationPermission as BrowserNotificationPermission } from '@/types/push-notifications';

export function PushNotificationManagerComponent() {
  const [permission, setPermission] = useState<BrowserNotificationPermission>('default');
  const [supported, setSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  // tRPC queries
  const { data: subscriptions, refetch: refetchSubs, isLoading: subsLoading } =
    trpc.push.getSubscriptions.useQuery();

  // tRPC mutations
  const subscribeMutation = trpc.push.subscribe.useMutation({
    onSuccess: () => {
      refetchSubs();
      toast.success('Push notifications enabled successfully');
    },
    onError: (error) => {
      toast.error('Failed to save subscription', {
        description: error.message,
      });
    },
  });

  const unsubscribeMutation = trpc.push.unsubscribe.useMutation({
    onSuccess: () => {
      refetchSubs();
      toast.success('Unsubscribed from push notifications');
    },
  });

  // Check browser support and permission on mount
  useEffect(() => {
    async function checkSupport() {
      setLoading(true);
      try {
        const isSupported = await PushNotificationManager.isPushNotificationSupported();
        setSupported(isSupported);

        if (isSupported) {
          const currentPermission = await PushNotificationManager.getPermissionStatus();
          setPermission(currentPermission);
        }
      } catch (error) {
        console.error('Error checking push support:', error);
        setSupported(false);
      } finally {
        setLoading(false);
      }
    }

    checkSupport();
  }, []);

  /**
   * Handle enabling push notifications
   * 1. Request browser permission
   * 2. Get FCM token
   * 3. Save subscription to database
   * 4. Setup foreground message listener
   */
  const handleEnableNotifications = async () => {
    setSubscribing(true);
    try {
      // Step 1: Request permission
      const perm = await PushNotificationManager.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        toast.error('Permission denied', {
          description: 'Please enable notifications in your browser settings',
        });
        return;
      }

      // Step 2: Get FCM token
      const token = await pushNotificationManager.getToken();
      if (!token) {
        throw new Error('Failed to get push notification token');
      }

      // Step 3: Get device info
      const deviceInfo = pushNotificationManager.getDeviceInfo();

      // Step 4: Save subscription to database
      await subscribeMutation.mutateAsync({
        endpoint: token,
        p256dhKey: '', // Firebase abstracts Web Push keys
        authKey: '',
        userAgent: deviceInfo.user_agent,
        deviceType: deviceInfo.device_type,
      });

      // Step 5: Setup foreground message listener
      pushNotificationManager.addMessageListener((payload) => {
        const title = payload.notification?.title || 'New Notification';
        const body = payload.notification?.body || '';

        toast(title, {
          description: body,
          action: payload.data?.url
            ? {
                label: 'View',
                onClick: () => {
                  window.location.href = payload.data?.url as string;
                },
              }
            : undefined,
        });
      });

      toast.success('Push notifications enabled!', {
        description: 'You will now receive important updates',
      });
    } catch (error) {
      console.error('Enable notifications error:', error);
      toast.error('Failed to enable notifications', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSubscribing(false);
    }
  };

  /**
   * Handle testing notifications
   * Sends a test notification to verify setup
   */
  const handleTestNotification = async () => {
    try {
      const success = await pushNotificationManager.sendTestNotification();
      if (success) {
        toast.success('Test notification sent!', {
          description: 'Check your notifications',
        });
      } else {
        toast.error('Failed to send test notification');
      }
    } catch (error) {
      console.error('Test notification error:', error);
      toast.error('Failed to send test notification');
    }
  };

  /**
   * Handle unsubscribing from a specific device
   */
  const handleUnsubscribe = async (endpoint: string) => {
    try {
      await unsubscribeMutation.mutateAsync({ endpoint });
    } catch (error) {
      console.error('Unsubscribe error:', error);
      toast.error('Failed to unsubscribe');
    }
  };

  /**
   * Get device icon based on device type
   */
  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  // Loading state
  if (loading || subsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Not supported state
  if (!supported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications Not Supported
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your browser doesn't support push notifications. Please use a modern browser like Chrome,
              Firefox, Safari, or Edge.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const isSubscribed = subscriptions && subscriptions.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isSubscribed ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receive instant browser notifications for important updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permission Status */}
        {permission === 'granted' && isSubscribed ? (
          <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <div className="flex items-center gap-2 text-sm font-medium text-green-900 dark:text-green-100">
              <CheckCircle2 className="h-4 w-4" />
              Push notifications enabled on {subscriptions.length} device
              {subscriptions.length > 1 ? 's' : ''}
            </div>
            <p className="mt-1 text-sm text-green-700 dark:text-green-300">
              You'll receive notifications for important updates
            </p>
          </div>
        ) : permission === 'denied' ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Notifications are blocked. Please enable them in your browser settings to receive updates.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Enable push notifications to receive instant updates about payments, RSVPs, and events.
            </p>
            <Button onClick={handleEnableNotifications} disabled={subscribing} className="w-full sm:w-auto">
              {subscribing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Bell className="mr-2 h-4 w-4" />
              Enable Push Notifications
            </Button>
          </div>
        )}

        {/* Active Devices List */}
        {isSubscribed && subscriptions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Active Devices</h4>
            <div className="space-y-2">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(sub.device_type)}
                    <div>
                      <div className="text-sm font-medium">
                        {sub.device_type
                          ? sub.device_type.charAt(0).toUpperCase() + sub.device_type.slice(1)
                          : 'Unknown Device'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Added {new Date(sub.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnsubscribe(sub.endpoint)}
                    disabled={unsubscribeMutation.isPending}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test Notification Button */}
        {isSubscribed && (
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleTestNotification}
              className="w-full sm:w-auto"
            >
              Send Test Notification
            </Button>
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-muted-foreground pt-2">
          <p>
            Push notifications work when your browser is open. You can manage notification preferences below.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
