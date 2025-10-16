'use client';

import { useQuery as useReactQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { PageLoader } from '@/components/ui/loading-spinner';
import { DashboardStatsCards } from '@/components/dashboard/dashboard-stats-cards';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { AlertsPanel } from '@/components/dashboard/alerts-panel';
import { UpcomingEventsWidget } from '@/components/dashboard/upcoming-events-widget';
import { AIInsightsPanel } from '@/components/dashboard/ai-insights-panel';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Dynamically import heavy chart components to reduce bundle size
const DashboardCharts = dynamic(
  () => import('@/components/dashboard/dashboard-charts').then(mod => ({ default: mod.DashboardCharts })),
  {
    loading: () => <div className="h-[400px] flex items-center justify-center bg-muted/20 rounded-lg animate-pulse"><span className="text-sm text-muted-foreground">Loading charts...</span></div>,
    ssr: false
  }
);

export default function DashboardPage() {
  const router = useRouter();
  const { user, isSignedIn, isLoaded: clerkLoaded } = useUser();
  const supabase = createClient();

  // Get current user and their clients
  const { data: currentUser, isLoading: userLoading } = useReactQuery({
    queryKey: ['current-user', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID not available');
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // If Clerk says user is signed in but Supabase doesn't have the user, redirect to onboarding
  useEffect(() => {
    if (clerkLoaded && isSignedIn && !userLoading && currentUser === null) {
      router.push('/onboard');
    }
  }, [clerkLoaded, isSignedIn, currentUser, userLoading, router]);

  const { data: clients } = useReactQuery({
    queryKey: ['clients', currentUser?.company_id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID not available');
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', currentUser!.company_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.company_id,
  });

  // Use first client for now
  const selectedClient = clients?.[0];
  const clientId = selectedClient?.id;

  // Fetch dashboard data (multiple queries in parallel)
  const { data: dashboardStats } = useReactQuery({
    queryKey: ['dashboard-stats', clientId],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID not available');
      // Fetch all counts in parallel
      const [guests, vendors, creatives, budgetItems, events] = await Promise.all([
        supabase.from('guests').select('*', { count: 'exact', head: false }).eq('client_id', clientId!),
        supabase.from('vendors').select('*', { count: 'exact', head: false }).eq('client_id', clientId!),
        supabase.from('creative_jobs').select('*', { count: 'exact', head: false }).eq('client_id', clientId!),
        supabase.from('budget_items').select('*', { count: 'exact', head: false }).eq('client_id', clientId!),
        supabase.from('event_brief').select('*', { count: 'exact', head: false }).eq('client_id', clientId!),
      ]);

      const guestsData = guests.data || [];
      const vendorsData = vendors.data || [];
      const creativesData = creatives.data || [];
      const budgetData = budgetItems.data || [];

      const totalGuests = guestsData.length;
      const confirmedGuests = guestsData.filter((g: any) => g.form_submitted).length;
      const totalVendors = vendorsData.length;
      const confirmedVendors = vendorsData.filter((v: any) => v.status === 'confirmed' || v.status === 'booked').length;
      const totalCreatives = creativesData.length;
      const completedCreatives = creativesData.filter((c: any) => c.status === 'completed').length;

      const totalBudget = budgetData.reduce((sum: number, item: any) => sum + (item.budget || 0), 0);
      const budgetSpent = budgetData.reduce((sum: number, item: any) => sum + (item.actual_cost || 0), 0);
      const budgetSpentPercentage = totalBudget > 0 ? (budgetSpent / totalBudget) * 100 : 0;

      // Calculate days until wedding (using first event date)
      const firstEvent = events.data?.[0];
      const daysUntilWedding = firstEvent?.date
        ? Math.ceil((firstEvent.date - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        totalGuests,
        confirmedGuests,
        totalVendors,
        confirmedVendors,
        totalCreatives,
        completedCreatives,
        totalActivities: events.data?.length || 0,
        completedActivities: 0,
        budgetSpent,
        totalBudget,
        budgetSpentPercentage,
        daysUntilWedding,
        guestsByCategory: {},
        budgetByCategory: {},
        vendorsByStatus: {},
      };
    },
    enabled: !!clientId,
  });

  const { data: recentActivity } = useReactQuery({
    queryKey: ['recent-activity', clientId],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID not available');
      // This would fetch from an activity log table if available
      // For now, return empty array
      return [];
    },
    enabled: !!clientId,
  });

  const { data: upcomingEvents } = useReactQuery({
    queryKey: ['upcoming-events', clientId],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID not available');
      const now = Date.now();
      const { data, error } = await supabase
        .from('event_brief')
        .select('*')
        .eq('client_id', clientId!)
        .gte('date', now)
        .order('date', { ascending: true })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  const { data: alerts } = useReactQuery({
    queryKey: ['alerts', clientId],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID not available');
      // This would fetch from an alerts table if available
      // For now, return empty array
      return [];
    },
    enabled: !!clientId,
  });

  // Loading state
  if (userLoading) {
    return <PageLoader />;
  }

  // Not authenticated
  if (!currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Authentication Required</h2>
          <p className="text-muted-foreground mt-2">
            Please sign in to view your dashboard.
          </p>
        </div>
      </div>
    );
  }

  // Loading clients and stats
  if (!clients || !dashboardStats) {
    return <PageLoader />;
  }

  // No client found state
  if (!selectedClient || !clientId) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">No Wedding Found</h2>
          <p className="text-muted-foreground mt-2">
            Please create a wedding to view your dashboard.
          </p>
        </div>
      </div>
    );
  }

  // Calculate completion percentage
  const totalTasks =
    dashboardStats.totalGuests +
    dashboardStats.totalVendors +
    dashboardStats.totalCreatives +
    dashboardStats.totalActivities;

  const completedTasks =
    dashboardStats.confirmedGuests +
    dashboardStats.confirmedVendors +
    dashboardStats.completedCreatives +
    dashboardStats.completedActivities;

  const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Handle filter click - navigate to relevant page
  const handleFilterChange = (filter: string | null) => {
    if (!filter) return;

    switch (filter) {
      case 'guests':
        router.push('/dashboard/guests');
        break;
      case 'confirmed':
        router.push('/dashboard/guests?filter=confirmed');
        break;
      case 'budget':
        router.push('/dashboard/budget');
        break;
      case 'timeline':
        router.push('/dashboard/timeline');
        break;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Hero Section with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-100 via-primary-50 to-secondary-100 border-2 border-primary-300 p-6 sm:p-8 shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-200 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary-200 rounded-full blur-3xl opacity-50 translate-y-1/2 -translate-x-1/2" />

        <div className="relative">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-primary-900 break-words">
            Dashboard
          </h1>
          <p className="mt-2 sm:mt-3 text-base sm:text-lg font-medium text-primary-800 break-words">
            Welcome back! Here&apos;s what&apos;s happening with <span className="text-primary-950 font-semibold">{selectedClient.client_name}&apos;s</span> wedding.
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <DashboardStatsCards
        stats={{
          totalGuests: dashboardStats.totalGuests,
          confirmedGuests: dashboardStats.confirmedGuests,
          budgetSpentPercentage: dashboardStats.budgetSpentPercentage,
          daysUntilWedding: dashboardStats.daysUntilWedding,
        }}
        isLoading={false}
        onFilterChange={handleFilterChange}
      />

      {/* Quick Actions */}
      <QuickActions />

      {/* Alerts & Upcoming Events */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <AlertsPanel alerts={alerts || []} />
        <UpcomingEventsWidget events={upcomingEvents || []} />
      </div>

      {/* Charts Section */}
      <DashboardCharts
        guestsByCategory={dashboardStats.guestsByCategory}
        budgetByCategory={dashboardStats.budgetByCategory}
        vendorsByStatus={dashboardStats.vendorsByStatus}
        totalGuests={dashboardStats.totalGuests}
        confirmedGuests={dashboardStats.confirmedGuests}
        budgetSpent={dashboardStats.budgetSpent}
        totalBudget={dashboardStats.totalBudget}
      />

      {/* AI Insights & Recent Activity */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <AIInsightsPanel
          completionPercentage={completionPercentage}
          timelineStatus="on_track"
          budgetHealth={dashboardStats.budgetSpentPercentage > 90 ? 'warning' : 'good'}
        />
        <RecentActivity activities={recentActivity || []} />
      </div>
    </div>
  );
}
