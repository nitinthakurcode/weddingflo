'use client';

import { useQuery } from 'convex/react';
import dynamic from 'next/dynamic';
import { api } from '@/convex/_generated/api';
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
  const { isSignedIn, isLoaded: clerkLoaded } = useUser();

  // Get current user and their clients
  const currentUser = useQuery(api.users.getCurrent);

  // If Clerk says user is signed in but Convex doesn't have the user, redirect to onboarding
  useEffect(() => {
    if (clerkLoaded && isSignedIn && currentUser === null) {
      router.push('/onboard');
    }
  }, [clerkLoaded, isSignedIn, currentUser, router]);
  const clients = useQuery(
    api.clients.list,
    currentUser?.company_id ? { companyId: currentUser.company_id } : 'skip'
  );

  // Use first client for now
  const selectedClient = clients?.[0];
  const clientId = selectedClient?._id;

  // Fetch dashboard data
  const dashboardStats = useQuery(
    api.dashboard.getDashboardStats,
    clientId ? { clientId } : 'skip'
  );
  const recentActivity = useQuery(
    api.dashboard.getRecentActivity,
    clientId ? { clientId, limit: 10 } : 'skip'
  );
  const upcomingEvents = useQuery(
    api.dashboard.getUpcomingEvents,
    clientId ? { clientId, limit: 5 } : 'skip'
  );
  const alerts = useQuery(
    api.dashboard.getAlerts,
    clientId ? { clientId } : 'skip'
  );

  // Loading state
  if (currentUser === undefined) {
    return <PageLoader />;
  }

  // Not authenticated
  if (currentUser === null) {
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
  if (clients === undefined || dashboardStats === undefined) {
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
