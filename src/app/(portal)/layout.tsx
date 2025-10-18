import { UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Heart, Calendar, Users, MessageSquare, Home } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

async function getClientData(userId: string) {
  const supabase = createServerSupabaseClient();

  const { data: user } = await supabase
    .from('users')
    .select('company_id, company:companies(name)')
    .eq('clerk_id', userId)
    .maybeSingle() as { data: { company_id: string | null; company: { name: string } | null } | null };

  if (!user?.company_id) {
    return { companyName: null, weddingDate: null, daysUntilWedding: null };
  }

  const { data: client } = await supabase
    .from('clients')
    .select('wedding_date')
    .eq('company_id', user.company_id)
    .maybeSingle() as { data: { wedding_date: string | null } | null };

  let daysUntilWedding = null;
  if (client?.wedding_date) {
    const weddingDate = new Date(client.wedding_date);
    const today = new Date();
    const diffTime = weddingDate.getTime() - today.getTime();
    daysUntilWedding = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return {
    companyName: user.company?.name || null,
    weddingDate: client?.wedding_date || null,
    daysUntilWedding,
  };
}

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get Clerk user ID (not from Supabase auth - accessToken config doesn't support supabase.auth methods)
  const { userId } = await auth();
  const clientData = userId ? await getClientData(userId) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      {/* Client Portal Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/portal/dashboard" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-white fill-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-lg text-gray-900">
                    Wedding Portal
                  </span>
                  {clientData?.companyName && (
                    <span className="text-xs text-gray-500">
                      Planned by {clientData.companyName}
                    </span>
                  )}
                </div>
              </Link>
              {clientData && clientData.daysUntilWedding !== null && clientData.daysUntilWedding > 0 && (
                <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white border-0">
                  <Calendar className="h-3 w-3 mr-1" />
                  {clientData.daysUntilWedding} days to go!
                </Badge>
              )}
            </div>

            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/portal/dashboard"
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-rose-600 transition-colors"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/portal/wedding"
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-rose-600 transition-colors"
              >
                <Heart className="h-4 w-4" />
                My Wedding
              </Link>
              <Link
                href="/portal/guests"
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-rose-600 transition-colors"
              >
                <Users className="h-4 w-4" />
                Guests
              </Link>
              <Link
                href="/portal/messages"
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-rose-600 transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                Messages
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <UserButton afterSignOutUrl="/portal/sign-in" />
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
