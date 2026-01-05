'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Building2, Loader2, Save } from 'lucide-react';

export default function CompanyPage() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const companyId = (session?.user as any)?.companyId as string | undefined;

  const [companyName, setCompanyName] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch company data using tRPC
  const { data: company, isLoading } = trpc.companies.getCurrent.useQuery(
    undefined,
    { enabled: !!session?.user && !!companyId }
  );

  useEffect(() => {
    if (company) {
      setCompanyName(company.name);
      setCustomDomain(company.subdomain || '');
    }
  }, [company]);

  // Update company mutation using tRPC
  const updateMutation = trpc.companies.update.useMutation({
    onSuccess: () => {
      toast({
        title: 'Company updated',
        description: 'Your company settings have been saved successfully.',
      });
    },
    onError: (error) => {
      console.error('Failed to update company:', error);
      toast({
        title: 'Error',
        description: 'Failed to save company settings. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyId) return;

    setIsSaving(true);

    try {
      await updateMutation.mutateAsync({
        name: companyName,
        subdomain: customDomain || undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Company not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-mocha-900 to-mocha-600 dark:from-mocha-100 dark:to-mocha-300 bg-clip-text text-transparent">
          Company Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your company information and details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card
          variant="glass"
          className="border border-teal-200/50 dark:border-teal-800/30 shadow-lg shadow-teal-500/10 bg-gradient-to-br from-white via-teal-50/20 to-white dark:from-mocha-900 dark:via-teal-950/10 dark:to-mocha-900"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-teal-500 bg-clip-text text-transparent">
              <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/30">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              Company Information
            </CardTitle>
            <CardDescription>
              Basic information about your company
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain</Label>
              <Input
                id="subdomain"
                value={company.subdomain || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Subdomain cannot be changed after creation
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-domain">Custom Domain (Optional)</Label>
              <Input
                id="custom-domain"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="app.yourdomain.com"
              />
              <p className="text-xs text-muted-foreground">
                Configure a custom domain for your company workspace
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
