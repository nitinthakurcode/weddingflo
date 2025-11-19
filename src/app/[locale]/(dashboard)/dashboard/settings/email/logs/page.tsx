import { Suspense } from 'react';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EmailLogsTable } from '@/components/email/email-logs-table';
import { EmailStatsCards } from '@/components/email/email-stats-cards';
import { Skeleton } from '@/components/ui/skeleton';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'emailLogs' });

  return {
    title: t('pageTitle') || 'Email Logs',
    description: t('pageDescription') || 'View all emails sent from your account with delivery status and analytics.',
  };
}

export default function EmailLogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Email Logs</h1>
        <p className="text-muted-foreground mt-2">
          View all emails sent from your account with delivery status and analytics.
        </p>
      </div>

      {/* Statistics Cards */}
      <Suspense fallback={<StatsLoadingSkeleton />}>
        <EmailStatsCards />
      </Suspense>

      {/* Email Logs Table */}
      <Suspense fallback={<TableLoadingSkeleton />}>
        <EmailLogsTable />
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
