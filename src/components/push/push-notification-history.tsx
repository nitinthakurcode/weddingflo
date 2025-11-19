/**
 * Push Notification History Component
 *
 * Displays recent push notifications sent to the user:
 * - Notification title and body
 * - Send status (sent/failed)
 * - Timestamp
 * - Notification type
 * - Pagination support
 *
 * Also shows delivery statistics
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc/client';
import { formatDistanceToNow } from 'date-fns';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Bell,
  CreditCard,
  Users,
  Calendar,
  CheckSquare,
  MessageSquare,
  Info,
} from 'lucide-react';

// Notification type icons
const notificationTypeIcons: Record<string, React.ReactNode> = {
  payment_alert: <CreditCard className="h-4 w-4" />,
  rsvp_update: <Users className="h-4 w-4" />,
  event_reminder: <Calendar className="h-4 w-4" />,
  task_deadline: <CheckSquare className="h-4 w-4" />,
  vendor_message: <MessageSquare className="h-4 w-4" />,
  system_notification: <Info className="h-4 w-4" />,
};

// Notification type labels
const notificationTypeLabels: Record<string, string> = {
  payment_alert: 'Payment',
  rsvp_update: 'RSVP',
  event_reminder: 'Event',
  task_deadline: 'Task',
  vendor_message: 'Vendor',
  system_notification: 'System',
};

function NotificationLogItem({ log }: { log: any }) {
  const icon = notificationTypeIcons[log.notification_type] || <Bell className="h-4 w-4" />;
  const label = notificationTypeLabels[log.notification_type] || 'Notification';

  return (
    <div className="flex items-start gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors">
      {/* Status Icon */}
      <div className="mt-1">
        {log.status === 'sent' || log.status === 'delivered' ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : log.status === 'failed' ? (
          <XCircle className="h-5 w-5 text-red-600" />
        ) : (
          <Clock className="h-5 w-5 text-yellow-600" />
        )}
      </div>

      {/* Notification Content */}
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="font-medium">{log.title}</h4>
            <p className="text-sm text-muted-foreground">{log.body}</p>
          </div>
          <Badge variant="outline" className="flex items-center gap-1 shrink-0">
            {icon}
            <span className="text-xs">{label}</span>
          </Badge>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            {log.sent_at
              ? formatDistanceToNow(new Date(log.sent_at), { addSuffix: true })
              : formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
          </span>
          {log.status === 'failed' && log.error_message && (
            <span className="text-red-600">Error: {log.error_message}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function PushNotificationHistory() {
  const [page, setPage] = useState(0);
  const limit = 10;

  // Get notification logs
  const { data, isLoading } = trpc.push.getLogs.useQuery({
    limit,
    offset: page * limit,
  });

  // Get delivery stats
  const { data: stats } = trpc.push.getStats.useQuery();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const logs = data?.logs || [];
  const hasMore = data?.hasMore || false;
  const total = data?.total || 0;

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Sent</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Delivered</CardDescription>
              <CardTitle className="text-2xl text-green-600">{stats.sent}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0}% success rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Failed</CardDescription>
              <CardTitle className="text-2xl text-red-600">{stats.failed}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0}% failure rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Delivery Rate</CardDescription>
              <CardTitle className="text-2xl">{stats.deliveryRate.toFixed(1)}%</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {stats.deliveryRate >= 90
                  ? 'Excellent'
                  : stats.deliveryRate >= 70
                  ? 'Good'
                  : 'Needs attention'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notification History */}
      <Card>
        <CardHeader>
          <CardTitle>Notification History</CardTitle>
          <CardDescription>
            Recent push notifications sent to your devices ({total} total)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No notifications yet</h3>
              <p className="text-sm text-muted-foreground">
                You'll see your notification history here once you start receiving them
              </p>
            </div>
          ) : (
            <>
              {/* Notification List */}
              <div className="space-y-3">
                {logs.map((log) => (
                  <NotificationLogItem key={log.id} log={log} />
                ))}
              </div>

              {/* Pagination */}
              {total > limit && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * limit + 1} - {Math.min((page + 1) * limit, total)} of {total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={!hasMore}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
