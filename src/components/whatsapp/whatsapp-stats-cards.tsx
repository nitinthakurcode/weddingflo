'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, CheckCheck, Eye, XCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface WhatsAppStats {
  total_sent: number;
  delivered: number;
  read: number;
  failed: number;
  delivery_rate: number;
}

interface WhatsAppStatsCardsProps {
  stats: WhatsAppStats;
  isLoading?: boolean;
}

export function WhatsAppStatsCards({ stats, isLoading }: WhatsAppStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Sent */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_sent.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Last 30 days</p>
        </CardContent>
      </Card>

      {/* Delivered */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Delivered</CardTitle>
          <CheckCheck className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.delivered.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {stats.total_sent > 0
              ? `${((stats.delivered / stats.total_sent) * 100).toFixed(1)}% delivery rate`
              : 'No messages sent'}
          </p>
        </CardContent>
      </Card>

      {/* Read */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Read</CardTitle>
          <Eye className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.read.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {stats.delivered > 0
              ? `${((stats.read / stats.delivered) * 100).toFixed(1)}% read rate`
              : 'No delivered messages'}
          </p>
        </CardContent>
      </Card>

      {/* Failed */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Failed</CardTitle>
          <XCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.failed.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {stats.total_sent > 0
              ? `${((stats.failed / stats.total_sent) * 100).toFixed(1)}% failure rate`
              : 'No failures'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
