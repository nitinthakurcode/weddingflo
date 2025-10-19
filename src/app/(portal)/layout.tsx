import { UserButton } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { BottomNav } from './_components/bottom-nav';

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const role = sessionClaims?.metadata?.role as string | undefined;

  if (role !== 'client_user') {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header - Mobile-First */}
      <header className="h-14 border-b bg-white shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between h-full px-4">
          {/* Centered Logo/App Name */}
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <span className="font-semibold text-lg text-gray-900">WeddingFlow</span>
          </div>
          <div className="flex-1 flex justify-end">
            {/* Small UserButton */}
            <div className="scale-75">
              <UserButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area - Push bottom nav down */}
      <main className="min-h-[calc(100vh-120px)] p-4">
        {children}
      </main>

      {/* Bottom Navigation - Fixed at bottom */}
      <BottomNav />
    </div>
  );
}
