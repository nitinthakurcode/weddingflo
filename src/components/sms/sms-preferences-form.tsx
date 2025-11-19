'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/lib/i18n/navigation';
import { useTranslations } from 'next-intl';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, MessageSquare, Bell, DollarSign, CheckCircle, Calendar } from 'lucide-react';
import type { SmsPreferences } from '@/types/sms';

export function SmsPreferencesForm() {
  const router = useRouter();
  const t = useTranslations('smsPreferences');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch current preferences
  const { data: preferences, isLoading, refetch } = trpc.sms.getSmsPreferences.useQuery();

  // Update mutation
  const updateMutation = trpc.sms.updateSmsPreferences.useMutation({
    onSuccess: () => {
      toast.success(t('successMessage'));
      refetch();
      setIsSaving(false);
    },
    onError: (error) => {
      toast.error(t('errorMessage'));
      setIsSaving(false);
    },
  });

  const typedPreferences = preferences as SmsPreferences | undefined;

  const [localPreferences, setLocalPreferences] = useState({
    receive_wedding_reminders: typedPreferences?.receive_wedding_reminders ?? true,
    receive_payment_reminders: typedPreferences?.receive_payment_reminders ?? true,
    receive_rsvp_notifications: typedPreferences?.receive_rsvp_notifications ?? true,
    receive_vendor_messages: typedPreferences?.receive_vendor_messages ?? true,
    receive_event_updates: typedPreferences?.receive_event_updates ?? true,
    sms_frequency: typedPreferences?.sms_frequency ?? 'immediate' as 'immediate' | 'daily' | 'off',
  });

  // Update local state when preferences load
  useEffect(() => {
    if (typedPreferences) {
      setLocalPreferences({
        receive_wedding_reminders: typedPreferences.receive_wedding_reminders,
        receive_payment_reminders: typedPreferences.receive_payment_reminders,
        receive_rsvp_notifications: typedPreferences.receive_rsvp_notifications,
        receive_vendor_messages: typedPreferences.receive_vendor_messages,
        receive_event_updates: typedPreferences.receive_event_updates,
        sms_frequency: typedPreferences.sms_frequency,
      });
    }
  }, [typedPreferences]);

  const handleSave = async () => {
    setIsSaving(true);
    updateMutation.mutate(localPreferences);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Wedding Reminders */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="sms-wedding-reminders" className="text-base">
                  {t('weddingReminders.label')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('weddingReminders.description')}
                </p>
              </div>
            </div>
            <Switch
              id="sms-wedding-reminders"
              checked={localPreferences.receive_wedding_reminders}
              onCheckedChange={(checked) =>
                setLocalPreferences({ ...localPreferences, receive_wedding_reminders: checked })
              }
            />
          </div>

          {/* Payment Reminders */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="sms-payment-reminders" className="text-base">
                  {t('paymentReminders.label')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('paymentReminders.description')}
                </p>
              </div>
            </div>
            <Switch
              id="sms-payment-reminders"
              checked={localPreferences.receive_payment_reminders}
              onCheckedChange={(checked) =>
                setLocalPreferences({ ...localPreferences, receive_payment_reminders: checked })
              }
            />
          </div>

          {/* RSVP Notifications */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="sms-rsvp-notifications" className="text-base">
                  {t('rsvpNotifications.label')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('rsvpNotifications.description')}
                </p>
              </div>
            </div>
            <Switch
              id="sms-rsvp-notifications"
              checked={localPreferences.receive_rsvp_notifications}
              onCheckedChange={(checked) =>
                setLocalPreferences({ ...localPreferences, receive_rsvp_notifications: checked })
              }
            />
          </div>

          {/* Vendor Messages */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="sms-vendor-messages" className="text-base">
                  {t('vendorMessages.label')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('vendorMessages.description')}
                </p>
              </div>
            </div>
            <Switch
              id="sms-vendor-messages"
              checked={localPreferences.receive_vendor_messages}
              onCheckedChange={(checked) =>
                setLocalPreferences({ ...localPreferences, receive_vendor_messages: checked })
              }
            />
          </div>

          {/* Event Updates */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="sms-event-updates" className="text-base">
                  {t('eventUpdates.label')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('eventUpdates.description')}
                </p>
              </div>
            </div>
            <Switch
              id="sms-event-updates"
              checked={localPreferences.receive_event_updates}
              onCheckedChange={(checked) =>
                setLocalPreferences({ ...localPreferences, receive_event_updates: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* SMS Frequency */}
      <Card>
        <CardHeader>
          <CardTitle>{t('frequencyTitle')}</CardTitle>
          <CardDescription>
            {t('frequencyDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="sms-frequency">{t('frequencyLabel')}</Label>
            <Select
              value={localPreferences.sms_frequency}
              onValueChange={(value: 'immediate' | 'daily' | 'off') =>
                setLocalPreferences({ ...localPreferences, sms_frequency: value })
              }
            >
              <SelectTrigger id="sms-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">
                  <div className="space-y-1">
                    <div className="font-medium">{t('immediate.label')}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('immediate.description')}
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="daily">
                  <div className="space-y-1">
                    <div className="font-medium">{t('daily.label')}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('daily.description')}
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="off">
                  <div className="space-y-1">
                    <div className="font-medium">{t('off.label')}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('off.description')}
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* SMS Cost Warning */}
      <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
        <CardContent className="pt-6">
          <p className="text-sm text-yellow-900 dark:text-yellow-100">
            <strong>{t('noteLabel')}</strong> {t('costWarning')}
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('saving')}
            </>
          ) : (
            t('saveButton')
          )}
        </Button>
      </div>
    </div>
  );
}
