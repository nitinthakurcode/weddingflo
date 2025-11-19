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
import { BarChart3, TrendingUp, Mail, DollarSign } from 'lucide-react';

export default function AnalyticsPage() {
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

  // Calculate stats
  const totalRevenue = revenueData?.data.reduce((sum, item) => sum + Number(item.revenue), 0) || 0;
  const totalTransactions = revenueData?.data.reduce((sum, item) => sum + Number(item.transaction_count), 0) || 0;
  const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  const emailsSent = notificationStats?.find((s) => s.notification_type === 'email')?.total_sent || 0;
  const smsSent = notificationStats?.find((s) => s.notification_type === 'sms')?.total_sent || 0;
  const activeClients = topClients?.length || 0;

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive insights into your business performance
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
        <TabsList>
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trends
          </TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <RevenueChart data={revenueData?.data || []} isLoading={revenueLoading} />
            <TopClientsChart data={topClients || []} isLoading={topClientsLoading} />
          </div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <PaymentStatusChart data={paymentBreakdown?.data || []} isLoading={paymentLoading} />
            <Card>
              <CardHeader>
                <CardTitle>Payment Summary</CardTitle>
                <CardDescription>Total payments by status</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentLoading ? (
                  <div className="text-muted-foreground">Loading payment summary...</div>
                ) : (
                  <div className="space-y-4">
                    {paymentBreakdown?.data.map((status) => (
                      <div key={status.status} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium capitalize">{status.status}</p>
                          <p className="text-xs text-muted-foreground">
                            {Number(status.count)} transactions
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
                        <p className="text-sm font-bold">Total</p>
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
            <NotificationStatsChart data={notificationStats || []} isLoading={notificationLoading} />
            <div className="grid gap-4 md:grid-cols-2">
              {notificationStats?.map((stat) => (
                <Card key={stat.notification_type}>
                  <CardHeader>
                    <CardTitle className="capitalize">{stat.notification_type} Statistics</CardTitle>
                    <CardDescription>Delivery performance metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Sent:</span>
                        <span className="font-medium">{Number(stat.total_sent).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Delivered:</span>
                        <span className="font-medium text-green-600">
                          {Number(stat.delivered).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Failed:</span>
                        <span className="font-medium text-red-600">
                          {Number(stat.failed).toLocaleString()}
                        </span>
                      </div>
                      {stat.notification_type === 'email' && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Opened:</span>
                            <span className="font-medium">{Number(stat.opened).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Clicked:</span>
                            <span className="font-medium">{Number(stat.clicked).toLocaleString()}</span>
                          </div>
                        </>
                      )}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Delivery Rate:</span>
                          <span className="font-bold text-primary">{Number(stat.delivery_rate)}%</span>
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
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue Trend</CardTitle>
              <CardDescription>Revenue performance over the last 12 months</CardDescription>
            </CardHeader>
            <CardContent>
              {trendLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="text-muted-foreground">Loading trend data...</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {monthlyTrend?.map((item) => (
                    <div key={item.month} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium">{item.month}</p>
                        <p className="text-xs text-muted-foreground">
                          {Number(item.transaction_count)} transactions
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
      </Tabs>
    </div>
  );
}
