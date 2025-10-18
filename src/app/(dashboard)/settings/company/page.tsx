'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Building2, Loader2, Save } from 'lucide-react';

export default function CompanyPage() {
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const companyId = user?.publicMetadata?.companyId as string | undefined;

  const [companyName, setCompanyName] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch company data
  const { data: company, isLoading } = useQuery<any>({
    queryKey: ['company', companyId],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase client not ready');
      if (!user?.id) throw new Error('User ID not available');
      if (!companyId) return null;
      // @ts-ignore - TODO: Regenerate Supabase types from database schema
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!companyId && !!supabase,
  });

  useEffect(() => {
    if (company) {
      setCompanyName(company.name);
      setCustomDomain(company.subdomain || '');
    }
  }, [company]);

  // Update company mutation
  const updateMutation = useMutation({
    mutationFn: async (input: { name: string; subdomain?: string }) => {
      if (!supabase) throw new Error('Supabase client not ready');
      if (!companyId) throw new Error('No company ID');

      const { error} = await supabase
        .from('companies')
        // @ts-ignore - TODO: Regenerate Supabase types from database schema
        .update({
          name: input.name,
          subdomain: input.subdomain,
          updated_at: new Date().toISOString(),
        })
        .eq('id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', companyId] });
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
        <h1 className="text-3xl font-bold tracking-tight">Company Settings</h1>
        <p className="text-muted-foreground">
          Manage your company information and details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
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
                value={company.subdomain}
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
