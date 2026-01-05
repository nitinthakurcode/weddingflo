'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslations } from 'next-intl';

interface TopClientData {
  client_id: string;
  partner1_first_name: string;
  partner1_last_name: string;
  partner2_first_name?: string | null;
  partner2_last_name?: string | null;
  wedding_date?: string | null;
  total_revenue: number;
  payment_count: number;
  // Legacy support
  client_name?: string;
  transaction_count?: number;
}

interface TopClientsChartProps {
  data: TopClientData[];
  isLoading?: boolean;
}

export function TopClientsChart({ data, isLoading }: TopClientsChartProps) {
  const t = useTranslations('analytics');
  const tc = useTranslations('common');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('charts.topRevenueClients')}</CardTitle>
          <CardDescription>{tc('loading')}</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="text-muted-foreground">{t('loadingChartData')}</div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => {
    // Build client name from partner names or use legacy client_name
    const clientName = item.client_name ||
      [item.partner1_first_name, item.partner2_first_name ? `& ${item.partner2_first_name}` : '']
        .filter(Boolean)
        .join(' ');

    return {
      name: clientName || 'Client',
      revenue: Number(item.total_revenue),
      transactions: Number(item.payment_count ?? item.transaction_count ?? 0),
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('charts.topRevenueClients')}</CardTitle>
        <CardDescription>{t('charts.topClientsDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={150} />
            <Tooltip />
            <Bar dataKey="revenue" fill="#8884d8" name={t('metrics.revenue')} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
