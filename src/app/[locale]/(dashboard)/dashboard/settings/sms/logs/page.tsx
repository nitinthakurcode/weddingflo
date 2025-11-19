import { Suspense } from 'react';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SmsLogsTable } from '@/components/sms/sms-logs-table';
import { SmsStatsCards } from '@/components/sms/sms-stats-cards';
import { Skeleton } from '@/components/ui/skeleton';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('smsLogs');

  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

export default function SmsLogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SMS Logs</h1>
        <p className="text-muted-foreground mt-2">
          View all SMS messages sent from your account with delivery status and analytics.
        </p>
      </div>

      {/* Statistics Cards */}
      <Suspense fallback={<StatsLoadingSkeleton />}>
        <SmsStatsCards />
      </Suspense>

      {/* SMS Logs Table */}
      <Suspense fallback={<TableLoadingSkeleton />}>
        <SmsLogsTable />
      </Suspense>
    </div>
  );
}

function StatsLoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  );
}

function TableLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
