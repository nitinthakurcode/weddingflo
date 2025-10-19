import { redirect } from 'next/navigation';
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
    redirect('/sign-in');
  }

  const role = sessionClaims?.metadata?.role as string | undefined;

  // Check if user has access to this section
  if (role !== 'company_admin' && role !== 'staff') {
    redirect('/sign-in');
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
