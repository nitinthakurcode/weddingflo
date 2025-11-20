import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ServerThemeScript } from '@/components/theme/server-theme-script';
import { auth } from '@clerk/nextjs/server';

// Force dynamic rendering for all dashboard pages
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, sessionClaims } = await auth();

  // Get locale from headers for proper redirects
  const headersList = await headers();
  const url = headersList.get('x-url') || headersList.get('referer') || '';
  const localeMatch = url.match(/\/([a-z]{2})\//);
  const locale = localeMatch ? localeMatch[1] : 'en';

  // Not authenticated - redirect to sign-in
  if (!userId) {
    redirect(`/${locale}/sign-in`);
  }

  // Check both paths for compatibility (native integration uses 'metadata', old JWT template uses 'publicMetadata')
  const metadata = sessionClaims?.metadata as { role?: string; company_id?: string } | undefined;
  const publicMetadata = (sessionClaims as any)?.publicMetadata as { role?: string; company_id?: string } | undefined;

  const role = metadata?.role || publicMetadata?.role as string | undefined;
  const companyId = metadata?.company_id || publicMetadata?.company_id as string | undefined;

  // Debug: Log what we're getting
  console.log('[Dashboard Layout] Session claims:', {
    hasMetadata: !!metadata,
    hasPublicMetadata: !!publicMetadata,
    role,
    companyId,
    rawClaims: JSON.stringify(sessionClaims).slice(0, 200)
  });

  // User is authenticated but missing role/company metadata
  // This happens when webhook hasn't fired yet or failed
  // Redirect to sync page (outside dashboard layout) to prevent loop
  if (!role || !companyId) {
    redirect(`/${locale}/sync`);
  }

  // Check if user has access to this section (company_admin or staff only)
  // super_admin should use /superadmin routes
  if (role && role !== 'company_admin' && role !== 'staff') {
    // If super_admin, redirect to superadmin dashboard
    if (role === 'super_admin') {
      redirect(`/${locale}/superadmin`);
    }
    // Unknown role - redirect to sync page
    redirect(`/${locale}/dashboard/sync`);
  }

  // Onboarding check (only for company_admin, using session claims - NO database query!)
  if (role === 'company_admin') {
    // Check if we're already on the onboarding page to prevent redirect loop
    const pathname = headersList.get('x-invoke-path') || '';

    if (!pathname.includes('/onboard')) {
      // ✅ Read from session claims (fast, no DB query)
      const metadata = sessionClaims?.metadata as { onboarding_completed?: boolean } | undefined;
      const onboardingCompleted = metadata?.onboarding_completed;

      // Redirect to onboarding if not completed
      // Note: If onboarding_completed is undefined (legacy users), assume completed to avoid breaking existing accounts
      if (onboardingCompleted === false) {
        redirect(`/${locale}/dashboard/onboard`);
      }
    }
  }

  return (
    <>
      {/* Server-side theme injection - NO FOUC on production! */}
      <ServerThemeScript />

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 p-3 sm:p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
