import { Suspense } from 'react';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { EmailPreferencesForm } from '@/components/email/email-preferences-form';
import { EmailTestPanel } from '@/components/email/email-test-panel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'emailSettings' });

  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

function EmailSettingsContent() {
  const t = useTranslations('emailSettings');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('pageTitle')}</h1>
        <p className="text-muted-foreground mt-2">{t('pageDescription')}</p>
      </div>

      <Tabs defaultValue="preferences" className="space-y-4">
        <TabsList>
          <TabsTrigger value="preferences">{t('preferencesTab')}</TabsTrigger>
          <TabsTrigger value="test">{t('testTab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="preferences" className="space-y-4">
          <Suspense fallback={<PreferencesLoadingSkeleton />}>
            <EmailPreferencesForm />
          </Suspense>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Suspense fallback={<TestPanelLoadingSkeleton />}>
            <EmailTestPanel />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function EmailSettingsPage() {
  return <EmailSettingsContent />;
}

function PreferencesLoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-96 mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

function TestPanelLoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-96 mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}
