'use client';

import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, Mail, MessageSquare, Users, CreditCard } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { STAT_CARD_COLORS } from '@/lib/theme/stat-colors';

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
  const t = useTranslations('analytics');
  const tc = useTranslations('common');

  const stats = [
    {
      title: t('stats.totalRevenue'),
      value: `${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      description: t('stats.last30Days'),
      ...STAT_CARD_COLORS.success, // Sage for revenue
    },
    {
      title: t('stats.transactions'),
      value: totalTransactions.toLocaleString(),
      icon: CreditCard,
      description: t('stats.totalPayments'),
      ...STAT_CARD_COLORS.info, // Cobalt for transactions
    },
    {
      title: t('stats.averageOrder'),
      value: `${averageOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      description: t('stats.perTransaction'),
      ...STAT_CARD_COLORS.primary, // Teal for average
    },
    {
      title: t('stats.emailsSent'),
      value: emailsSent.toLocaleString(),
      icon: Mail,
      description: t('stats.last30Days'),
      ...STAT_CARD_COLORS.warning, // Gold for emails
    },
    {
      title: t('stats.smsSent'),
      value: smsSent.toLocaleString(),
      icon: MessageSquare,
      description: t('stats.last30Days'),
      ...STAT_CARD_COLORS.danger, // Rose for SMS
    },
    {
      title: t('stats.activeClients'),
      value: activeClients.toLocaleString(),
      icon: Users,
      description: t('stats.withTransactions'),
      ...STAT_CARD_COLORS.neutral, // Mocha for clients
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card
            key={i}
            variant="glass"
            size="compact"
            className="border border-mocha-200/50 dark:border-mocha-800/30 shadow-lg"
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="h-8 w-8 animate-pulse bg-muted rounded-xl" />
                <div className="h-3 w-16 animate-pulse bg-muted rounded" />
              </div>
              <div className="h-8 w-20 animate-pulse bg-muted rounded mb-1" />
              <div className="h-3 w-24 animate-pulse bg-muted rounded" />
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
          <Card
            key={stat.title}
            variant="glass"
            size="compact"
            className={`group hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 border ${stat.borderColor} shadow-lg ${stat.shadowColor} hover:shadow-xl bg-gradient-to-br ${stat.gradientBg}`}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-xl bg-gradient-to-br ${stat.iconGradient} transition-colors shadow-inner`}>
                  <Icon className={`h-4 w-4 ${stat.iconColor}`} />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{stat.title}</span>
              </div>
              <div className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r ${stat.valueGradient} bg-clip-text text-transparent`}>
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
