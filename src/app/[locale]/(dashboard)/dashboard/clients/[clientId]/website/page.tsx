'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Globe, Eye, EyeOff, Settings, BarChart, Palette, Link2, Lock } from 'lucide-react';
import { WebsiteBuilder } from '@/components/websites/website-builder';
import { TemplateSelector } from '@/components/websites/template-selector';
import { DomainManager } from '@/components/websites/domain-manager';
import { WebsiteAnalytics } from '@/components/websites/website-analytics';
import { WebsiteSettings } from '@/components/websites/website-settings';
import { toast } from 'sonner';

/**
 * Website Management Dashboard
 * Session 49: Complete wedding website builder
 *
 * Features:
 * - Template selection
 * - Content editing
 * - Domain management
 * - Publishing
 * - Analytics
 * - Settings
 */
export default function WebsitePage() {
  const params = useParams();
  const clientId = params.clientId as string;

  const [selectedTab, setSelectedTab] = useState('builder');

  // Get or create website
  const { data: website, isLoading, refetch } = trpc.websites.getByClient.useQuery(
    { clientId },
    {
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  const createWebsite = trpc.websites.create.useMutation({
    onSuccess: () => {
      toast.success('Website created!');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const togglePublish = trpc.websites.togglePublish.useMutation({
    onSuccess: (data) => {
      toast.success(data.is_published ? 'Website published!' : 'Website unpublished');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreateWebsite = () => {
    createWebsite.mutate({
      clientId,
      templateId: 'classic',
    });
  };

  const handleTogglePublish = () => {
    if (!website) return;
    togglePublish.mutate({
      websiteId: website.id,
      isPublished: !website.is_published,
    });
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // No website exists - show creation screen
  if (!website) {
    return (
      <div className="container py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-6 w-6" />
              Create Wedding Website
            </CardTitle>
            <CardDescription>
              Give your clients a beautiful, personalized website to share their wedding details with guests
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">Free Subdomain</h4>
                  <p className="text-sm text-muted-foreground">
                    Get a free subdomain like couple-name.weddingflow.com
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">5 Beautiful Templates</h4>
                  <p className="text-sm text-muted-foreground">
                    Choose from Classic, Modern, Elegant, Rustic, or Minimalist designs
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <BarChart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">Analytics & Insights</h4>
                  <p className="text-sm text-muted-foreground">
                    Track views, visitors, and engagement
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleCreateWebsite}
              disabled={createWebsite.isPending}
              size="lg"
              className="w-full"
            >
              {createWebsite.isPending ? 'Creating...' : 'Create Website'}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Upgrade to Premium ($19.99/year) to add a custom domain like couple.com
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Website exists - show full builder
  const websiteUrl = website.custom_domain_verified && website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${website.subdomain}.weddingflow.com`;

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Wedding Website</h1>
          <p className="text-muted-foreground mt-1">
            {website.subdomain}.weddingflow.com
            {website.custom_domain && (
              <span className="ml-2">
                • {website.custom_domain}
                {website.custom_domain_verified && (
                  <Badge variant="default" className="ml-2">Verified</Badge>
                )}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.open(websiteUrl, '_blank')}
            disabled={!website.is_published}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>

          <Button
            onClick={handleTogglePublish}
            disabled={togglePublish.isPending}
            variant={website.is_published ? 'outline' : 'default'}
          >
            {website.is_published ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Unpublish
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Publish
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex items-center gap-2 mb-6">
        <Badge variant={website.is_published ? 'default' : 'secondary'}>
          {website.is_published ? 'Published' : 'Draft'}
        </Badge>
        {website.is_password_protected && (
          <Badge variant="outline">
            <Lock className="h-3 w-3 mr-1" />
            Password Protected
          </Badge>
        )}
        <Badge variant="outline">{website.view_count} views</Badge>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="builder">
            <Palette className="h-4 w-4 mr-2" />
            Builder
          </TabsTrigger>
          <TabsTrigger value="domain">
            <Link2 className="h-4 w-4 mr-2" />
            Domain
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="mt-6">
          <div className="space-y-6">
            <TemplateSelector
              websiteId={website.id}
              currentTemplateId={website.template_id}
              onTemplateChange={refetch}
            />
            <WebsiteBuilder
              website={website}
              onUpdate={refetch}
            />
          </div>
        </TabsContent>

        <TabsContent value="domain" className="mt-6">
          <DomainManager
            website={website}
            onUpdate={refetch}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <WebsiteAnalytics websiteId={website.id} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <WebsiteSettings
            website={website}
            onUpdate={refetch}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
