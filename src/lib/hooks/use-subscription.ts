import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/client';
import { UsageChecker } from '@/lib/limits/usage-checker';
import { useUser } from '@clerk/nextjs';

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
  const supabase = useSupabase();
  const { user } = useUser();

  const { data: subscription } = useQuery({
    queryKey: ['subscription', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('company_id', companyId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId && !!user,
  });

  const { data: usage } = useQuery({
    queryKey: ['usage', companyId],
    queryFn: async () => {
      // Get guests count
      const { count: guestsCount } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      // Get events count
      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      // Get users count
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      return {
        guestsCount: guestsCount || 0,
        eventsCount: eventsCount || 0,
        usersCount: usersCount || 0,
      };
    },
    enabled: !!companyId && !!user,
  });

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
