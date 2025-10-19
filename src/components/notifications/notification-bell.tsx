'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { NotificationDropdown } from './notification-dropdown';
import { Badge } from '@/components/ui/badge';

interface NotificationBellProps {
  userId: string;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const supabase = useSupabase();

  // Get unread notification count
  // TODO: Implement notifications table
  const { data: unreadCount } = useQuery({
    queryKey: ['notifications-unread-count', userId],
    queryFn: async () => {
      // Notifications table not yet implemented
      return 0;
    },
    enabled: false,
  });

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount !== undefined && unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <NotificationDropdown userId={userId} onClose={() => setIsOpen(false)} />
      )}
    </div>
  );
}
