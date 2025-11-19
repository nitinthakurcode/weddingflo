import { Suspense } from 'react';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SmsPreferencesForm } from '@/components/sms/sms-preferences-form';
import { SmsTestPanel } from '@/components/sms/sms-test-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('smsSettings');

  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

export default function SmsSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SMS Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your SMS notification preferences and test SMS templates.
        </p>
      </div>

      <Tabs defaultValue="preferences" className="space-y-4">
        <TabsList>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="test">Test SMS</TabsTrigger>
        </TabsList>

        <TabsContent value="preferences" className="space-y-4">
          <Suspense fallback={<PreferencesLoadingSkeleton />}>
            <SmsPreferencesForm />
          </Suspense>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Suspense fallback={<TestPanelLoadingSkeleton />}>
            <SmsTestPanel />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PreferencesLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

function TestPanelLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[300px] w-full" />
    </div>
  );
}
