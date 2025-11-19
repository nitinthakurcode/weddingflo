'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SUPPORTED_CURRENCIES, detectCurrencyFromLocation, formatCurrency, type CurrencyCode } from '@/lib/currency';
import { useToast } from '@/hooks/use-toast';
import { Info, Globe, DollarSign, Clock } from 'lucide-react';

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Kolkata', label: 'Mumbai/Delhi (IST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZDT/NZST)' },
  { value: 'America/Toronto', label: 'Toronto (ET)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
] as const;

export default function PreferencesPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [autoDetect, setAutoDetect] = useState(true);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [timezone, setTimezone] = useState('America/New_York');
  const [detectedCurrency, setDetectedCurrency] = useState<CurrencyCode>('USD');

  // Fetch current preferences
  const { data: preferences, isLoading, refetch } = trpc.users.getPreferences.useQuery();

  // Update preferences mutation
  const updatePreferences = trpc.users.updatePreferences.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Preferences updated successfully',
      });
      refetch();
      // Refresh page to apply new settings
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update preferences: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Load preferences when data arrives
  useEffect(() => {
    if (preferences) {
      setCurrency((preferences.preferred_currency as CurrencyCode) || 'USD');
      setTimezone(preferences.timezone || 'America/New_York');
      setAutoDetect(preferences.auto_detect_locale ?? true);
    }
  }, [preferences]);

  // Auto-detect on mount
  useEffect(() => {
    const detected = detectCurrencyFromLocation();
    setDetectedCurrency(detected);

    if (autoDetect && !preferences) {
      setCurrency(detected);
    }
  }, [autoDetect, preferences]);

  const handleSave = () => {
    updatePreferences.mutate({
      preferred_currency: currency,
      timezone,
      auto_detect_locale: autoDetect,
    });
  };

  // Preview examples
  const exampleAmount = 1234.56;
  const smallAmount = 29;
  const largeAmount = 15999;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Preferences</h1>
        <p className="text-muted-foreground mt-2">
          Customize your currency and regional settings
        </p>
      </div>

      <div className="grid gap-6">
        {/* Auto-detection Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle>Auto-Detection</CardTitle>
            </div>
            <CardDescription>
              Automatically detect your currency and timezone based on your location
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-detect" className="text-base">
                  Enable auto-detection
                </Label>
                <p className="text-sm text-muted-foreground">
                  Settings will adjust based on your browser location
                </p>
              </div>
              <Switch
                id="auto-detect"
                checked={autoDetect}
                onCheckedChange={setAutoDetect}
              />
            </div>

            {autoDetect && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Detected: <strong>{detectedCurrency}</strong> ({SUPPORTED_CURRENCIES.find(c => c.code === detectedCurrency)?.name})
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Currency Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <CardTitle>Currency</CardTitle>
            </div>
            <CardDescription>
              Choose your preferred currency for pricing and billing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Preferred Currency</Label>
              <Select
                value={currency}
                onValueChange={(value) => setCurrency(value as CurrencyCode)}
                disabled={autoDetect}
              >
                <SelectTrigger id="currency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code}>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm">{curr.symbol}</span>
                        <span>{curr.code}</span>
                        <span className="text-muted-foreground">- {curr.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {autoDetect && (
                <p className="text-sm text-muted-foreground">
                  Currency is auto-detected. Turn off auto-detection to choose manually.
                </p>
              )}
            </div>

            {/* Preview */}
            <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
              <p className="text-sm font-medium">Preview:</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subscription (Starter):</span>
                  <span className="font-medium">{formatCurrency(smallAmount, currency)}/month</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Budget item:</span>
                  <span className="font-medium">{formatCurrency(exampleAmount, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendor cost:</span>
                  <span className="font-medium">{formatCurrency(largeAmount, currency)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timezone Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle>Timezone</CardTitle>
            </div>
            <CardDescription>
              Set your timezone for accurate date and time display
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="timezone" className="w-full">
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
              <p className="text-sm text-muted-foreground">
                Current time: {new Date().toLocaleTimeString('en-US', { timeZone: timezone })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              // Reset to saved values
              if (preferences) {
                setCurrency((preferences.preferred_currency as CurrencyCode) || 'USD');
                setTimezone(preferences.timezone || 'America/New_York');
                setAutoDetect(preferences.auto_detect_locale ?? true);
              }
            }}
          >
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={updatePreferences.isPending}
          >
            {updatePreferences.isPending ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>
    </div>
  );
}
