'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Users, TrendingUp, AlertCircle, BarChart3, Zap, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  // Analytics data should come from PostHog or similar service
  // Showing empty state until proper integration is configured
  const [metrics] = useState<AnalyticsMetrics>({
    dau: 0,
    mau: 0,
    totalUsers: 0,
    activeSubscriptions: 0,
    errorRate: 0,
    avgLoadTime: 0,
    topFeatures: [],
    recentErrors: 0,
  });

  const hasData = metrics.dau > 0 || metrics.mau > 0 || metrics.totalUsers > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor application performance and user engagement
        </p>
      </div>

      {/* Integration Notice */}
      {!hasData && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <BarChart3 className="h-8 w-8 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Analytics Integration Required</h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Connect PostHog or configure analytics to see real-time user engagement metrics.
                  View the PostHog tab below to embed your dashboard.
                </p>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://posthog.com" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      PostHog Docs
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://sentry.io" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Sentry Dashboard
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hasData ? metrics.dau.toLocaleString() : '—'}</div>
            <p className="text-xs text-muted-foreground">
              {hasData ? 'From analytics' : 'Connect PostHog to track'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Active Users</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hasData ? metrics.mau.toLocaleString() : '—'}</div>
            <p className="text-xs text-muted-foreground">
              {hasData ? 'From analytics' : 'Connect PostHog to track'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hasData ? metrics.activeSubscriptions : '—'}</div>
            <p className="text-xs text-muted-foreground">
              {hasData ? 'From Stripe' : 'Connect Stripe to track'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hasData ? `${metrics.errorRate}%` : '—'}</div>
            <p className="text-xs text-muted-foreground">
              {hasData ? 'From Sentry' : 'Connect Sentry to track'}
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
              {metrics.topFeatures.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Zap className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No feature usage data available</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Connect PostHog to track feature engagement
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {metrics.topFeatures.map((feature) => (
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
              )}
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
                {hasData ? (
                  <>
                    <div className="text-3xl font-bold">{metrics.avgLoadTime}s</div>
                    <p className="text-xs text-muted-foreground mt-2">From performance monitoring</p>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <Activity className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No data available</p>
                    <p className="text-xs text-muted-foreground mt-1">Connect monitoring service</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Web Vitals</CardTitle>
                <CardDescription>Core metrics overview</CardDescription>
              </CardHeader>
              <CardContent>
                {hasData ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">LCP</span>
                      <span className="text-sm font-medium text-muted-foreground">—</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">FID</span>
                      <span className="text-sm font-medium text-muted-foreground">—</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">CLS</span>
                      <span className="text-sm font-medium text-muted-foreground">—</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <TrendingUp className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No vitals data</p>
                    <p className="text-xs text-muted-foreground mt-1">Connect monitoring service</p>
                  </div>
                )}
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
