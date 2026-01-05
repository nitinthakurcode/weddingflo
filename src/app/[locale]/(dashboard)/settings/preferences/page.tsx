'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
  { value: 'UTC', label: 'UTC' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
];

const CURRENCIES = [
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'British Pound (£)' },
  { value: 'INR', label: 'Indian Rupee (₹)' },
  { value: 'JPY', label: 'Japanese Yen (¥)' },
  { value: 'AUD', label: 'Australian Dollar (A$)' },
  { value: 'CAD', label: 'Canadian Dollar (C$)' },
];

export default function PreferencesPage() {
  const { data: session } = useSession();
  const sessionUser = session?.user;
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const utils = trpc.useUtils();

  // Fetch current user preferences using tRPC
  const { data: preferences, isLoading: preferencesLoading } = trpc.users.getPreferences.useQuery(
    undefined,
    { enabled: !!sessionUser }
  );

  // Local form state
  const [formData, setFormData] = useState({
    language: 'en',
    timezone: 'UTC',
    currency: 'USD',
    autoDetectLocale: true,
  });

  // Sync form state with loaded preferences
  useEffect(() => {
    if (preferences) {
      setFormData({
        language: preferences.preferred_language || 'en',
        timezone: preferences.timezone || 'UTC',
        currency: preferences.preferred_currency || 'USD',
        autoDetectLocale: preferences.auto_detect_locale ?? true,
      });
    }
  }, [preferences]);

  // Update preferences mutation using tRPC
  const updatePreferencesMutation = trpc.users.updatePreferences.useMutation({
    onSuccess: () => {
      utils.users.getPreferences.invalidate();
      utils.users.getCurrent.invalidate();
      toast({
        title: 'Preferences saved',
        description: 'Your preferences have been successfully updated.',
      });
      router.refresh();
    },
    onError: (error) => {
      console.error('Failed to save preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSave = async () => {
    setIsLoading(true);

    try {
      await updatePreferencesMutation.mutateAsync({
        preferred_language: formData.language,
        timezone: formData.timezone,
        preferred_currency: formData.currency,
        auto_detect_locale: formData.autoDetectLocale,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges = preferences && (
    formData.language !== (preferences.preferred_language || 'en') ||
    formData.timezone !== (preferences.timezone || 'UTC') ||
    formData.currency !== (preferences.preferred_currency || 'USD') ||
    formData.autoDetectLocale !== (preferences.auto_detect_locale ?? true)
  );

  if (!sessionUser || preferencesLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Preferences</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
          Preferences
        </h1>
        <p className="text-muted-foreground">
          Customize your experience
        </p>
      </div>

      {/* Localization */}
      <Card
        variant="glass"
        className="border border-indigo-200/50 dark:border-indigo-800/30 shadow-lg shadow-indigo-500/10 bg-gradient-to-br from-white via-indigo-50/20 to-white dark:from-gray-900 dark:via-indigo-950/10 dark:to-gray-900"
      >
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Localization
          </CardTitle>
          <CardDescription>
            Language, timezone, and currency settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-detect">Auto-detect locale</Label>
              <p className="text-sm text-muted-foreground">
                Automatically detect your language and timezone
              </p>
            </div>
            <Switch
              id="auto-detect"
              checked={formData.autoDetectLocale}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, autoDetectLocale: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select
              value={formData.language}
              onValueChange={(value) =>
                setFormData({ ...formData, language: value })
              }
            >
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={formData.timezone}
              onValueChange={(value) =>
                setFormData({ ...formData, timezone: value })
              }
            >
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={formData.currency}
              onValueChange={(value) =>
                setFormData({ ...formData, currency: value })
              }
            >
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((curr) => (
                  <SelectItem key={curr.value} value={curr.value}>
                    {curr.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!hasChanges || isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
