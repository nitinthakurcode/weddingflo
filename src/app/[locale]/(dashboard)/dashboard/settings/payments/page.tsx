import { Suspense } from 'react';
import { Metadata } from 'next';
import { StripeConnectSetup } from '@/components/payments/stripe-connect-setup';
import { PaymentMethodsList } from '@/components/payments/payment-methods-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Payment Settings',
  description: 'Manage your payment settings and Stripe Connect account',
};

export default function PaymentSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure your payment processing and Stripe Connect account.
        </p>
      </div>

      <Tabs defaultValue="connect" className="space-y-4">
        <TabsList>
          <TabsTrigger value="connect">Stripe Connect</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="connect" className="space-y-4">
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <StripeConnectSetup />
          </Suspense>
        </TabsContent>

        <TabsContent value="methods" className="space-y-4">
          <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
            <PaymentMethodsList />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
