import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { UsageChecker } from '@/lib/limits/usage-checker';

/**
 * Hook to get subscription data and usage checker
 *
 * Usage:
 * const { subscription, usage, checker, canAddGuest, canAddEvent, canAddUser } = useSubscription(companyId);
 *
 * if (!canAddGuest()) {
 *   toast({ title: 'Guest limit reached', description: 'Upgrade to add more guests' });
 *   return;
 * }
 */
export function useSubscription(companyId: string | undefined) {
  const subscription = useQuery(
    api.billing.getCurrentSubscription,
    companyId ? { companyId: companyId as any } : 'skip'
  );

  const usage = useQuery(
    api.billing.getUsageStats,
    companyId ? { companyId: companyId as any } : 'skip'
  );

  const checker =
    subscription && usage
      ? new UsageChecker(subscription.tier, {
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
