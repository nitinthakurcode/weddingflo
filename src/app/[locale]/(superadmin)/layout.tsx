import { Link } from '@/lib/navigation';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/server';
import { LayoutDashboard, Building2, Users, Settings } from 'lucide-react';
import { UserMenu } from '@/components/auth/user-menu';

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, user } = await getServerSession();

  if (!userId || !user) {
    redirect('/sign-in');
  }

  const role = (user as any).role as string | undefined;

  if (role !== 'super_admin') {
    redirect('/sign-in');
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Desktop only (hidden on mobile < 768px) */}
      <aside className="hidden md:flex w-60 bg-gray-900 flex-col sticky top-0 h-screen">
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <Link href="/superadmin/dashboard" className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold">SA</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-white">WeddingFlo</span>
              <span className="text-xs text-indigo-400 font-medium">Super Admin</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <Link
            href="/superadmin/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </Link>
          <Link
            href="/superadmin/companies"
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
          >
            <Building2 className="h-5 w-5" />
            Companies
          </Link>
          <Link
            href="/superadmin/users"
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
          >
            <Users className="h-5 w-5" />
            Users
          </Link>
          <Link
            href="/superadmin/settings"
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>
        </nav>

        {/* User Button */}
        <div className="p-4 border-t border-gray-800">
          <UserMenu afterSignOutUrl="/sign-in" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 md:px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
