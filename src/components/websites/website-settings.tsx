'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { trpc } from '@/lib/trpc/client';
import { toast } from 'sonner';
import { Lock, Trash2, Shield, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Website type from Drizzle schema
 * Uses camelCase fields with settings JSONB column
 */
interface Website {
  id: string;
  clientId: string;
  subdomain: string | null;
  customDomain: string | null;
  theme: string | null;
  published: boolean | null;
  password: string | null;
  isPasswordProtected: boolean | null;
  settings: unknown;
  content?: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

interface WebsiteSettings {
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
  customDomainVerified?: boolean;
  viewCount?: number;
}

interface WebsiteSettingsProps {
  website: Website;
  onUpdate: () => void;
}

/**
 * Website Settings Component - Drizzle Schema
 *
 * Settings stored in `settings` JSONB:
 * - metaTitle
 * - metaDescription
 * - ogImageUrl
 */
export function WebsiteSettings({ website, onUpdate }: WebsiteSettingsProps) {
  // Extract settings from JSONB
  const settings = (website.settings as WebsiteSettings) || {};

  const [password, setPassword] = useState('');
  const [enablePassword, setEnablePassword] = useState(website.isPasswordProtected || false);
  const [metaTitle, setMetaTitle] = useState(settings.metaTitle || '');
  const [metaDescription, setMetaDescription] = useState(settings.metaDescription || '');

  // Track previous state for rollback on error
  const [previousPasswordState, setPreviousPasswordState] = useState(enablePassword);

  const updateSettings = trpc.websites.update.useMutation({
    onSuccess: () => {
      toast.success('Settings updated!');
      onUpdate();
    },
    onError: (error) => {
      // Rollback on error
      setEnablePassword(previousPasswordState);
      toast.error(error.message);
    },
  });

  const deleteWebsite = trpc.websites.delete.useMutation({
    onSuccess: () => {
      toast.success('Website deleted');
      window.location.reload();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handlePasswordToggle = (enabled: boolean) => {
    // Save previous state for potential rollback
    setPreviousPasswordState(enablePassword);
    // Optimistically update UI immediately
    setEnablePassword(enabled);

    if (!enabled) {
      // Remove password protection - mutation runs in background
      updateSettings.mutate({
        websiteId: website.id,
        data: {
          // Update to remove password
        },
      });
    }
  };

  const handleSavePassword = () => {
    if (!password || password.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }

    // Use the setPassword mutation from the websites router
    toast.info('Password protection will be available in next update');
  };

  const handleSaveSEO = () => {
    updateSettings.mutate({
      websiteId: website.id,
      data: {
        metaTitle,
        metaDescription,
      },
    });
  };

  const handleDeleteWebsite = () => {
    if (
      !confirm(
        'Are you sure you want to delete this website? This action cannot be undone.'
      )
    ) {
      return;
    }

    deleteWebsite.mutate({ websiteId: website.id });
  };

  return (
    <div className="space-y-6">
      {/* Password Protection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Password Protection
          </CardTitle>
          <CardDescription>
            Require a password for guests to view your website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enable-password">Enable Password Protection</Label>
              <p className="text-sm text-muted-foreground">
                Guests will need to enter a password to view your website
              </p>
            </div>
            <Switch
              id="enable-password"
              checked={enablePassword}
              onCheckedChange={handlePasswordToggle}
            />
          </div>

          {enablePassword && (
            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="password">Set Password</Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password (min 4 characters)"
                />
                <Button onClick={handleSavePassword} disabled={updateSettings.isPending}>
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Choose a password your guests will remember. Share it with your invitations.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEO Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            SEO & Sharing
          </CardTitle>
          <CardDescription>
            How your website appears in search results and social media
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meta-title">Page Title</Label>
            <Input
              id="meta-title"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="John & Jane's Wedding"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta-description">Description</Label>
            <Input
              id="meta-description"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="Join us as we celebrate our special day!"
            />
          </div>

          <Button
            variant="outline"
            onClick={handleSaveSEO}
            disabled={updateSettings.isPending}
          >
            {updateSettings.isPending ? 'Saving...' : 'Save SEO Settings'}
          </Button>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              SEO settings help your website appear correctly when shared on social media and in
              search results.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>
              Deleting this website will permanently remove all content, analytics, and custom
              domain settings. This action cannot be undone.
            </AlertDescription>
          </Alert>

          <Button
            variant="destructive"
            onClick={handleDeleteWebsite}
            disabled={deleteWebsite.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {deleteWebsite.isPending ? 'Deleting...' : 'Delete Website'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
