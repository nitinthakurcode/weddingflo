'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Mail, MessageSquare, Users, CreditCard } from 'lucide-react';

interface StatsCardsProps {
  totalRevenue: number;
  totalTransactions: number;
  emailsSent: number;
  smsSent: number;
  activeClients: number;
  averageOrderValue: number;
  isLoading?: boolean;
}

export function StatsCards({
  totalRevenue,
  totalTransactions,
  emailsSent,
  smsSent,
  activeClients,
  averageOrderValue,
  isLoading,
}: StatsCardsProps) {
  const stats = [
    {
      title: 'Total Revenue',
      value: `${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      description: 'Last 30 days',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Transactions',
      value: totalTransactions.toLocaleString(),
      icon: CreditCard,
      description: 'Total payments',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Average Order',
      value: `${averageOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      description: 'Per transaction',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Emails Sent',
      value: emailsSent.toLocaleString(),
      icon: Mail,
      description: 'Last 30 days',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'SMS Sent',
      value: smsSent.toLocaleString(),
      icon: MessageSquare,
      description: 'Last 30 days',
      color: 'text-pink-600',
      bgColor: 'bg-pink-100',
    },
    {
      title: 'Active Clients',
      value: activeClients.toLocaleString(),
      icon: Users,
      description: 'With transactions',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">Loading data...</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
