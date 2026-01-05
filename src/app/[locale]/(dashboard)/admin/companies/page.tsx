'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { useSession } from '@/lib/auth-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Building2, Plus, Users, Calendar, TrendingUp } from 'lucide-react';
import { useIsSuperAdmin } from '@/lib/permissions/can';
import { useRouter } from 'next/navigation';

export default function CompaniesPage() {
  const isSuperAdmin = useIsSuperAdmin();
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const utils = trpc.useUtils();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');

  // Get all companies via tRPC (super admin only)
  const { data: companies, isLoading } = trpc.companies.getAll.useQuery(undefined, {
    enabled: !!session?.user && isSuperAdmin === true,
  });

  // Create company mutation
  const createMutation = trpc.companies.create.useMutation({
    onSuccess: () => {
      utils.companies.getAll.invalidate();
      toast({
        title: 'Company created!',
        description: `${newCompanyName} has been created successfully.`,
      });
      setNewCompanyName('');
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create company. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Redirect if not super admin
  if (isSuperAdmin === false) {
    router.push('/dashboard');
    return null;
  }

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a company name',
        variant: 'destructive',
      });
      return;
    }

    await createMutation.mutateAsync({ name: newCompanyName.trim() });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies Management</h1>
          <p className="text-muted-foreground">
            Manage all companies on the platform
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Company
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Company</DialogTitle>
              <DialogDescription>
                Add a new company to the platform
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  placeholder="Acme Wedding Co."
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateCompany} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Company'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active on platform
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companies?.reduce((sum: number, c: any) => sum + (c.usage_stats?.total_users || 0), 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all companies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companies?.reduce((sum: number, c: any) => sum + (c.usage_stats?.active_weddings || 0), 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Companies</CardTitle>
          <CardDescription>
            View and manage companies with data isolation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Subdomain</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead>Storage</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Loading companies...
                  </TableCell>
                </TableRow>
              ) : companies && companies.length > 0 ? (
                companies.map((company: any) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <div className="font-medium">{company.company_name}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {company.subdomain}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          company.subscription?.status === 'active'
                            ? 'default'
                            : company.subscription?.status === 'trial'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {company.subscription?.tier || 'free'} - {company.subscription?.status || 'inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {company.usage_stats?.active_weddings || 0}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          of {company.usage_stats?.total_weddings || 0} total
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(company.usage_stats?.total_guests || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {company.usage_stats?.storage_used_mb || 0} MB
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(company.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No companies found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Multi-Tenant Isolation Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Multi-Tenant Data Isolation
          </CardTitle>
          <CardDescription>
            How data is isolated between companies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Database Level</h4>
              <p className="text-sm text-muted-foreground">
                Every data record includes a <code className="text-xs bg-muted px-1 py-0.5 rounded">company_id</code> field that ensures companies can only access their own data.
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Clients</li>
                <li>Events</li>
                <li>Guests</li>
                <li>Vendors</li>
                <li>Budgets</li>
                <li>Messages</li>
                <li>Notifications</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Access Control</h4>
              <p className="text-sm text-muted-foreground">
                Role-based permissions ensure users can only perform actions within their company&apos;s scope.
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>Super Admin:</strong> Platform-wide access</li>
                <li><strong>Company Admin:</strong> Full company access</li>
                <li><strong>Staff:</strong> Event/client management</li>
                <li><strong>Client Viewer:</strong> Read-only access</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
