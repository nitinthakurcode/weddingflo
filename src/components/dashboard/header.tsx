'use client';

import { UserButton } from '@clerk/nextjs';
import { Menu, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileNav } from './mobile-nav';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

export function Header() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const router = useRouter();

  // Get current user
  const currentUser = useQuery(api.users.getCurrent);

  // Get total unread message count across all clients
  const conversations = useQuery(
    api.messages.getConversations,
    currentUser?.company_id && currentUser?.clerk_id
      ? { companyId: currentUser.company_id, userId: currentUser.clerk_id }
      : 'skip'
  );

  const totalUnreadMessages =
    conversations?.reduce((sum, conv) => sum + conv.unreadCount, 0) || 0;

  return (
    <>
      <header className="flex h-14 sm:h-16 items-center justify-between border-b bg-white px-3 sm:px-4 md:px-6">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden flex-shrink-0"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>

        {/* Logo on mobile */}
        <div className="lg:hidden flex-1 flex justify-center">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600">
            <span className="text-sm font-bold text-white">W</span>
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
                className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="Search clients, events, guests..."
                type="search"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg
                  className="h-5 w-5 text-gray-400"
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

        {/* Right side actions */}
        <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4 flex-shrink-0">
          {/* Messages Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/messages')}
            className="relative h-8 w-8 sm:h-10 sm:w-10"
          >
            <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            {totalUnreadMessages > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-[10px] sm:text-xs"
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
                avatarBox: 'h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9',
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
