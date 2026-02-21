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
import { Loader2, Mail, Bell } from 'lucide-react';

export function EmailPreferencesForm() {
  const router = useRouter();
  const t = useTranslations('emailPreferences');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch current preferences
  const { data: preferences, isLoading, refetch } = trpc.email.getEmailPreferences.useQuery();

  // Only two fields exist in the schema: marketing and updates
  const [localPreferences, setLocalPreferences] = useState({
    marketing: false,
    updates: true,
  });

  // Update local state when preferences load
  useEffect(() => {
    if (preferences) {
      setLocalPreferences({
        marketing: preferences.marketing ?? false,
        updates: preferences.updates ?? true,
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
          {/* Updates - System notifications, reminders, alerts */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="updates" className="text-base">
                  {t('systemNotifications.label')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('systemNotifications.description')}
                </p>
              </div>
            </div>
            <Switch
              id="updates"
              checked={localPreferences.updates}
              onCheckedChange={(checked) =>
                setLocalPreferences({ ...localPreferences, updates: checked })
              }
            />
          </div>

          {/* Marketing Emails */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="marketing" className="text-base">
                  Marketing Emails
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive promotional offers, tips, and product updates
                </p>
              </div>
            </div>
            <Switch
              id="marketing"
              checked={localPreferences.marketing}
              onCheckedChange={(checked) =>
                setLocalPreferences({ ...localPreferences, marketing: checked })
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
