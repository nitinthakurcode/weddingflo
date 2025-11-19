/**
 * Notification Settings Page
 *
 * Provides complete notification management interface:
 * - Enable/disable push notifications
 * - Configure notification preferences
 * - View notification history
 * - Test notifications
 */

import { PushNotificationManagerComponent } from '@/components/push/push-notification-manager';
import { PushNotificationPreferences } from '@/components/push/push-notification-preferences';
import { PushNotificationHistory } from '@/components/push/push-notification-history';
import { Separator } from '@/components/ui/separator';

export default function NotificationsSettingsPage() {
  return (
    <div className="container max-w-6xl py-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notification Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your push notification preferences and view notification history
        </p>
      </div>

      <Separator />

      {/* Push Notification Manager */}
      <section>
        <PushNotificationManagerComponent />
      </section>

      {/* Notification Preferences */}
      <section>
        <PushNotificationPreferences />
      </section>

      {/* Notification History */}
      <section>
        <PushNotificationHistory />
      </section>
    </div>
  );
}
