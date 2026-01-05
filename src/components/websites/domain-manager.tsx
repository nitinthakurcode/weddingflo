'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/lib/trpc/client';
import { toast } from 'sonner';
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

/**
 * Website type from Drizzle schema
 * Uses camelCase fields with settings JSONB column
 */
interface Website {
  id: string;
  clientId: string;
  subdomain: string | null;
  customDomain: string | null;
  theme: string | null;
  isPublished: boolean | null;
  password: string | null;
  isPasswordProtected: boolean | null;
  settings: unknown;
  content: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface WebsiteSettings {
  customDomainVerified?: boolean;
  dnsVerificationToken?: string;
  viewCount?: number;
}

interface DomainManagerProps {
  website: Website;
  onUpdate: () => void;
}

/**
 * Domain Management Component - Drizzle Schema
 *
 * Settings are stored in `settings` JSONB:
 * - customDomainVerified
 * - dnsVerificationToken
 */
export function DomainManager({ website, onUpdate }: DomainManagerProps) {
  // Extract settings from JSONB
  const settings = (website.settings as WebsiteSettings) || {};
  const customDomainVerified = settings.customDomainVerified || false;
  const dnsVerificationToken = settings.dnsVerificationToken || '';

  const [customDomain, setCustomDomain] = useState(website.customDomain || '');
  const [showDNSInstructions, setShowDNSInstructions] = useState(false);

  const addCustomDomain = trpc.websites.addCustomDomain.useMutation({
    onSuccess: () => {
      toast.success('Custom domain configured! Follow the DNS instructions below.');
      setShowDNSInstructions(true);
      onUpdate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const verifyDomain = trpc.websites.verifyCustomDomain.useMutation({
    onSuccess: (data) => {
      if (data.verified) {
        toast.success('Domain verified! ✅');
        onUpdate();
      } else {
        toast.error(data.error || 'Domain not verified yet');
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAddDomain = () => {
    if (!customDomain) {
      toast.error('Please enter a domain');
      return;
    }

    addCustomDomain.mutate({
      websiteId: website.id,
      domain: customDomain,
    });
  };

  const handleVerifyDomain = () => {
    verifyDomain.mutate({ websiteId: website.id });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* Free Subdomain */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Free Subdomain
          </CardTitle>
          <CardDescription>Your website is live at this address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{website.subdomain}.weddingflow.com</p>
                <p className="text-sm text-muted-foreground">Free forever</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                window.open(`https://${website.subdomain}.weddingflow.com`, '_blank')
              }
              disabled={!website.isPublished}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Visit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Custom Domain */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Custom Domain
            <Badge variant="secondary">$19.99/year</Badge>
          </CardTitle>
          <CardDescription>
            Use your own domain like couple.com instead of a subdomain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!website.customDomain ? (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You'll need to own a domain and have access to its DNS settings. We recommend
                  Namecheap, GoDaddy, or Google Domains.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="custom-domain">Your Domain</Label>
                <div className="flex gap-2">
                  <Input
                    id="custom-domain"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="couple.com"
                  />
                  <Button
                    onClick={handleAddDomain}
                    disabled={addCustomDomain.isPending}
                  >
                    {addCustomDomain.isPending ? 'Adding...' : 'Add Domain'}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Domain Status */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-full p-2 ${
                      customDomainVerified
                        ? 'bg-green-500/10'
                        : 'bg-yellow-500/10'
                    }`}
                  >
                    {customDomainVerified ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{website.customDomain}</p>
                    <p className="text-sm text-muted-foreground">
                      {customDomainVerified ? 'Verified ✓' : 'Pending verification'}
                    </p>
                  </div>
                </div>
                {!customDomainVerified && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleVerifyDomain}
                    disabled={verifyDomain.isPending}
                  >
                    {verifyDomain.isPending ? 'Verifying...' : 'Verify Now'}
                  </Button>
                )}
              </div>

              {/* DNS Instructions */}
              {!customDomainVerified && (
                <Card className="bg-blue-50 dark:bg-blue-950">
                  <CardHeader>
                    <CardTitle className="text-base">DNS Configuration Required</CardTitle>
                    <CardDescription>
                      Add these records to your domain's DNS settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* TXT Record for Verification */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                          1
                        </span>
                        Add TXT Record (for verification)
                      </h4>
                      <div className="ml-8 space-y-2">
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <Label className="text-xs text-muted-foreground">Type</Label>
                            <div className="flex items-center gap-2">
                              <code className="bg-muted px-2 py-1 rounded">TXT</code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard('TXT')}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Name</Label>
                            <div className="flex items-center gap-2">
                              <code className="bg-muted px-2 py-1 rounded text-xs">
                                _weddingflow
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard('_weddingflow')}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Value</Label>
                            <div className="flex items-center gap-2">
                              <code className="bg-muted px-2 py-1 rounded text-xs truncate max-w-[120px]">
                                {dnsVerificationToken || 'wf-verify-xxxxx'}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() =>
                                  copyToClipboard(dnsVerificationToken || '')
                                }
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CNAME Record */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                          2
                        </span>
                        Add CNAME Record (for routing)
                      </h4>
                      <div className="ml-8 space-y-2">
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <Label className="text-xs text-muted-foreground">Type</Label>
                            <div className="flex items-center gap-2">
                              <code className="bg-muted px-2 py-1 rounded">CNAME</code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard('CNAME')}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Name</Label>
                            <div className="flex items-center gap-2">
                              <code className="bg-muted px-2 py-1 rounded">@</code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard('@')}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Value</Label>
                            <div className="flex items-center gap-2">
                              <code className="bg-muted px-2 py-1 rounded text-xs">
                                websites.weddingflow.com
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard('websites.weddingflow.com')}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        DNS changes can take 24-48 hours to propagate. Click "Verify Now" after
                        adding these records.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
