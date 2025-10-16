'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import { Menu, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileNav } from './mobile-nav';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

export function Header() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const router = useRouter();
  const { user } = useUser();
  const supabase = useSupabase();

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Get total unread message count across all clients
  const { data: conversations } = useQuery({
    queryKey: ['conversations', currentUser?.company_id, currentUser?.clerk_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('company_id', currentUser?.company_id)
        .or(`user1_id.eq.${currentUser?.clerk_id},user2_id.eq.${currentUser?.clerk_id}`);
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.company_id && !!currentUser?.clerk_id,
  });

  const totalUnreadMessages = conversations?.reduce((sum, conv: any) => {
    const unreadCount = conv.user1_id === currentUser?.clerk_id
      ? (conv.unread_count_user1 || 0)
      : (conv.unread_count_user2 || 0);
    return sum + unreadCount;
  }, 0) || 0;

  return (
    <>
      <header className="relative flex h-14 sm:h-16 items-center justify-between border-b backdrop-blur-md px-3 sm:px-4 md:px-6 shadow-sm"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          borderBottomColor: 'rgba(99, 102, 241, 0.1)',
        }}
      >
        {/* Elite gradient accent line - Indigo to Pink */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] opacity-70"
          style={{
            background: 'linear-gradient(to right, transparent, #6366f1, #ec4899, transparent)',
          }}
        />

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden flex-shrink-0 hover:bg-primary/10 transition-colors"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        </Button>

        {/* Logo on mobile - Elite Design */}
        <div className="lg:hidden flex-1 flex justify-center">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary to-secondary shadow-lg shadow-primary/20 ring-2 ring-primary/10 ring-offset-2">
            <span className="text-base font-bold text-primary-foreground tracking-tight">W</span>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/10 to-transparent" />
          </div>
        </div>

        {/* Search bar (desktop) */}
        <div className="hidden flex-1 lg:block">
          <div className="max-w-lg">
            <label htmlFor="search" className="sr-only">
              Search
            </label>
            <div className="relative">
              <input
                id="search"
                name="search"
                className="block w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-sm placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Search clients, events, guests..."
                type="search"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg
                  className="h-5 w-5 text-muted-foreground"
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

        {/* Right side actions - Elite Styling */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
          {/* Messages Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/messages')}
            className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-105"
          >
            <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            {totalUnreadMessages > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-semibold shadow-lg animate-pulse"
              >
                {totalUnreadMessages > 9 ? '9+' : totalUnreadMessages}
              </Badge>
            )}
          </Button>

          {/* Notifications Bell */}
          {currentUser && <NotificationBell userId={currentUser.clerk_id} />}

          <UserButton
            appearance={{
              elements: {
                avatarBox: {
                  width: '48px',
                  height: '48px',
                  minWidth: '48px',
                  minHeight: '48px',
                  maxWidth: '48px',
                  maxHeight: '48px',
                  border: '2px solid #6366f1',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  aspectRatio: '1',
                },
                avatarImage: {
                  objectFit: 'cover',
                  objectPosition: 'center',
                  width: '100%',
                  height: '100%',
                  aspectRatio: '1',
                  display: 'block',
                },
                userButtonPopoverCard: {
                  boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
                },
                userButtonPopoverActionButton__manageAccount: {
                  '&:hover': {
                    backgroundColor: 'rgba(99, 102, 241, 0.05)',
                  },
                },
                userButtonPopoverActionButton__signOut: {
                  '&:hover': {
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                  },
                },
              },
            }}
            afterSignOutUrl="/sign-in"
          />
        </div>
      </header>

      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </>
  );
}
