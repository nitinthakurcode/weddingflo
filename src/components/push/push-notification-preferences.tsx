/**
 * Push Notification Preferences Component
 *
 * Provides granular control over notification types:
 * - Task reminders
 * - Event reminders
 * - Client updates
 * - System alerts
 *
 * Changes are saved immediately to the database
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/lib/trpc/client';
import { toast } from 'sonner';
import { Loader2, Users, Calendar, CheckSquare, Info, Bell } from 'lucide-react';

interface PreferenceItemProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

function PreferenceItem({
  icon,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: PreferenceItemProps) {
  return (
    <div className="flex items-center justify-between space-x-4 py-4">
      <div className="flex items-start space-x-4 flex-1">
        <div className="mt-1 text-muted-foreground">{icon}</div>
        <div className="space-y-1 flex-1">
          <Label
            htmlFor={label.toLowerCase().replace(/\s+/g, '-')}
            className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </Label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        id={label.toLowerCase().replace(/\s+/g, '-')}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

export function PushNotificationPreferences() {
  // Get current preferences
  const {
    data: preferences,
    isLoading,
    refetch,
  } = trpc.push.getPreferences.useQuery();

  // Update preferences mutation
  const updateMutation = trpc.push.updatePreferences.useMutation({
    onSuccess: () => {
      refetch();
      toast.success('Preferences updated');
    },
    onError: (error) => {
      toast.error('Failed to update preferences', {
        description: error.message,
      });
      // Refetch to reset UI to actual values
      refetch();
    },
  });

  const handleUpdatePreference = async (
    field: string,
    value: boolean
  ) => {
    try {
      // Optimistically update UI
      await updateMutation.mutateAsync({
        [field]: value,
      } as any);
    } catch (error) {
      console.error('Update preference error:', error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            No preferences found. Please enable push notifications first.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose which types of notifications you want to receive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-0">
        {/* Global Enable/Disable */}
        <div className="rounded-lg bg-muted/50 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="push-enabled" className="text-base font-semibold">
                Master Switch
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Turn all push notifications on or off
              </p>
            </div>
            <Switch
              id="push-enabled"
              checked={preferences.pushEnabled ?? true}
              onCheckedChange={(checked) =>
                handleUpdatePreference('pushEnabled', checked)
              }
              disabled={updateMutation.isPending}
            />
          </div>
        </div>

        <Separator className="my-4" />

        {/* Individual Preferences */}
        <div className="space-y-1">
          <PreferenceItem
            icon={<CheckSquare className="h-5 w-5" />}
            label="Task Reminders"
            description="Task due soon, overdue tasks, and task completions"
            checked={preferences.taskReminders ?? true}
            onCheckedChange={(checked) =>
              handleUpdatePreference('taskReminders', checked)
            }
            disabled={!preferences.pushEnabled || updateMutation.isPending}
          />

          <Separator />

          <PreferenceItem
            icon={<Calendar className="h-5 w-5" />}
            label="Event Reminders"
            description="Upcoming events, event changes, and schedule updates"
            checked={preferences.eventReminders ?? true}
            onCheckedChange={(checked) =>
              handleUpdatePreference('eventReminders', checked)
            }
            disabled={!preferences.pushEnabled || updateMutation.isPending}
          />

          <Separator />

          <PreferenceItem
            icon={<Users className="h-5 w-5" />}
            label="Client Updates"
            description="Guest confirmations, cancellations, and client activity"
            checked={preferences.clientUpdates ?? true}
            onCheckedChange={(checked) =>
              handleUpdatePreference('clientUpdates', checked)
            }
            disabled={!preferences.pushEnabled || updateMutation.isPending}
          />

          <Separator />

          <PreferenceItem
            icon={<Info className="h-5 w-5" />}
            label="System Alerts"
            description="Important system updates and announcements"
            checked={preferences.systemAlerts ?? true}
            onCheckedChange={(checked) =>
              handleUpdatePreference('systemAlerts', checked)
            }
            disabled={!preferences.pushEnabled || updateMutation.isPending}
          />
        </div>

        {/* Help Text */}
        <div className="mt-6 text-xs text-muted-foreground">
          <p>
            Changes are saved automatically. Critical security notifications cannot be
            disabled.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
