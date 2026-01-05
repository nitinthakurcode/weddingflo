import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ServerThemeScript } from '@/components/theme/server-theme-script';
import { getServerSession } from '@/lib/auth/server';
import { db, eq } from '@/lib/db';
import { user as userTable } from '@/lib/db/schema/auth';

// Force dynamic rendering for all dashboard pages
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, user } = await getServerSession();

  // Get locale from headers for proper redirects
  const headersList = await headers();
  const url = headersList.get('x-url') || headersList.get('referer') || '';
  const localeMatch = url.match(/\/([a-z]{2})\//);
  const locale = localeMatch ? localeMatch[1] : 'en';

  // Not authenticated - redirect to sign-in
  if (!userId || !user) {
    redirect(`/${locale}/sign-in`);
    // Return null to prevent layout flash during redirect
    return null;
  }

  // Get role and companyId from BetterAuth user object
  let role = (user as any).role as string | undefined;
  let companyId = (user as any).companyId as string | undefined;

  // Debug: Log what we're getting from session
  console.log('[Dashboard Layout] Session data:', {
    userId,
    role,
    companyId,
    email: user.email,
  });

  // If session is missing role/companyId, check database directly
  // This handles the case where session cache is stale after sync
  if (!role || !companyId) {
    console.log('[Dashboard Layout] Session missing role/companyId, checking database...');

    try {
      const [dbUser] = await db
        .select({ role: userTable.role, companyId: userTable.companyId })
        .from(userTable)
        .where(eq(userTable.id, userId))
        .limit(1);

      if (dbUser) {
        role = dbUser.role || undefined;
        companyId = dbUser.companyId || undefined;
        console.log('[Dashboard Layout] Fresh DB data:', { role, companyId });
      }
    } catch (dbError) {
      console.error('[Dashboard Layout] DB lookup error:', dbError);
    }
  }

  // User is authenticated but missing role/company metadata
  // This happens when user hasn't completed onboarding
  // Redirect to sync page (outside dashboard layout) to prevent loop
  if (!role || !companyId) {
    console.log('[Dashboard Layout] Still missing role/companyId after DB check, redirecting to sync');
    redirect(`/${locale}/sync`);
    return null;
  }

  // Check if user has access to this section (company_admin or staff only)
  // Other roles should use their specific routes
  if (role && role !== 'company_admin' && role !== 'staff') {
    // If super_admin, redirect to superadmin dashboard
    if (role === 'super_admin') {
      redirect(`/${locale}/superadmin`);
      return null;
    }
    // If client_user, redirect to client portal
    if (role === 'client_user') {
      redirect(`/${locale}/portal`);
      return null;
    }
    // Unknown role - redirect to sign-in
    redirect(`/${locale}/sign-in`);
    return null;
  }

  // Onboarding check (only for company_admin, using user data - NO extra database query!)
  if (role === 'company_admin') {
    // Check if we're already on the onboarding page to prevent redirect loop
    const pathname = headersList.get('x-invoke-path') || '';

    if (!pathname.includes('/onboard')) {
      // ✅ Read from user object (fast, no DB query)
      const onboardingCompleted = (user as any).onboardingCompleted;

      // Redirect to onboarding if not completed
      // Note: If onboardingCompleted is undefined (legacy users), assume completed to avoid breaking existing accounts
      if (onboardingCompleted === false) {
        redirect(`/${locale}/dashboard/onboard`);
        return null;
      }
    }
  }

  return (
    <>
      {/* Server-side theme injection - NO FOUC on production! */}
      <ServerThemeScript />

      {/* Main container with theme-aware background (60-30-10 Rule) */}
      <div className="flex h-screen overflow-hidden bg-page">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 lg:p-8">
            {/* Theme-aware decorative gradient orbs (Gen-Z aesthetic, white-label compatible) */}
            <div
              className="fixed top-20 right-20 w-96 h-96 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse"
              style={{
                background: 'hsl(var(--primary) / 0.08)',
                animationDuration: '8s'
              }}
            />
            <div
              className="fixed bottom-20 left-20 w-80 h-80 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse"
              style={{
                background: 'hsl(var(--accent) / 0.08)',
                animationDuration: '12s'
              }}
            />
            <div
              className="fixed top-1/2 left-1/3 w-64 h-64 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse"
              style={{
                background: 'hsl(var(--secondary) / 0.06)',
                animationDuration: '15s'
              }}
            />
            <div className="relative z-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
