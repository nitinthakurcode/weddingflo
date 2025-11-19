import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Heart, Calendar, Users, MessageSquare, Clock, MapPin } from 'lucide-react';

export default async function PortalDashboardPage() {
  // Get Clerk user ID (not from Supabase auth - accessToken config doesn't support supabase.auth methods)
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const supabase = createServerSupabaseClient();

  // Fetch user role from database
  const { data: currentUser } = await supabase
    .from('users')
    .select('role, company_id, full_name, company:companies(name)')
    .eq('clerk_id', userId)
    .maybeSingle() as { data: { role: string; company_id: string | null; full_name: string | null; company: { name: string } | null } | null };

  // Verify client access
  if (!currentUser || currentUser.role !== 'client_user') {
    redirect('/dashboard');
  }

  // Fetch current user's data
  const user = currentUser;

  if (!user?.company_id) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No company associated with your account.</p>
      </div>
    );
  }

  // Fetch client data
  const { data: client } = await supabase
    .from('clients')
    .select(`
      id,
      partner1_name,
      partner2_name,
      wedding_date,
      wedding_time,
      venue_name,
      venue_address,
      notes
    `)
    .eq('company_id', user.company_id)
    .maybeSingle() as { data: { id: string; partner1_name: string | null; partner2_name: string | null; wedding_date: string | null; wedding_time: string | null; venue_name: string | null; venue_address: string | null; notes: string | null } | null };

  // Fetch guest count
  const { count: guestCount } = await supabase
    .from('guests')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', user.company_id);

  // Calculate days until wedding
  let daysUntilWedding = null;
  let weddingDateFormatted = null;
  if (client?.wedding_date) {
    const weddingDate = new Date(client.wedding_date);
    weddingDateFormatted = weddingDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const today = new Date();
    const diffTime = weddingDate.getTime() - today.getTime();
    daysUntilWedding = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  const coupleNames = client?.partner1_name && client?.partner2_name
    ? `${client.partner1_name} & ${client.partner2_name}`
    : 'Your Wedding';

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Welcome, {user.full_name || 'Friend'}!
        </h1>
        <p className="text-xl text-gray-600">
          Your wedding planning journey with <span className="font-semibold text-rose-600">{user.company?.name}</span>
        </p>
      </div>

      {/* Wedding Countdown */}
      {daysUntilWedding !== null && (
        <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 mb-2">
                <Heart className="h-8 w-8 text-white fill-white" />
              </div>
              <div>
                <p className="text-5xl font-bold text-rose-600 mb-2">
                  {daysUntilWedding > 0 ? daysUntilWedding : 0}
                </p>
                <p className="text-lg text-gray-700">
                  {daysUntilWedding > 0 ? 'days until your special day' : 'Your wedding is today!'}
                </p>
                {weddingDateFormatted && (
                  <p className="text-sm text-gray-600 mt-2">{weddingDateFormatted}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Guest Count
            </CardTitle>
            <Users className="h-5 w-5 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{guestCount || 0}</div>
            <p className="text-xs text-gray-600 mt-1">People invited</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Venue
            </CardTitle>
            <MapPin className="h-5 w-5 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-gray-900 truncate">
              {client?.venue_name || 'TBD'}
            </div>
            <p className="text-xs text-gray-600 mt-1 truncate">
              {client?.venue_address || 'Location pending'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Wedding Time
            </CardTitle>
            <Clock className="h-5 w-5 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-gray-900">
              {client?.wedding_time || 'TBD'}
            </div>
            <p className="text-xs text-gray-600 mt-1">Ceremony start</p>
          </CardContent>
        </Card>
      </div>

      {/* Wedding Details */}
      {client && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-600" />
              {coupleNames}
            </CardTitle>
            <CardDescription>Your wedding details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Partner 1</p>
                <p className="text-gray-900">{client.partner1_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Partner 2</p>
                <p className="text-gray-900">{client.partner2_name || 'N/A'}</p>
              </div>
            </div>
            {client.notes && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Notes from your planner</p>
                <p className="text-gray-600 text-sm">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Navigate to key features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="bg-rose-600 hover:bg-rose-700">
              <Link href="/portal/wedding" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                View Wedding Details
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/portal/guests" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Manage Guests
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/portal/messages" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Contact Planner
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
