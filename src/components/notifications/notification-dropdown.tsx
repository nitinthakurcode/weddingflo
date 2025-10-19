'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/client';
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
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

interface NotificationDropdownProps {
  userId: string;
  onClose: () => void;
}

export function NotificationDropdown({ userId, onClose }: NotificationDropdownProps) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  // Fetch notifications
  // TODO: Implement notifications table
  const { data: notifications } = useQuery<any[]>({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      // Notifications table not yet implemented
      return [];
    },
    enabled: false,
  });

  // Mark as read mutation
  // TODO: Implement notifications table
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      // Notifications table not yet implemented
      return;
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      // Notifications table not yet implemented
      return;
    },
  });

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
    if (read) return 'bg-gray-50 text-gray-600';
    switch (priority) {
      case 'high':
        return 'bg-red-50 text-red-600';
      case 'normal':
        return 'bg-blue-50 text-blue-600';
      case 'low':
        return 'bg-gray-50 text-gray-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    if (!notification.read) {
      await markAsRead.mutateAsync(notification.id);
    }

    // Navigate if there's an action URL
    if (notification.action_url) {
      router.push(notification.action_url);
      onClose();
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead.mutateAsync();
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-lg">Notifications</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
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
              const colorClass = getNotificationColor(notification.priority, notification.read);

              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm">{notification.title}</h4>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      {notification.action_label && (
                        <span className="text-xs text-blue-600 mt-2 inline-block">
                          {notification.action_label} →
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(notification.created_at, { addSuffix: true })}
                      </p>
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
