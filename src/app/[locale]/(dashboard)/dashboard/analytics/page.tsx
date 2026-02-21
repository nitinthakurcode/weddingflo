'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { subDays } from 'date-fns';
import { StatsCards } from '@/components/analytics/stats-cards';
import { DateRangePicker } from '@/components/analytics/date-range-picker';
import { RevenueChart } from '@/components/analytics/revenue-chart';
import { PaymentStatusChart } from '@/components/analytics/payment-status-chart';
import { NotificationStatsChart } from '@/components/analytics/notification-stats-chart';
import { TopClientsChart } from '@/components/analytics/top-clients-chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Mail, DollarSign, ListTodo, Users, Wallet, Building2, GitCompare } from 'lucide-react';
import {
  TaskCompletionChart,
  GuestRsvpFunnel,
  BudgetVarianceChart,
  PeriodComparisonCard,
  VendorPerformanceChart,
} from '@/features/analytics/components';
import { useTranslations } from 'next-intl';

export default function AnalyticsPage() {
  const t = useTranslations('analytics');
  const tc = useTranslations('common');
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Fetch dashboard overview (parallel queries)
  const { data: overview, isLoading: overviewLoading } = trpc.analytics.getDashboardOverview.useQuery();

  // Fetch data with date range
  const { data: revenueData, isLoading: revenueLoading } = trpc.analytics.getRevenueAnalytics.useQuery({
    startDate: dateRange.from.toISOString(),
    endDate: dateRange.to.toISOString(),
  });

  const { data: paymentBreakdown, isLoading: paymentLoading } = trpc.analytics.getPaymentStatusBreakdown.useQuery({
    startDate: dateRange.from.toISOString(),
    endDate: dateRange.to.toISOString(),
  });

  const { data: notificationStats, isLoading: notificationLoading } = trpc.analytics.getNotificationStats.useQuery({
    startDate: dateRange.from.toISOString(),
    endDate: dateRange.to.toISOString(),
  });

  const { data: topClients, isLoading: topClientsLoading } = trpc.analytics.getTopRevenueClients.useQuery({
    limit: 10,
  });

  const { data: monthlyTrend, isLoading: trendLoading } = trpc.analytics.getMonthlyRevenueTrend.useQuery();

  // Calculate stats - revenueData.data returns { total, byMonth, byClient }
  const totalRevenue = revenueData?.data?.total || 0;
  const byMonthData = revenueData?.data?.byMonth || [];
  const totalTransactions = Array.isArray(byMonthData)
    ? byMonthData.reduce((sum, item: { transaction_count?: number }) => sum + Number(item.transaction_count || 0), 0)
    : 0;
  const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // notificationStats returns { sent, delivered, opened, clicked } - use sent for total communications
  const emailsSent = notificationStats?.sent || 0;
  const smsSent = 0; // SMS stats not separate in current implementation
  const activeClients = topClients?.length || 0;

  // Convert notificationStats to array format for NotificationStatsChart
  const notificationStatsArray = notificationStats
    ? [
        {
          type: 'email',
          sent: notificationStats.sent || 0,
          delivered: notificationStats.delivered || 0,
          failed: 0,
          opened: notificationStats.opened || 0,
        },
      ]
    : [];

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-mocha-900 to-mocha-600 dark:from-white dark:to-mocha-300 bg-clip-text text-transparent">
            {t('title')}
          </h2>
          <p className="text-muted-foreground">
            {t('description')}
          </p>
        </div>
        <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>

      {/* Stats Cards */}
      <StatsCards
        totalRevenue={totalRevenue}
        totalTransactions={totalTransactions}
        emailsSent={Number(emailsSent)}
        smsSent={Number(smsSent)}
        activeClients={activeClients}
        averageOrderValue={averageOrderValue}
        isLoading={overviewLoading || revenueLoading}
      />

      {/* Tabs for different analytics views */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {t('tabs.revenue')}
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {t('tabs.payments')}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            {t('tabs.notifications')}
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t('tabs.trends')}
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            {t('tabs.tasks')}
          </TabsTrigger>
          <TabsTrigger value="guests" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('tabs.guests')}
          </TabsTrigger>
          <TabsTrigger value="budget" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            {t('tabs.budget')}
          </TabsTrigger>
          <TabsTrigger value="vendors" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {t('tabs.vendors')}
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <GitCompare className="h-4 w-4" />
            {t('tabs.compare')}
          </TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <RevenueChart data={revenueData?.data?.byMonth || []} isLoading={revenueLoading} />
            <TopClientsChart data={topClients || []} isLoading={topClientsLoading} />
          </div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <PaymentStatusChart data={paymentBreakdown?.data || []} isLoading={paymentLoading} />
            <Card
              variant="glass"
              className="border border-teal-200/50 dark:border-teal-800/30 shadow-lg shadow-teal-500/10 bg-gradient-to-br from-white via-teal-50/20 to-white dark:from-mocha-900 dark:via-teal-950/10 dark:to-mocha-900"
            >
              <CardHeader>
                <CardTitle className="bg-gradient-to-r from-teal-600 to-teal-600 bg-clip-text text-transparent">
                  {t('charts.paymentSummary')}
                </CardTitle>
                <CardDescription>{t('charts.paymentSummaryDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentLoading ? (
                  <div className="text-muted-foreground">{t('loadingPaymentSummary')}</div>
                ) : (
                  <div className="space-y-4">
                    {paymentBreakdown?.data.map((status) => (
                      <div key={status.status} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium capitalize">{status.status}</p>
                          <p className="text-xs text-muted-foreground">
                            {Number(status.count)} {t('metrics.transactions')}
                          </p>
                        </div>
                        <p className="text-lg font-bold">
                          ${Number(status.total_amount).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    ))}
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold">{t('metrics.total')}</p>
                        <p className="text-xl font-bold text-primary">
                          ${(paymentBreakdown?.totalAmount || 0).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <div className="grid gap-4">
            <NotificationStatsChart data={notificationStatsArray} isLoading={notificationLoading} />
            <div className="grid gap-4 md:grid-cols-2">
              {notificationStatsArray.map((stat) => (
                <Card
                  key={stat.type}
                  variant="glass"
                  className="border border-teal-200/50 dark:border-teal-800/30 shadow-lg shadow-teal-500/10 bg-gradient-to-br from-white via-teal-50/20 to-white dark:from-mocha-900 dark:via-teal-950/10 dark:to-mocha-900"
                >
                  <CardHeader>
                    <CardTitle className="capitalize bg-gradient-to-r from-teal-600 to-teal-600 bg-clip-text text-transparent">
                      {stat.type} {t('charts.notificationStatistics')}
                    </CardTitle>
                    <CardDescription>{t('charts.notificationDescription')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">{t('metrics.totalSent')}:</span>
                        <span className="font-medium">{Number(stat.sent).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">{t('metrics.delivered')}:</span>
                        <span className="font-medium text-sage-600">
                          {Number(stat.delivered).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">{t('metrics.failed')}:</span>
                        <span className="font-medium text-rose-600">
                          {Number(stat.failed).toLocaleString()}
                        </span>
                      </div>
                      {stat.type === 'email' && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">{t('metrics.opened')}:</span>
                            <span className="font-medium">{Number(stat.opened).toLocaleString()}</span>
                          </div>
                        </>
                      )}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">{t('metrics.deliveryRate')}:</span>
                          <span className="font-bold text-primary">
                            {stat.sent > 0 ? ((stat.delivered / stat.sent) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card
            variant="glass"
            className="border border-sage-200/50 dark:border-sage-800/30 shadow-lg shadow-sage-500/10 bg-gradient-to-br from-white via-sage-50/20 to-white dark:from-mocha-900 dark:via-sage-950/10 dark:to-mocha-900"
          >
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-sage-600 to-teal-600 bg-clip-text text-transparent">
                {t('charts.monthlyRevenueTrend')}
              </CardTitle>
              <CardDescription>{t('charts.monthlyTrendDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {trendLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="text-muted-foreground">{t('loadingTrendData')}</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {monthlyTrend?.map((item) => (
                    <div key={item.month} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium">{item.month}</p>
                        <p className="text-xs text-muted-foreground">
                          {Number(item.transaction_count)} {t('metrics.transactions')}
                        </p>
                      </div>
                      <p className="text-lg font-bold">
                        ${Number(item.revenue).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <TaskCompletionChart dateRange={dateRange} />
        </TabsContent>

        {/* Guests Tab */}
        <TabsContent value="guests" className="space-y-4">
          <GuestRsvpFunnel />
        </TabsContent>

        {/* Budget Tab */}
        <TabsContent value="budget" className="space-y-4">
          <BudgetVarianceChart />
        </TabsContent>

        {/* Vendors Tab */}
        <TabsContent value="vendors" className="space-y-4">
          <VendorPerformanceChart />
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-4">
          <PeriodComparisonCard
            title={t('metrics.revenue')}
            currentValue={totalRevenue}
            previousValue={0}
            format="currency"
            dateRange={dateRange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
