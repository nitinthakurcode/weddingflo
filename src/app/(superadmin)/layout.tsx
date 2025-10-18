import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Super Admin Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/superadmin/dashboard" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">SA</span>
                </div>
                <span className="font-semibold text-lg text-gray-900">
                  WeddingFlow Pro
                </span>
              </Link>
              <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0">
                Super Admin Mode
              </Badge>
            </div>

            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/superadmin/dashboard"
                className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
              >
                Platform Overview
              </Link>
              <Link
                href="/superadmin/companies"
                className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
              >
                Companies
              </Link>
              <Link
                href="/superadmin/impersonate"
                className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
              >
                Impersonate
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <UserButton afterSignOutUrl="/sign-in" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
