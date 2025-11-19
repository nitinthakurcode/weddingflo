'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface PaymentStatusData {
  status: string;
  count: number;
  total_amount: number;
}

interface PaymentStatusChartProps {
  data: PaymentStatusData[];
  isLoading?: boolean;
}

const COLORS = {
  succeeded: '#10b981',
  pending: '#f59e0b',
  processing: '#3b82f6',
  failed: '#ef4444',
  refunded: '#6366f1',
};

export function PaymentStatusChart({ data, isLoading }: PaymentStatusChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Status Breakdown</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="text-muted-foreground">Loading chart data...</div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    value: Number(item.count),
    amount: Number(item.total_amount),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Status Breakdown</CardTitle>
        <CardDescription>Distribution by payment status</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS] || '#6366f1'}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
