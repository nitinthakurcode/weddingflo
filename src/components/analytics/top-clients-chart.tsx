'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TopClientData {
  client_id: string;
  client_name: string;
  total_revenue: number;
  transaction_count: number;
}

interface TopClientsChartProps {
  data: TopClientData[];
  isLoading?: boolean;
}

export function TopClientsChart({ data, isLoading }: TopClientsChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Revenue Clients</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="text-muted-foreground">Loading chart data...</div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    name: item.client_name,
    revenue: Number(item.total_revenue),
    transactions: Number(item.transaction_count),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Revenue Clients</CardTitle>
        <CardDescription>Highest revenue generating clients</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={150} />
            <Tooltip />
            <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
