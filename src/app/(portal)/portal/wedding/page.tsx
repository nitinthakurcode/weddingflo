import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Calendar, Clock, MapPin, FileText, Mail, Phone } from 'lucide-react';

export default async function PortalWeddingPage() {
  // Get Clerk user ID (not from Supabase auth - accessToken config doesn't support supabase.auth methods)
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const supabase = createServerSupabaseClient();

  // Fetch user role from database
  const { data: currentUser } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('clerk_id', userId)
    .maybeSingle();

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

  // Fetch client/wedding data
  const { data: client } = await supabase
    .from('clients')
    .select(`
      id,
      partner1_name,
      partner2_name,
      email,
      phone,
      wedding_date,
      wedding_time,
      venue_name,
      venue_address,
      notes,
      budget,
      status
    `)
    .eq('company_id', user.company_id)
    .maybeSingle();

  if (!client) {
    return (
      <div className="text-center py-12">
        <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">No wedding details found</p>
        <p className="text-gray-400 text-sm mt-2">Contact your planner to set up your wedding details</p>
      </div>
    );
  }

  const coupleNames = client.partner1_name && client.partner2_name
    ? `${client.partner1_name} & ${client.partner2_name}`
    : 'Your Wedding';

  // Format wedding date
  let weddingDateFormatted = null;
  if (client.wedding_date) {
    const weddingDate = new Date(client.wedding_date);
    weddingDateFormatted = weddingDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 mb-4">
          <Heart className="h-8 w-8 text-white fill-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900">{coupleNames}</h1>
        <p className="text-lg text-gray-600">Your wedding details</p>
      </div>

      {/* Wedding Date & Time */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-900">
              <Calendar className="h-5 w-5 text-rose-600" />
              Wedding Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">
              {weddingDateFormatted || 'Date to be determined'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-pink-200 bg-gradient-to-br from-pink-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-pink-900">
              <Clock className="h-5 w-5 text-pink-600" />
              Wedding Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">
              {client.wedding_time || 'Time to be determined'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Venue Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-rose-600" />
            Venue
          </CardTitle>
          <CardDescription>Where your special day will take place</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Venue Name</p>
            <p className="text-xl font-semibold text-gray-900">
              {client.venue_name || 'Venue to be determined'}
            </p>
          </div>
          {client.venue_address && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Address</p>
              <p className="text-gray-900">{client.venue_address}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Couple Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-600" />
            Couple Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Partner 1</p>
              <p className="text-lg font-semibold text-gray-900">
                {client.partner1_name || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Partner 2</p>
              <p className="text-lg font-semibold text-gray-900">
                {client.partner2_name || 'N/A'}
              </p>
            </div>
          </div>

          <div className="border-t pt-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Contact Information</p>
            <div className="space-y-2">
              {client.email && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="h-4 w-4 text-rose-600" />
                  <span>{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone className="h-4 w-4 text-rose-600" />
                  <span>{client.phone}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      {client.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-rose-600" />
              Notes from Your Planner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{client.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Budget & Status */}
      <div className="grid gap-6 md:grid-cols-2">
        {client.budget && (
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-700">Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                ${client.budget.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-700">Planning Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900 capitalize">
              {client.status || 'Active'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
