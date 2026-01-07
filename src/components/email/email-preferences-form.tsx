'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/lib/navigation';
import { useTranslations } from 'next-intl';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Mail, Bell, Calendar, Users, CheckSquare, Newspaper } from 'lucide-react';

export function EmailPreferencesForm() {
  const router = useRouter();
  const t = useTranslations('emailPreferences');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch current preferences
  const { data: preferences, isLoading, refetch } = trpc.email.getEmailPreferences.useQuery();

  const [localPreferences, setLocalPreferences] = useState({
    marketingEmails: false,
    transactionalEmails: true,
    reminderEmails: true,
    weeklyDigest: false,
    clientUpdates: true,
    taskReminders: true,
    eventReminders: true,
  });

  // Update local state when preferences load
  useEffect(() => {
    if (preferences) {
      setLocalPreferences({
        marketingEmails: (preferences as any).marketingEmails ?? false,
        transactionalEmails: (preferences as any).transactionalEmails ?? true,
        reminderEmails: (preferences as any).reminderEmails ?? true,
        weeklyDigest: (preferences as any).weeklyDigest ?? false,
        clientUpdates: (preferences as any).clientUpdates ?? true,
        taskReminders: (preferences as any).taskReminders ?? true,
        eventReminders: (preferences as any).eventReminders ?? true,
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
    onError: () => {
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
          {/* Reminder Emails */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="reminder-emails" className="text-base">
                  {t('weddingReminders.label')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('weddingReminders.description')}
                </p>
              </div>
            </div>
            <Switch
              id="reminder-emails"
              checked={localPreferences.reminderEmails}
              onCheckedChange={(checked) =>
                setLocalPreferences({ ...localPreferences, reminderEmails: checked })
              }
            />
          </div>

          {/* Client Updates */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="client-updates" className="text-base">
                  {t('guestUpdates.label')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('guestUpdates.description')}
                </p>
              </div>
            </div>
            <Switch
              id="client-updates"
              checked={localPreferences.clientUpdates}
              onCheckedChange={(checked) =>
                setLocalPreferences({ ...localPreferences, clientUpdates: checked })
              }
            />
          </div>

          {/* Event Reminders */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="event-reminders" className="text-base">
                  {t('budgetAlerts.label')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('budgetAlerts.description')}
                </p>
              </div>
            </div>
            <Switch
              id="event-reminders"
              checked={localPreferences.eventReminders}
              onCheckedChange={(checked) =>
                setLocalPreferences({ ...localPreferences, eventReminders: checked })
              }
            />
          </div>

          {/* Task Reminders */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-3">
              <CheckSquare className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="task-reminders" className="text-base">
                  {t('vendorMessages.label')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('vendorMessages.description')}
                </p>
              </div>
            </div>
            <Switch
              id="task-reminders"
              checked={localPreferences.taskReminders}
              onCheckedChange={(checked) =>
                setLocalPreferences({ ...localPreferences, taskReminders: checked })
              }
            />
          </div>

          {/* Transactional Emails */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="transactional-emails" className="text-base">
                  {t('systemNotifications.label')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('systemNotifications.description')}
                </p>
              </div>
            </div>
            <Switch
              id="transactional-emails"
              checked={localPreferences.transactionalEmails}
              onCheckedChange={(checked) =>
                setLocalPreferences({ ...localPreferences, transactionalEmails: checked })
              }
            />
          </div>

          {/* Weekly Digest */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-3">
              <Newspaper className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="weekly-digest" className="text-base">
                  Weekly Digest
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive a weekly summary of your activity
                </p>
              </div>
            </div>
            <Switch
              id="weekly-digest"
              checked={localPreferences.weeklyDigest}
              onCheckedChange={(checked) =>
                setLocalPreferences({ ...localPreferences, weeklyDigest: checked })
              }
            />
          </div>

          {/* Marketing Emails */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="marketing-emails" className="text-base">
                  Marketing Emails
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive promotional offers and product updates
                </p>
              </div>
            </div>
            <Switch
              id="marketing-emails"
              checked={localPreferences.marketingEmails}
              onCheckedChange={(checked) =>
                setLocalPreferences({ ...localPreferences, marketingEmails: checked })
              }
            />
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
              Saving...
            </>
          ) : (
            t('saveButton')
          )}
        </Button>
      </div>
    </div>
  );
}
