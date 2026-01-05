import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/server';
import { db, eq, sql, desc } from '@/lib/db';
import { users, companies, clients } from '@/lib/db/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Building2, Users, UserCircle, TrendingUp } from 'lucide-react';

export default async function SuperAdminDashboardPage() {
  // Get BetterAuth session
  const { userId, user } = await getServerSession();

  if (!userId || !user) {
    redirect('/sign-in');
  }

  // Get role from BetterAuth user object
  const role = (user as any).role as string | undefined;

  // Verify super admin access
  if (role !== 'super_admin') {
    redirect('/dashboard');
  }

  // Fetch platform statistics using Drizzle
  const [companiesCountResult, usersCountResult, clientsCountResult, recentUsersResult] = await Promise.all([
    db.execute(sql`SELECT COUNT(*)::integer as count FROM companies`),
    db.execute(sql`SELECT COUNT(*)::integer as count FROM users`),
    db.execute(sql`SELECT COUNT(*)::integer as count FROM clients`),
    db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        created_at: users.createdAt,
        companyName: companies.name,
      })
      .from(users)
      .leftJoin(companies, eq(users.companyId, companies.id))
      .orderBy(desc(users.createdAt))
      .limit(10),
  ]);

  const totalCompanies = (companiesCountResult.rows[0] as { count: number })?.count || 0;
  const totalUsers = (usersCountResult.rows[0] as { count: number })?.count || 0;
  const totalClients = (clientsCountResult.rows[0] as { count: number })?.count || 0;
  const recentUsers = recentUsersResult.map(u => ({
    id: u.id,
    full_name: [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Unnamed User',
    email: u.email,
    role: u.role,
    created_at: u.created_at?.toISOString() || '',
    company: u.companyName ? { name: u.companyName } : null,
  }));

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card
          variant="glass"
          size="compact"
          className="group hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 border border-indigo-200/50 dark:border-indigo-800/30 shadow-lg shadow-indigo-500/10 hover:shadow-xl hover:shadow-indigo-500/20 bg-gradient-to-br from-white via-indigo-50/30 to-white dark:from-gray-900 dark:via-indigo-950/20 dark:to-gray-900"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Total Companies</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              {totalCompanies}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active wedding planning companies</p>
          </CardContent>
        </Card>

        <Card
          variant="glass"
          size="compact"
          className="group hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 border border-purple-200/50 dark:border-purple-800/30 shadow-lg shadow-purple-500/10 hover:shadow-xl hover:shadow-purple-500/20 bg-gradient-to-br from-white via-purple-50/30 to-white dark:from-gray-900 dark:via-purple-950/20 dark:to-gray-900"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                <Users className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Total Users</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {totalUsers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Company admins and staff</p>
          </CardContent>
        </Card>

        <Card
          variant="glass"
          size="compact"
          className="group hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 border border-pink-200/50 dark:border-pink-800/30 shadow-lg shadow-pink-500/10 hover:shadow-xl hover:shadow-pink-500/20 bg-gradient-to-br from-white via-pink-50/30 to-white dark:from-gray-900 dark:via-pink-950/20 dark:to-gray-900"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg shadow-pink-500/30 group-hover:scale-110 transition-transform">
                <UserCircle className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Total Clients</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
              {totalClients}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Wedding couples being served</p>
          </CardContent>
        </Card>

        <Card
          variant="glass"
          size="compact"
          className="group hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 border border-emerald-200/50 dark:border-emerald-800/30 shadow-lg shadow-emerald-500/10 hover:shadow-xl hover:shadow-emerald-500/20 bg-gradient-to-br from-white via-emerald-50/30 to-white dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Growth Rate</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              +12%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Month over month</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Signups */}
      <Card
        variant="glass"
        className="border border-primary-200/50 dark:border-primary-800/30 shadow-lg bg-gradient-to-br from-white via-primary-50/10 to-white dark:from-gray-900 dark:via-primary-950/10 dark:to-gray-900"
      >
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
            Recent Signups
          </CardTitle>
          <CardDescription>Last 10 users who joined the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {recentUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No recent signups</p>
          ) : (
            <div className="space-y-4">
              {recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4 last:border-0 hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{user.full_name || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground capitalize">
                        {user.role?.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.company?.name || 'No company'}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground w-24 text-right">
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
      <Card
        variant="glass"
        className="border border-secondary-200/50 dark:border-secondary-800/30 shadow-lg bg-gradient-to-br from-white via-secondary-50/10 to-white dark:from-gray-900 dark:via-secondary-950/10 dark:to-gray-900"
      >
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
            Quick Actions
          </CardTitle>
          <CardDescription>Manage platform resources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 shadow-lg shadow-indigo-500/30 hover:shadow-xl transition-all">
              <Link href="/superadmin/companies">
                View All Companies
              </Link>
            </Button>
            <Button asChild variant="outline" className="hover:bg-purple-50 dark:hover:bg-purple-950/30 border-purple-200 dark:border-purple-800/50 hover:border-purple-300 transition-all">
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
