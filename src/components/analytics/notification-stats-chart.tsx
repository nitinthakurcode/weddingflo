'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface NotificationStatsData {
  type: string;
  sent: number;
  delivered: number;
  failed: number;
  opened: number;
  // Legacy fields for backward compatibility
  notification_type?: string;
  total_sent?: number;
  clicked?: number;
  delivery_rate?: number;
}

interface NotificationStatsChartProps {
  data: NotificationStatsData[];
  isLoading?: boolean;
}

export function NotificationStatsChart({ data, isLoading }: NotificationStatsChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Statistics</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="text-muted-foreground">Loading chart data...</div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => {
    const notificationType = item.type || item.notification_type || 'unknown';
    const totalSent = item.sent ?? item.total_sent ?? 0;
    const deliveryRate = item.delivery_rate ?? (totalSent > 0 ? (item.delivered / totalSent) * 100 : 0);

    return {
      type: notificationType.toUpperCase(),
      sent: Number(totalSent),
      delivered: Number(item.delivered),
      failed: Number(item.failed),
      opened: Number(item.opened),
      deliveryRate: Number(deliveryRate),
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Statistics</CardTitle>
        <CardDescription>Email and SMS delivery performance</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="type" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="delivered" fill="#10b981" name="Delivered" />
            <Bar dataKey="failed" fill="#ef4444" name="Failed" />
            <Bar dataKey="opened" fill="#3b82f6" name="Opened" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
