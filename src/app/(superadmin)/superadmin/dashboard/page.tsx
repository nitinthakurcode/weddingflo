import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Building2, Users, UserCircle, TrendingUp } from 'lucide-react';

export default async function SuperAdminDashboardPage() {
  // Get Clerk user ID (not from Supabase auth - accessToken config doesn't support supabase.auth methods)
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const supabase = createServerSupabaseClient();

  // Fetch user role from database
  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('clerk_id', userId)
    .maybeSingle() as { data: { role: string } | null };

  // Verify super admin access
  if (!currentUser || currentUser.role !== 'super_admin') {
    redirect('/dashboard');
  }

  // Fetch platform statistics
  const recentUsersPromise = supabase
    .from('users')
    .select('id, full_name, email, role, created_at, company:companies(name)')
    .order('created_at', { ascending: false })
    .limit(10);

  const [companiesResult, usersResult, clientsResult, recentUsersResult] = await Promise.all([
    supabase.from('companies').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    recentUsersPromise as unknown as Promise<{ data: Array<{ id: string; full_name: string | null; email: string; role: string; created_at: string; company: { name: string } | null }> | null; error: any }>,
  ]);

  const totalCompanies = companiesResult.count || 0;
  const totalUsers = usersResult.count || 0;
  const totalClients = clientsResult.count || 0;
  const recentUsers = (recentUsersResult.data || []) as Array<{ id: string; full_name: string | null; email: string; role: string; created_at: string; company: { name: string } | null }>;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Platform Overview</h1>
        <p className="text-gray-600">
          Monitor and manage all companies, users, and platform activity
        </p>
      </div>

      {/* Statistics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Total Companies
            </CardTitle>
            <Building2 className="h-5 w-5 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-900">{totalCompanies}</div>
            <p className="text-xs text-gray-600 mt-1">Active wedding planning companies</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Total Users
            </CardTitle>
            <Users className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">{totalUsers}</div>
            <p className="text-xs text-gray-600 mt-1">Company admins and staff</p>
          </CardContent>
        </Card>

        <Card className="border-pink-200 bg-gradient-to-br from-pink-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Total Clients
            </CardTitle>
            <UserCircle className="h-5 w-5 text-pink-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-pink-900">{totalClients}</div>
            <p className="text-xs text-gray-600 mt-1">Wedding couples being served</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Growth Rate
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">+12%</div>
            <p className="text-xs text-gray-600 mt-1">Month over month</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Signups */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Signups</CardTitle>
          <CardDescription>Last 10 users who joined the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {recentUsers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent signups</p>
          ) : (
            <div className="space-y-4">
              {recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-0"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{user.full_name || 'N/A'}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700 capitalize">
                        {user.role?.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {user.company?.name || 'No company'}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 w-24 text-right">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage platform resources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
              <Link href="/superadmin/companies">
                View All Companies
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/superadmin/impersonate">
                Impersonate User
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
