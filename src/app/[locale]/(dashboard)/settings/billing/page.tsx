'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc/client';
import { TestModeBanner } from '@/components/billing/test-mode-banner';
import { CurrentPlanCard } from '@/components/billing/current-plan-card';
import { PlanComparison } from '@/components/billing/plan-comparison';
import { UsageStats } from '@/components/billing/usage-stats';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/lib/navigation';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

export default function BillingPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Get current user via tRPC
  const { data: currentUser, isLoading: userLoading } = trpc.users.getCurrent.useQuery(
    undefined,
    { enabled: !!session?.user?.id }
  );

  const companyId = currentUser?.company_id;

  // Fetch company data (includes subscription info) via tRPC
  const { data: company, isLoading: companyLoading } = trpc.companies.getCurrent.useQuery(
    undefined,
    { enabled: !!companyId }
  );

  // Fetch dashboard stats for usage via tRPC
  const { data: dashboardStats, isLoading: statsLoading } = trpc.analytics.getDashboardStats.useQuery(
    undefined,
    { enabled: !!companyId }
  );

  // Build subscription from company data
  const subscription = company ? {
    tier: company.subscriptionTier || 'free',
    status: company.subscriptionStatus || 'active',
    current_period_end: company.subscriptionEndsAt ? new Date(company.subscriptionEndsAt).getTime() : undefined,
    cancel_at_period_end: false,
  } : null;

  // Build usage from dashboard stats
  const usage = dashboardStats ? {
    guestsCount: dashboardStats.totalGuests || 0,
    eventsCount: dashboardStats.upcomingWeddings || 0,
    usersCount: dashboardStats.activeClients || 0,
  } : null;

  const isLoading = userLoading || companyLoading || statsLoading;

  // Handle success/cancel redirects
  useEffect(() => {
    if (searchParams.get('success')) {
      toast({
        title: 'Success!',
        description: 'Your subscription has been activated.',
      });
    } else if (searchParams.get('canceled')) {
      toast({
        title: 'Checkout canceled',
        description: 'You can upgrade anytime.',
        variant: 'default',
      });
    }
  }, [searchParams, toast]);

  const handleSelectPlan = async (priceId: string) => {
    if (!companyId) return;

    setLoading(true);
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, companyId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start checkout. Please try again.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error: any) {
      console.error('Error opening portal:', error);
      const errorMessage = error.message || 'Failed to open billing portal. Please try again.';

      // Check if it's a portal configuration error
      if (errorMessage.includes('configuration')) {
        toast({
          title: 'Portal Not Configured',
          description: 'The Stripe Customer Portal needs to be activated. Please contact support or use the Cancel button below.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!companyId) return;

    const confirmed = confirm(
      'Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.'
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Subscription Canceled',
          description: 'Your subscription will remain active until the end of the billing period.',
        });
        // Refresh the page to update subscription status
        window.location.reload();
      } else {
        throw new Error(data.error || 'Failed to cancel subscription');
      }
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel subscription. Please try again.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  // Show error if no company ID
  if (currentUser && !companyId) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-mocha-900 dark:text-mocha-100">Company Not Found</h2>
          <p className="mt-2 text-mocha-600 dark:text-mocha-400">
            Please complete onboarding first to set up your company.
          </p>
          <Link
            href="/onboard"
            className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary"
          >
            Go to Onboarding
          </Link>
        </div>
      </div>
    );
  }

  // Show loading while fetching data
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-mocha-600 dark:text-mocha-400">Loading subscription details...</p>
      </div>
    );
  }

  if (!subscription || !usage) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-mocha-600 dark:text-mocha-400">Loading subscription details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-mocha-900 to-mocha-600 dark:from-white dark:to-mocha-300 bg-clip-text text-transparent">
          Billing & Subscription
        </h1>
        <p className="text-muted-foreground">Manage your subscription and billing information</p>
      </div>

      <TestModeBanner />

      <div className="grid gap-6 lg:grid-cols-2">
        <CurrentPlanCard
          tier={subscription.tier}
          status={subscription.status}
          currentPeriodEnd={subscription.current_period_end}
          cancelAtPeriodEnd={subscription.cancel_at_period_end}
          onManageSubscription={handleManageSubscription}
          onCancelSubscription={handleCancelSubscription}
          loading={loading}
        />

        <UsageStats
          tier={subscription.tier}
          guestsCount={usage.guestsCount}
          eventsCount={usage.eventsCount}
          usersCount={usage.usersCount}
        />
      </div>

      <div>
        <h2 className="mb-6 text-2xl font-bold">Available Plans</h2>
        <PlanComparison
          currentPlan={subscription.tier}
          onSelectPlan={handleSelectPlan}
          loading={loading}
        />
      </div>
    </div>
  );
}
