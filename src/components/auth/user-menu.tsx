'use client';

import { LogOut, Settings, User } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth, signOutAndRedirect } from '@/lib/auth-client';

/**
 * UserMenu Component - Production Version
 *
 * January 2026 - Properly hydrated via server session
 *
 * No longer needs `isMounted` workaround because:
 * - Server passes initial session to AuthProvider
 * - Client receives same auth state on first render
 * - No hydration mismatch occurs
 */
export function UserMenu() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const { user, isLoading } = useAuth();

  const handleSignOut = async () => {
    await signOutAndRedirect(`/${locale}/sign-in`);
  };

  // Show loading state only when actually loading (not on initial hydration)
  if (isLoading) {
    return (
      <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
    );
  }

  // No user - don't render anything
  if (!user) {
    return null;
  }

  // Compute initials from user data
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() || 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
            <AvatarFallback className="bg-primary-100 text-primary-700 text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push(`/${locale}/dashboard/settings`)}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/${locale}/dashboard/settings`)}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
