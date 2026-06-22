'use client';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import {
  CheckCheck,
  X,
  Calendar,
  DollarSign,
  Users,
  AlertCircle,
  Info,
} from 'lucide-react';
import { useRouter } from '@/lib/navigation';
import { useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';

interface NotificationDropdownProps {
  userId: string;
  onClose: () => void;
}

export function NotificationDropdown({ userId, onClose }: NotificationDropdownProps) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: notifications = [] } = trpc.notifications.list.useQuery({ limit: 20 });

  const invalidate = () => {
    utils.notifications.list.invalidate();
    utils.notifications.unreadCount.invalidate();
  };

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({ onSuccess: invalidate });
  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({ onSuccess: invalidate });

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsReadMutation.mutateAsync({ id: notificationId });
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsReadMutation.mutateAsync();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'budget':
        return DollarSign;
      case 'guest':
        return Users;
      case 'event':
        return Calendar;
      case 'alert':
        return AlertCircle;
      default:
        return Info;
    }
  };

  const getNotificationColor = (priority: string, read: boolean) => {
    if (read) return 'bg-mocha-50 text-mocha-600 dark:bg-mocha-900/50 dark:text-mocha-400';
    switch (priority) {
      case 'high':
        return 'bg-rose-50 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400';
      case 'normal':
        return 'bg-cobalt-50 text-cobalt-600 dark:bg-cobalt-900/50 dark:text-cobalt-400';
      case 'low':
        return 'bg-mocha-50 text-mocha-600 dark:bg-mocha-900/50 dark:text-mocha-400';
      default:
        return 'bg-mocha-50 text-mocha-600 dark:bg-mocha-900/50 dark:text-mocha-400';
    }
  };

  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id);
    }

    // Navigate if the notification carries a deep link in its metadata
    const link = (notification.metadata as { link?: string } | null)?.link;
    if (link) {
      router.push(link);
      onClose();
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-96 bg-card rounded-lg shadow-lg border z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-lg">Notifications</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            className="text-xs"
          >
            <CheckCheck className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className="h-[400px]">
        {!notifications || notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Info className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No notifications</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const colorClass = getNotificationColor('normal', !!notification.isRead);

              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full p-4 text-left hover:bg-muted transition-colors ${
                    !notification.isRead ? 'bg-cobalt-50/50 dark:bg-cobalt-950/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm">{notification.title}</h4>
                        {!notification.isRead && (
                          <div className="w-2 h-2 rounded-full bg-teal-600 flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      {notification.createdAt && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
