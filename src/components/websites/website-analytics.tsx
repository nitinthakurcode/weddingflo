'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc/client';
import { BarChart, Users, Eye, TrendingUp, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface WebsiteAnalyticsProps {
  websiteId: string;
}

/**
 * Website Analytics Dashboard
 * Session 49: Track views, visitors, engagement
 */
export function WebsiteAnalytics({ websiteId }: WebsiteAnalyticsProps) {
  const { data: analytics, isLoading } = trpc.websites.getAnalytics.useQuery({
    websiteId,
    days: 30,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Views',
      value: analytics?.totalViews || 0,
      icon: Eye,
      color: 'text-blue-500',
    },
    {
      label: 'Unique Visitors',
      value: analytics?.uniqueVisitors || 0,
      icon: Users,
      color: 'text-green-500',
    },
    {
      label: 'Last 30 Days',
      value: analytics?.visits?.length || 0,
      icon: TrendingUp,
      color: 'text-purple-500',
    },
  ];

  // Group visits by date
  const visitsByDate: Record<string, number> = {};
  analytics?.visits?.forEach((visit: any) => {
    const date = format(new Date(visit.visited_at), 'MMM dd');
    visitsByDate[date] = (visitsByDate[date] || 0) + 1;
  });

  const chartData = Object.entries(visitsByDate)
    .map(([date, count]) => ({ date, count }))
    .slice(-7); // Last 7 days

  // Top pages
  const pageViews: Record<string, number> = {};
  analytics?.visits?.forEach((visit: any) => {
    pageViews[visit.page_path] = (pageViews[visit.page_path] || 0) + 1;
  });

  const topPages = Object.entries(pageViews)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Top referrers
  const referrers: Record<string, number> = {};
  analytics?.visits?.forEach((visit: any) => {
    if (visit.referrer) {
      const domain = new URL(visit.referrer).hostname;
      referrers[domain] = (referrers[domain] || 0) + 1;
    }
  });

  const topReferrers = Object.entries(referrers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value.toLocaleString()}</p>
                </div>
                <div className={`rounded-full bg-muted p-3 ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Views Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Views Over Time</CardTitle>
          <CardDescription>Last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="space-y-4">
              {chartData.map((item) => (
                <div key={item.date} className="flex items-center gap-4">
                  <div className="w-20 text-sm text-muted-foreground">{item.date}</div>
                  <div className="flex-1">
                    <div className="h-8 bg-muted rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${
                            (item.count / Math.max(...chartData.map((d) => d.count))) * 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-12 text-sm font-medium">{item.count}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No data yet. Share your website to start tracking views!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top Pages */}
      <Card>
        <CardHeader>
          <CardTitle>Top Pages</CardTitle>
          <CardDescription>Most visited pages</CardDescription>
        </CardHeader>
        <CardContent>
          {topPages.length > 0 ? (
            <div className="space-y-2">
              {topPages.map(([page, count]) => (
                <div key={page} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{page === '/' ? 'Home' : page}</span>
                  </div>
                  <Badge variant="secondary">{count} views</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">No page data available</p>
          )}
        </CardContent>
      </Card>

      {/* Top Referrers */}
      <Card>
        <CardHeader>
          <CardTitle>Traffic Sources</CardTitle>
          <CardDescription>Where your visitors are coming from</CardDescription>
        </CardHeader>
        <CardContent>
          {topReferrers.length > 0 ? (
            <div className="space-y-2">
              {topReferrers.map(([referrer, count]) => (
                <div key={referrer} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{referrer}</span>
                  </div>
                  <Badge variant="secondary">{count} visits</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No referrer data available. Visitors arrived directly.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
