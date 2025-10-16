'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { TestModeBanner } from '@/components/billing/test-mode-banner';
import { CurrentPlanCard } from '@/components/billing/current-plan-card';
import { PlanComparison } from '@/components/billing/plan-comparison';
import { UsageStats } from '@/components/billing/usage-stats';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

export default function BillingPage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Get company ID from user metadata
  const companyId = user?.publicMetadata?.companyId as string | undefined;

  // Debug logging
  console.log('🔍 Billing Page Debug:', {
    hasUser: !!user,
    companyId,
    userMetadata: user?.publicMetadata,
  });

  // Fetch subscription data
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['subscription', companyId],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID not available');
      if (!companyId) return null;
      const { data, error } = await supabase
        .from('companies')
        .select('subscription_tier, subscription_status, subscription_ends_at')
        .eq('id', companyId)
        .single();

      if (error) throw error;

      return data ? {
        tier: data.subscription_tier,
        status: data.subscription_status,
        current_period_end: data.subscription_ends_at,
        cancel_at_period_end: false,
      } : null;
    },
    enabled: !!user && !!companyId,
  });

  // Fetch usage stats
  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['usage', companyId],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID not available');
      if (!companyId) return null;

      // Get guests count
      const { count: guestsCount, error: guestsError } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .in('client_id',
          supabase
            .from('clients')
            .select('id')
            .eq('company_id', companyId)
        );

      if (guestsError) throw guestsError;

      // Get clients count (events)
      const { count: eventsCount, error: eventsError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      if (eventsError) throw eventsError;

      // Get users count
      const { count: usersCount, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      if (usersError) throw usersError;

      return {
        guestsCount: guestsCount || 0,
        eventsCount: eventsCount || 0,
        usersCount: usersCount || 0,
      };
    },
    enabled: !!user && !!companyId,
  });

  // Debug query results
  console.log('📊 Query Results:', {
    subscription,
    usage,
    hasSubscription: !!subscription,
    hasUsage: !!usage,
  });

  const isLoading = subscriptionLoading || usageLoading;

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

      console.log('📦 Checkout response:', data);

      if (data.url) {
        console.log('🚀 Redirecting to checkout:', data.url);
        window.location.href = data.url;
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('❌ Error creating checkout:', error);
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

  const handleSyncSubscription = async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      const response = await fetch('/api/stripe/sync-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Subscription Synced',
          description: 'Your subscription has been updated from Stripe.',
        });
        // Refresh the page to show updated subscription
        window.location.reload();
      } else {
        throw new Error(data.error || 'Failed to sync subscription');
      }
    } catch (error: any) {
      console.error('Error syncing subscription:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to sync subscription. Please try again.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  // Show error if no company ID
  if (!companyId) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Company Not Found</h2>
          <p className="mt-2 text-gray-600">
            Please complete onboarding first to set up your company.
          </p>
          <a
            href="/onboard"
            className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary"
          >
            Go to Onboarding
          </a>
        </div>
      </div>
    );
  }

  // Show loading while fetching data
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-gray-600">Loading subscription details...</p>
      </div>
    );
  }

  if (!subscription || !usage) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-gray-600">Loading subscription details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
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
