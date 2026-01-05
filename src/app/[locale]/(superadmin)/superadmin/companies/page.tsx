import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/server';
import { db, eq, sql, desc } from '@/lib/db';
import { companies, users, clients } from '@/lib/db/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, UserCircle } from 'lucide-react';

export default async function SuperAdminCompaniesPage() {
  // Get BetterAuth session
  const { userId, user } = await getServerSession();

  if (!userId) {
    redirect('/sign-in');
  }

  // Get role from user object
  const role = (user as any).role;

  // Verify super admin access
  if (!role || role !== 'super_admin') {
    redirect('/dashboard');
  }

  // Fetch all companies with counts using Drizzle
  const companiesData = await db
    .select({
      id: companies.id,
      name: companies.name,
      subscriptionTier: companies.subscriptionTier,
      subscriptionStatus: companies.subscriptionStatus,
      createdAt: companies.createdAt,
    })
    .from(companies)
    .orderBy(desc(companies.createdAt));

  // Get user and client counts for each company
  const companiesList = await Promise.all(
    companiesData.map(async (company) => {
      const [userCountResult, clientCountResult, adminResult] = await Promise.all([
        db.execute(sql`SELECT COUNT(*)::integer as count FROM users WHERE company_id = ${company.id}`),
        db.execute(sql`SELECT COUNT(*)::integer as count FROM clients WHERE company_id = ${company.id}`),
        db.execute(sql`SELECT email FROM users WHERE company_id = ${company.id} AND role = 'company_admin' LIMIT 1`),
      ]);

      const adminEmail = (adminResult.rows[0] as { email: string } | undefined)?.email || null;

      return {
        id: company.id,
        name: company.name,
        email: adminEmail,
        subscription_tier: company.subscriptionTier,
        subscription_status: company.subscriptionStatus,
        created_at: company.createdAt?.toISOString() || '',
        userCount: (userCountResult.rows[0] as { count: number })?.count || 0,
        clientCount: (clientCountResult.rows[0] as { count: number })?.count || 0,
      };
    })
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
            All Companies
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage all wedding planning companies on the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-lg py-2 px-4 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 mr-2">
              <Building2 className="h-3 w-3 text-white" />
            </div>
            {companiesList.length} Companies
          </Badge>
        </div>
      </div>

      {/* Companies Table */}
      <Card
        variant="glass"
        className="border border-indigo-200/50 dark:border-indigo-800/30 shadow-lg shadow-indigo-500/10 bg-gradient-to-br from-white via-indigo-50/20 to-white dark:from-gray-900 dark:via-indigo-950/10 dark:to-gray-900"
      >
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Company Directory
          </CardTitle>
          <CardDescription>
            All registered companies with their subscription details and usage statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {companiesList.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No companies registered yet</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Users</TableHead>
                    <TableHead className="text-center">Clients</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companiesList.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-white" />
                          </div>
                          {company.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">{company.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            company.subscription_tier === 'enterprise'
                              ? 'border-purple-500 text-purple-700 bg-purple-50'
                              : company.subscription_tier === 'professional'
                              ? 'border-indigo-500 text-indigo-700 bg-indigo-50'
                              : company.subscription_tier === 'starter'
                              ? 'border-blue-500 text-blue-700 bg-blue-50'
                              : 'border-gray-500 text-gray-700 bg-gray-50'
                          }
                        >
                          {company.subscription_tier || 'free'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            company.subscription_status === 'active'
                              ? 'border-green-500 text-green-700 bg-green-50'
                              : company.subscription_status === 'trialing'
                              ? 'border-blue-500 text-blue-700 bg-blue-50'
                              : 'border-red-500 text-red-700 bg-red-50'
                          }
                        >
                          {company.subscription_status || 'inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-700">
                          <Users className="h-4 w-4" />
                          <span className="font-medium">{company.userCount}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-700">
                          <UserCircle className="h-4 w-4" />
                          <span className="font-medium">{company.clientCount}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {new Date(company.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        >
                          Impersonate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
