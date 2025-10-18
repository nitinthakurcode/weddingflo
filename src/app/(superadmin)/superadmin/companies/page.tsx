import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
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
    .maybeSingle();

  // Verify super admin access
  if (!currentUser || currentUser.role !== 'super_admin') {
    redirect('/dashboard');
  }

  // Fetch all companies with their user and client counts
  const { data: companies, error } = await supabase
    .from('companies')
    .select(`
      id,
      name,
      email,
      subscription_tier,
      subscription_status,
      created_at,
      users:users(count),
      clients:clients(count)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching companies:', error);
  }

  const companiesList = companies || [];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">All Companies</h1>
          <p className="text-gray-600">
            Manage all wedding planning companies on the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-lg py-2 px-4">
            <Building2 className="h-4 w-4 mr-2" />
            {companiesList.length} Companies
          </Badge>
        </div>
      </div>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Company Directory</CardTitle>
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
                  {companiesList.map((company) => {
                    // Count users and clients
                    const userCount = Array.isArray(company.users)
                      ? company.users.length
                      : (company.users as any)?.count || 0;
                    const clientCount = Array.isArray(company.clients)
                      ? company.clients.length
                      : (company.clients as any)?.count || 0;

                    return (
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
                              company.subscription_tier === 'premium'
                                ? 'border-purple-500 text-purple-700 bg-purple-50'
                                : company.subscription_tier === 'pro'
                                ? 'border-indigo-500 text-indigo-700 bg-indigo-50'
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
                            <span className="font-medium">{userCount}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1 text-gray-700">
                            <UserCircle className="h-4 w-4" />
                            <span className="font-medium">{clientCount}</span>
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
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
