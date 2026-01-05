'use client';

import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileForm } from '@/components/settings/profile-form';
import { AvatarUpload } from '@/components/settings/avatar-upload';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileSettingsPage() {
  const { data: session } = useSession();

  // Fetch current user using tRPC
  const { data: user, isLoading } = trpc.users.getCurrent.useQuery(
    undefined,
    { enabled: !!session?.user }
  );

  if (!session?.user || isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your personal information
          </p>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground text-red-500">
            User not found. Please sign in again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-mocha-900 to-mocha-600 dark:from-white dark:to-mocha-300 bg-clip-text text-transparent">
          Profile Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your personal information and account settings
        </p>
      </div>

      {/* Avatar Section */}
      <Card
        variant="glass"
        className="border border-rose-200/50 dark:border-rose-800/30 shadow-lg shadow-rose-500/10 bg-gradient-to-br from-white via-rose-50/20 to-white dark:from-mocha-900 dark:via-rose-950/10 dark:to-mocha-900"
      >
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
            Profile Picture
          </CardTitle>
          <CardDescription>
            Update your profile picture. This will be visible to your team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUpload userId={user.id} currentAvatarUrl={user.avatar_url ?? undefined} />
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card
        variant="glass"
        className="border border-teal-200/50 dark:border-teal-800/30 shadow-lg shadow-teal-500/10 bg-gradient-to-br from-white via-teal-50/20 to-white dark:from-mocha-900 dark:via-teal-950/10 dark:to-mocha-900"
      >
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-teal-600 to-teal-400 bg-clip-text text-transparent">
            Personal Information
          </CardTitle>
          <CardDescription>
            Update your name and email address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm user={user} />
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card
        variant="glass"
        className="border border-teal-200/50 dark:border-teal-800/30 shadow-lg shadow-teal-500/10 bg-gradient-to-br from-white via-teal-50/20 to-white dark:from-mocha-900 dark:via-teal-950/10 dark:to-mocha-900"
      >
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-teal-600 to-teal-400 bg-clip-text text-transparent">
            Account Information
          </CardTitle>
          <CardDescription>
            View your account details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">User ID</label>
            <p className="text-sm text-muted-foreground">{user.id}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Role</label>
            <p className="text-sm text-muted-foreground capitalize">
              {user.role.replace('_', ' ')}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">Member Since</label>
            <p className="text-sm text-muted-foreground">
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">Last Updated</label>
            <p className="text-sm text-muted-foreground">
              {user.updatedAt ? new Date(user.updatedAt).toLocaleString() : 'N/A'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
