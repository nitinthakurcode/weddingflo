'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Users, TrendingUp, AlertCircle, BarChart3, Zap } from 'lucide-react';

interface AnalyticsMetrics {
  dau: number;
  mau: number;
  totalUsers: number;
  activeSubscriptions: number;
  errorRate: number;
  avgLoadTime: number;
  topFeatures: Array<{ name: string; usage: number }>;
  recentErrors: number;
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<AnalyticsMetrics>({
    dau: 0,
    mau: 0,
    totalUsers: 0,
    activeSubscriptions: 0,
    errorRate: 0,
    avgLoadTime: 0,
    topFeatures: [],
    recentErrors: 0,
  });

  useEffect(() => {
    // In a real implementation, fetch these from your analytics API
    // For now, using placeholder data
    setMetrics({
      dau: 127,
      mau: 1543,
      totalUsers: 3247,
      activeSubscriptions: 456,
      errorRate: 0.3,
      avgLoadTime: 1.2,
      topFeatures: [
        { name: 'Guest Management', usage: 1250 },
        { name: 'QR Codes', usage: 892 },
        { name: 'AI Seating', usage: 543 },
        { name: 'Budget Tracker', usage: 421 },
        { name: 'Vendor Management', usage: 367 },
      ],
      recentErrors: 12,
    });
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor application performance and user engagement
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.dau.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12%</span> from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Active Users</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.mau.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+23%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+8%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.errorRate}%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">-0.2%</span> from last week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="features" className="space-y-4">
        <TabsList>
          <TabsTrigger value="features">
            <Zap className="mr-2 h-4 w-4" />
            Feature Usage
          </TabsTrigger>
          <TabsTrigger value="performance">
            <Activity className="mr-2 h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="errors">
            <AlertCircle className="mr-2 h-4 w-4" />
            Errors
          </TabsTrigger>
          <TabsTrigger value="posthog">
            <BarChart3 className="mr-2 h-4 w-4" />
            PostHog Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Used Features</CardTitle>
              <CardDescription>
                Top 5 features by user interactions in the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.topFeatures.map((feature, index) => (
                  <div key={feature.name} className="flex items-center">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{feature.name}</p>
                      <div className="mt-1 h-2 w-full rounded-full bg-secondary">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{
                            width: `${(feature.usage / metrics.topFeatures[0].usage) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="ml-4 text-sm text-muted-foreground">
                      {feature.usage.toLocaleString()} uses
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Average Load Time</CardTitle>
                <CardDescription>Last 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.avgLoadTime}s</div>
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="text-green-600">-0.3s</span> improvement
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Web Vitals</CardTitle>
                <CardDescription>Core metrics overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">LCP</span>
                    <span className="text-sm font-medium text-green-600">Good</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">FID</span>
                    <span className="text-sm font-medium text-green-600">Good</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">CLS</span>
                    <span className="text-sm font-medium text-yellow-600">Needs Improvement</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Errors</CardTitle>
              <CardDescription>Last 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Total Errors</p>
                    <p className="text-2xl font-bold">{metrics.recentErrors}</p>
                  </div>
                  <a
                    href={`https://sentry.io/organizations/your-org/issues/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View in Sentry →
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">
                  Most errors are handled gracefully. Check Sentry for details.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posthog" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>PostHog Dashboard</CardTitle>
              <CardDescription>
                Embedded analytics from PostHog
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  To embed a PostHog dashboard:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Go to your PostHog dashboard</li>
                  <li>Click on &quot;Share&quot; and enable &quot;Public access&quot;</li>
                  <li>Copy the embed URL</li>
                  <li>Add it as an iframe below</li>
                </ol>
                <div className="rounded-lg border bg-muted/50 p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    PostHog dashboard iframe will appear here once configured
                  </p>
                </div>
                {/* Example iframe (uncomment and add your dashboard URL):
                <iframe
                  src="https://app.posthog.com/embedded/YOUR_DASHBOARD_ID"
                  className="w-full h-[600px] rounded-lg border"
                  frameBorder="0"
                />
                */}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
