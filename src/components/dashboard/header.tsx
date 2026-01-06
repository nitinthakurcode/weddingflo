'use client';

import { Menu, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileNav } from './mobile-nav';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { LanguageSwitcher } from '@/components/language-switcher';
import { UserMenu } from '@/components/auth/user-menu';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc/client';

/**
 * Header Component - Production Version
 *
 * January 2026 - Properly hydrated via server session
 *
 * No longer needs `isMounted` workaround because:
 * - Server passes initial session to AuthProvider
 * - Client receives same auth state on first render
 * - No hydration mismatch occurs
 */
export function Header() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const t = useTranslations('header');

  // Get current user from BetterAuth - already has all needed fields
  const currentUser = user ? {
    id: user.id,
    auth_id: user.id,
    email: user.email,
    role: user.role || 'company_admin',
    company_id: user.companyId,
    first_name: user.firstName || '',
    last_name: user.lastName || '',
  } : null;

  // Get unread message count via tRPC (messages router)
  const { data: unreadCount } = trpc.activity.getUnreadCount.useQuery(undefined, {
    enabled: !!user?.id,
  });

  const totalUnreadMessages = unreadCount?.count || 0;

  return (
    <>
      <header className="relative flex h-14 sm:h-16 items-center justify-between border-b border-border/30 backdrop-blur-xl px-3 sm:px-4 md:px-6 shadow-sm bg-background/80 dark:bg-background/60">
        {/* 2026 Design - Teal to Gold accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-teal-500/70 to-transparent" />
        {/* Subtle glow effect */}
        <div className="absolute inset-x-0 -bottom-4 h-8 bg-gradient-to-b from-teal-500/5 to-transparent pointer-events-none" />

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden flex-shrink-0 rounded-xl hover:scale-105 transition-all duration-200 text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:text-teal-300 dark:hover:bg-teal-950/30"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>

        {/* Logo on mobile - 2026 Transformative Teal + Gold Design */}
        <div className="lg:hidden flex-1 flex justify-center">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 via-teal-600 to-gold-500 shadow-lg shadow-teal-500/30 ring-2 ring-teal-200/50 dark:ring-teal-800/50 hover:scale-110 hover:shadow-teal-500/50 transition-all duration-300 cursor-pointer">
            <span className="text-lg font-black text-white tracking-tight">W</span>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/10 to-white/20" />
          </div>
        </div>

        {/* Search bar (desktop) - Gen-Z Glass Style */}
        <div className="hidden flex-1 lg:block">
          <div className="max-w-lg">
            <label htmlFor="search" className="sr-only">
              {t('search')}
            </label>
            <div className="relative group">
              <input
                id="search"
                name="search"
                className="block w-full rounded-2xl border border-border/50 bg-background/80 backdrop-blur-sm py-2.5 pl-11 pr-4 text-sm placeholder-muted-foreground/70 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-200/50 dark:focus:border-teal-700 dark:focus:ring-teal-800/30 hover:border-border transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder={t('searchPlaceholder')}
                type="search"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <svg
                  className="h-4 w-4 text-muted-foreground/70 group-focus-within:text-teal-500 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Right side actions - Gen-Z Styling */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
          {/* Messages Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/messages')}
            className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:scale-110 transition-all duration-300 text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:text-teal-300 dark:hover:bg-teal-950/30"
          >
            <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            {totalUnreadMessages > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1.5 -right-1.5 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold shadow-lg shadow-red-500/30 animate-bounce"
                style={{ animationDuration: '2s' }}
              >
                {totalUnreadMessages > 9 ? '9+' : totalUnreadMessages}
              </Badge>
            )}
          </Button>

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Notifications Bell */}
          {currentUser && <NotificationBell userId={currentUser.auth_id} />}

          <UserMenu />
        </div>
      </header>

      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </>
  );
}
