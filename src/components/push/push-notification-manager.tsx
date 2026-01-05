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
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/lib/trpc/client';
import { toast } from 'sonner';
import { Bell, BellOff, Loader2, CheckCircle2, AlertCircle, Smartphone, Monitor, Tablet } from 'lucide-react';
import { pushNotificationManager, PushNotificationManager } from '@/lib/firebase/push-manager';
import type { NotificationPermission as BrowserNotificationPermission } from '@/types/push-notifications';

interface Subscription {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string | null;
  auth: string | null;
  fcmToken: string | null;
  deviceType: string | null;
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

export function PushNotificationManagerComponent() {
  const t = useTranslations('pushNotifications');
  const tCommon = useTranslations('common');
  const [permission, setPermission] = useState<BrowserNotificationPermission>('default');
  const [supported, setSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  // tRPC queries
  const { data: subscriptionsData, refetch: refetchSubs, isLoading: subsLoading } =
    trpc.push.getSubscriptions.useQuery();
  const subscriptions = (subscriptionsData || []) as Subscription[];

  // tRPC mutations
  const subscribeMutation = trpc.push.subscribe.useMutation({
    onSuccess: () => {
      refetchSubs();
      toast.success(t('enabledSuccess'));
    },
    onError: (error) => {
      toast.error(t('failedToSave'), {
        description: error.message,
      });
    },
  });

  const unsubscribeMutation = trpc.push.unsubscribe.useMutation({
    onSuccess: () => {
      refetchSubs();
      toast.success(t('unsubscribed'));
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
        toast.error(t('permissionDenied'), {
          description: t('enableInSettings'),
        });
        return;
      }

      // Step 2: Get FCM token
      const token = await pushNotificationManager.getToken();
      if (!token) {
        throw new Error(t('failedToGetToken'));
      }

      // Step 3: Get device info
      const deviceInfo = pushNotificationManager.getDeviceInfo();

      // Step 4: Save subscription to database
      await subscribeMutation.mutateAsync({
        endpoint: token,
        p256dh: '', // Firebase abstracts Web Push keys
        auth: '',
        fcmToken: token, // Store FCM token
        deviceType: deviceInfo.device_type,
      });

      // Step 5: Setup foreground message listener
      pushNotificationManager.addMessageListener((payload) => {
        const title = payload.notification?.title || t('newNotification');
        const body = payload.notification?.body || '';

        toast(title, {
          description: body,
          action: payload.data?.url
            ? {
                label: tCommon('view'),
                onClick: () => {
                  window.location.href = payload.data?.url as string;
                },
              }
            : undefined,
        });
      });

      toast.success(t('enabledSuccess'), {
        description: t('receiveUpdates'),
      });
    } catch (error) {
      console.error('Enable notifications error:', error);
      toast.error(t('failedToEnable'), {
        description: error instanceof Error ? error.message : t('unknownError'),
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
        toast.success(t('testSent'), {
          description: t('checkNotifications'),
        });
      } else {
        toast.error(t('testFailed'));
      }
    } catch (error) {
      console.error('Test notification error:', error);
      toast.error(t('testFailed'));
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
      toast.error(t('failedToUnsubscribe'));
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
            {t('notSupported')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('notSupportedDescription')}
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
          {t('title')}
        </CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permission Status */}
        {permission === 'granted' && isSubscribed ? (
          <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <div className="flex items-center gap-2 text-sm font-medium text-green-900 dark:text-green-100">
              <CheckCircle2 className="h-4 w-4" />
              {t('enabledOnDevices', { count: subscriptions.length })}
            </div>
            <p className="mt-1 text-sm text-green-700 dark:text-green-300">
              {t('willReceiveUpdates')}
            </p>
          </div>
        ) : permission === 'denied' ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('blocked')}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t('enableDescription')}
            </p>
            <Button onClick={handleEnableNotifications} disabled={subscribing} className="w-full sm:w-auto">
              {subscribing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Bell className="mr-2 h-4 w-4" />
              {t('enable')}
            </Button>
          </div>
        )}

        {/* Active Devices List */}
        {isSubscribed && subscriptions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t('activeDevices')}</h4>
            <div className="space-y-2">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(sub.deviceType)}
                    <div>
                      <div className="text-sm font-medium">
                        {sub.deviceType
                          ? sub.deviceType.charAt(0).toUpperCase() + sub.deviceType.slice(1)
                          : t('unknownDevice')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t('added', { date: new Date(sub.createdAt).toLocaleDateString() })}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnsubscribe(sub.endpoint)}
                    disabled={unsubscribeMutation.isPending}
                  >
                    {tCommon('remove')}
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
              {t('sendTest')}
            </Button>
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-muted-foreground pt-2">
          <p>
            {t('helpText')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
