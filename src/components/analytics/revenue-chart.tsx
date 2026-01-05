'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';

interface RevenueData {
  date: string;
  revenue: number;
  transaction_count: number;
  currency?: string;
}

interface RevenueChartProps {
  data: RevenueData[];
  isLoading?: boolean;
}

export function RevenueChart({ data, isLoading }: RevenueChartProps) {
  const t = useTranslations('analytics');
  const tc = useTranslations('common');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('charts.revenueOverTime')}</CardTitle>
          <CardDescription>{tc('loading')}</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="text-muted-foreground">{t('loadingChartData')}</div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    date: format(new Date(item.date), 'MMM dd'),
    revenue: Number(item.revenue),
    transactions: Number(item.transaction_count),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('charts.revenueOverTime')}</CardTitle>
        <CardDescription>{t('charts.revenueDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              stroke="var(--teal-500, #14B8A6)"
              activeDot={{ r: 8 }}
              name={t('metrics.revenue')}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="transactions"
              stroke="var(--sage-500, #5A9A49)"
              name={t('metrics.transactions')}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
