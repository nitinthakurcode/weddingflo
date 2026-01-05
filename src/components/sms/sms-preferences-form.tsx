'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, MessageSquare, Bell, Send, Phone } from 'lucide-react';

export function SmsPreferencesForm() {
  const t = useTranslations('smsPreferences');
  const tCommon = useTranslations('common');
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
    onError: () => {
      toast.error(t('errorMessage'));
      setIsSaving(false);
    },
  });

  const [localPreferences, setLocalPreferences] = useState({
    smsEnabled: true,
    marketingSms: false,
    transactionalSms: true,
    reminderSms: true,
    phoneNumber: '',
  });

  // Update local state when preferences load
  useEffect(() => {
    if (preferences) {
      setLocalPreferences({
        smsEnabled: preferences.smsEnabled ?? true,
        marketingSms: preferences.marketingSms ?? false,
        transactionalSms: preferences.transactionalSms ?? true,
        reminderSms: preferences.reminderSms ?? true,
        phoneNumber: preferences.phoneNumber ?? '',
      });
    }
  }, [preferences]);

  const handleSave = async () => {
    setIsSaving(true);
    updateMutation.mutate({
      smsEnabled: localPreferences.smsEnabled,
      marketingSms: localPreferences.marketingSms,
      transactionalSms: localPreferences.transactionalSms,
      reminderSms: localPreferences.reminderSms,
      phoneNumber: localPreferences.phoneNumber || undefined,
    });
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
      {/* Master Switch */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Global SMS Enable */}
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sms-enabled" className="text-base font-semibold">
                  {t('masterSwitch')}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('masterSwitchDescription')}
                </p>
              </div>
              <Switch
                id="sms-enabled"
                checked={localPreferences.smsEnabled}
                onCheckedChange={(checked) =>
                  setLocalPreferences({ ...localPreferences, smsEnabled: checked })
                }
              />
            </div>
          </div>

          <Separator />

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phone-number" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {t('phoneNumber')}
            </Label>
            <Input
              id="phone-number"
              type="tel"
              placeholder={t('phoneNumberPlaceholder')}
              value={localPreferences.phoneNumber}
              onChange={(e) =>
                setLocalPreferences({ ...localPreferences, phoneNumber: e.target.value })
              }
              disabled={!localPreferences.smsEnabled}
            />
            <p className="text-xs text-muted-foreground">
              {t('phoneNumberHelp')}
            </p>
          </div>

          <Separator />

          {/* Notification Types */}
          <div className="space-y-4">
            <h4 className="font-medium">{t('notificationTypes')}</h4>

            {/* Transactional SMS */}
            <div className="flex items-center justify-between space-x-2">
              <div className="flex items-center space-x-3">
                <Send className="h-5 w-5 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label htmlFor="sms-transactional" className="text-base">
                    {t('transactional.label')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('transactional.description')}
                  </p>
                </div>
              </div>
              <Switch
                id="sms-transactional"
                checked={localPreferences.transactionalSms}
                onCheckedChange={(checked) =>
                  setLocalPreferences({ ...localPreferences, transactionalSms: checked })
                }
                disabled={!localPreferences.smsEnabled}
              />
            </div>

            {/* Reminder SMS */}
            <div className="flex items-center justify-between space-x-2">
              <div className="flex items-center space-x-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label htmlFor="sms-reminders" className="text-base">
                    {t('reminders.label')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('reminders.description')}
                  </p>
                </div>
              </div>
              <Switch
                id="sms-reminders"
                checked={localPreferences.reminderSms}
                onCheckedChange={(checked) =>
                  setLocalPreferences({ ...localPreferences, reminderSms: checked })
                }
                disabled={!localPreferences.smsEnabled}
              />
            </div>

            {/* Marketing SMS */}
            <div className="flex items-center justify-between space-x-2">
              <div className="flex items-center space-x-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label htmlFor="sms-marketing" className="text-base">
                    {t('marketing.label')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('marketing.description')}
                  </p>
                </div>
              </div>
              <Switch
                id="sms-marketing"
                checked={localPreferences.marketingSms}
                onCheckedChange={(checked) =>
                  setLocalPreferences({ ...localPreferences, marketingSms: checked })
                }
                disabled={!localPreferences.smsEnabled}
              />
            </div>
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
              {tCommon('saving')}
            </>
          ) : (
            tCommon('save')
          )}
        </Button>
      </div>
    </div>
  );
}
