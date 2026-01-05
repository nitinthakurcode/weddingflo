import { UsageChecker } from '@/lib/limits/usage-checker';
import { trpc } from '@/lib/trpc/client';
import type { PlanTier } from '@/lib/stripe/plans';

/**
 * Hook to get subscription data and usage checker
 * December 2025 - tRPC Implementation (no Supabase)
 *
 * Usage:
 * const { subscription, usage, checker, canAddGuest, canAddEvent, canAddUser } = useSubscription(companyId);
 *
 * if (!canAddGuest()) {
 *   toast({ title: 'Guest limit reached', description: 'Upgrade to add more guests' });
 *   return;
 * }
 */

// Map database tier to PlanTier (treats 'free' as 'starter' for limit checking)
function mapTierToPlanTier(tier: string): PlanTier {
  if (tier === 'free' || tier === 'starter') return 'starter';
  if (tier === 'professional') return 'professional';
  if (tier === 'enterprise') return 'enterprise';
  return 'starter'; // Default fallback
}

export function useSubscription(companyId: string | undefined) {
  // Fetch company data via tRPC
  const { data: company } = trpc.companies.getCurrent.useQuery(undefined, {
    enabled: !!companyId,
  });

  // Fetch dashboard stats for usage counts
  const { data: dashboardStats } = trpc.analytics.getDashboardStats.useQuery(undefined, {
    enabled: !!companyId,
  });

  // Map company data to subscription format
  const subscription = company ? {
    tier: company.subscriptionTier,
    status: company.subscriptionStatus,
    ends_at: company.subscriptionEndsAt,
    stripe_customer_id: company.stripeCustomerId,
    stripe_subscription_id: company.stripeSubscriptionId,
  } : null;

  // Map dashboard stats to usage format
  const usage = dashboardStats ? {
    guestsCount: dashboardStats.totalGuests || 0,
    eventsCount: dashboardStats.upcomingWeddings || 0, // Using upcomingWeddings as event count proxy
    usersCount: dashboardStats.activeClients || 0, // Using activeClients as user count proxy
  } : null;

  // Create usage checker with mapped tier (handles 'free' -> 'starter')
  const checker =
    subscription && usage
      ? new UsageChecker(mapTierToPlanTier(subscription.tier), {
          guestsCount: usage.guestsCount,
          eventsCount: usage.eventsCount,
          usersCount: usage.usersCount,
        })
      : null;

  return {
    subscription,
    usage,
    checker,

    // Convenience methods for checking limits
    canAddGuest: (count = 1) => {
      if (!checker) return true;
      return checker.checkGuestLimit(count).allowed;
    },

    canAddEvent: (count = 1) => {
      if (!checker) return true;
      return checker.checkEventLimit(count).allowed;
    },

    canAddUser: (count = 1) => {
      if (!checker) return true;
      return checker.checkUserLimit(count).allowed;
    },

    getGuestLimitMessage: () => {
      if (!checker) return null;
      return checker.checkGuestLimit(1).message;
    },

    getEventLimitMessage: () => {
      if (!checker) return null;
      return checker.checkEventLimit(1).message;
    },

    getUserLimitMessage: () => {
      if (!checker) return null;
      return checker.checkUserLimit(1).message;
    },
  };
}
