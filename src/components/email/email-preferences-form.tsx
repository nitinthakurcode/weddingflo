'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Mail, Bell, DollarSign, Users, MessageSquare } from 'lucide-react';

export function EmailPreferencesForm() {
  const router = useRouter();
  const t = useTranslations('emailPreferences');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch current preferences
  const { data: preferences, isLoading, refetch } = trpc.email.getEmailPreferences.useQuery();

  const [localPreferences, setLocalPreferences] = useState({
    receive_wedding_reminders: true,
    receive_payment_reminders: true,
    receive_rsvp_notifications: true,
    receive_vendor_messages: true,
    receive_marketing: false,
    email_frequency: 'immediate' as 'immediate' | 'daily' | 'weekly',
  });

  // Update local state when preferences load
  useEffect(() => {
    if (preferences) {
      setLocalPreferences({
        receive_wedding_reminders: preferences.receive_wedding_reminders ?? false,
        receive_payment_reminders: preferences.receive_payment_reminders ?? false,
        receive_rsvp_notifications: preferences.receive_rsvp_notifications ?? false,
        receive_vendor_messages: preferences.receive_vendor_messages ?? false,
        receive_marketing: preferences.receive_marketing ?? false,
        email_frequency: (preferences.email_frequency as 'immediate' | 'daily' | 'weekly') || 'daily',
      });
    }
  }, [preferences]);

  // Update mutation
  const updateMutation = trpc.email.updateEmailPreferences.useMutation({
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
                <Label htmlFor="wedding-reminders" className="text-base">
                  {t('weddingReminders.label')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('weddingReminders.description')}
                </p>
              </div>
            </div>
            <Switch
              id="wedding-reminders"
              checked={localPreferences.receive_wedding_reminders}
              onCheckedChange={(checked) =>
                setLocalPreferences({ ...localPreferences, receive_wedding_reminders: checked })
              }
            />
          </div>

          {/* Guest Updates */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="guest-updates" className="text-base">
                  {t('guestUpdates.label')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('guestUpdates.description')}
                </p>
              </div>
            </div>
            <Switch
              id="guest-updates"
              checked={localPreferences.receive_rsvp_notifications}
              onCheckedChange={(checked) =>
                setLocalPreferences({ ...localPreferences, receive_rsvp_notifications: checked })
              }
            />
          </div>

          {/* Budget Alerts */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="budget-alerts" className="text-base">
                  {t('budgetAlerts.label')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('budgetAlerts.description')}
                </p>
              </div>
            </div>
            <Switch
              id="budget-alerts"
              checked={localPreferences.receive_payment_reminders}
              onCheckedChange={(checked) =>
                setLocalPreferences({ ...localPreferences, receive_payment_reminders: checked })
              }
            />
          </div>

          {/* Vendor Messages */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="vendor-messages" className="text-base">
                  {t('vendorMessages.label')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('vendorMessages.description')}
                </p>
              </div>
            </div>
            <Switch
              id="vendor-messages"
              checked={localPreferences.receive_vendor_messages}
              onCheckedChange={(checked) =>
                setLocalPreferences({ ...localPreferences, receive_vendor_messages: checked })
              }
            />
          </div>

          {/* System Notifications */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="system-notifications" className="text-base">
                  {t('systemNotifications.label')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('systemNotifications.description')}
                </p>
              </div>
            </div>
            <Switch
              id="system-notifications"
              checked={localPreferences.receive_marketing}
              onCheckedChange={(checked) =>
                setLocalPreferences({ ...localPreferences, receive_marketing: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Frequency */}
      <Card>
        <CardHeader>
          <CardTitle>{t('frequency.title')}</CardTitle>
          <CardDescription>
            {t('frequency.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="frequency">{t('frequency.title')}</Label>
            <Select
              value={localPreferences.email_frequency}
              onValueChange={(value: 'immediate' | 'daily' | 'weekly') =>
                setLocalPreferences({ ...localPreferences, email_frequency: value })
              }
            >
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">{t('frequency.realtime')}</SelectItem>
                <SelectItem value="daily">{t('frequency.daily')}</SelectItem>
                <SelectItem value="weekly">{t('frequency.weekly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()} disabled={isSaving}>
          {t('cancelButton')}
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('cancelButton')}...
            </>
          ) : (
            t('saveButton')
          )}
        </Button>
      </div>
    </div>
  );
}
