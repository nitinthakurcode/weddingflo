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

  if (!userId) {
    redirect('/en/sign-in');
  }

  const role = sessionClaims?.metadata?.role as string | undefined;
  const companyId = sessionClaims?.metadata?.company_id as string | undefined;

  // Check if user has access to this section
  if (role !== 'company_admin' && role !== 'staff') {
    redirect('/en/sign-in');
  }

  // Onboarding check (only for company_admin, using session claims - NO database query!)
  if (role === 'company_admin') {
    // Check if we're already on the onboarding page to prevent redirect loop
    const headersList = await headers();
    const pathname = headersList.get('x-invoke-path') || '';

    if (!pathname.includes('/onboard')) {
      // ✅ Read from session claims (fast, no DB query)
      const metadata = sessionClaims?.metadata as { onboarding_completed?: boolean } | undefined;
      const onboardingCompleted = metadata?.onboarding_completed;

      // Redirect to onboarding if not completed
      // Note: If onboarding_completed is undefined (legacy users), assume completed to avoid breaking existing accounts
      if (onboardingCompleted === false) {
        // Get locale from URL or default to 'en'
        const url = headersList.get('x-url') || headersList.get('referer') || '';
        const localeMatch = url.match(/\/([a-z]{2})\//);
        const locale = localeMatch ? localeMatch[1] : 'en';
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
