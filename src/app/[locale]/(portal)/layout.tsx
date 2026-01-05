import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/server';
import { BottomNav } from './_components/bottom-nav';
import { UserMenu } from '@/components/auth/user-menu';
import { Heart } from 'lucide-react';

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, user } = await getServerSession();

  if (!userId || !user) {
    redirect('/sign-in');
  }

  const role = (user as any).role as string | undefined;

  if (role !== 'client_user') {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50/50 via-background to-lavender-50/30 dark:from-rose-950/10 dark:via-background dark:to-lavender-950/10">
      {/* Animated background orbs for portal - More playful for Gen-Z */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-5 w-40 h-40 bg-rose-300/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-32 right-5 w-56 h-56 bg-lavender-300/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/3 right-1/4 w-32 h-32 bg-pink-200/15 rounded-full blur-2xl animate-float" style={{ animationDelay: '5s' }} />
      </div>

      {/* Gen Z Header - Ultra Glassmorphism */}
      <header className="h-14 backdrop-blur-xl bg-background/60 border-b border-white/10 dark:border-white/5 sticky top-0 z-40 shadow-sm">
        {/* Subtle gradient accent line */}
        <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-rose-400/50 to-transparent" />

        <div className="flex items-center justify-between h-full px-4">
          {/* Spacer */}
          <div className="flex-1" />

          {/* Centered Logo - Gen Z Aura Style */}
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-lavender-500 flex items-center justify-center shadow-lg shadow-rose-500/30 hover:scale-110 hover:shadow-rose-500/50 transition-all duration-300 cursor-pointer">
              <Heart className="h-4 w-4 text-white fill-white" />
            </div>
            <span className="font-extrabold text-lg bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">WeddingFlo</span>
          </div>

          {/* User Menu */}
          <div className="flex-1 flex justify-end">
            <div className="scale-90 origin-right">
              <UserMenu afterSignOutUrl="/sign-in" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Mobile Optimized with safe areas */}
      <main className="relative z-10 min-h-[calc(100vh-var(--bottom-nav-height,72px)-56px)] p-4 pb-24">
        {children}
      </main>

      {/* Gen Z Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
