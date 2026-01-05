'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, AlertCircle, ExternalLink, CreditCard } from 'lucide-react';

export function StripeConnectSetup() {
  const t = useTranslations('stripeConnect');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { data: account, isLoading, refetch } = trpc.payment.getStripeAccount.useQuery();

  const createAccountMutation = trpc.payment.createStripeAccount.useMutation({
    onSuccess: () => {
      toast.success(t('successMessage'));
      refetch();
      setIsCreating(false);
    },
    onError: (error) => {
      toast.error(t('errorMessage'));
      setIsCreating(false);
    },
  });

  const createOnboardingLinkMutation = trpc.payment.createOnboardingLink.useMutation({
    onSuccess: (data) => {
      // Redirect to Stripe onboarding
      window.location.href = data.url;
    },
    onError: (error) => {
      toast.error(`Failed to create onboarding link: ${error.message}`);
    },
  });

  const handleCreateAccount = async () => {
    if (!email || !businessName) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsCreating(true);
    createAccountMutation.mutate({
      email,
      businessName,
      country: 'US',
    });
  };

  const handleStartOnboarding = () => {
    if (!account?.id) return;
    createOnboardingLinkMutation.mutate({
      stripeAccountId: account.id,
    });
  };

  const getStatusBadge = () => {
    if (!account) return null;

    if (account.chargesEnabled && account.payoutsEnabled) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-100">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          {t('statusActive')}
        </Badge>
      );
    }

    if (account.detailsSubmitted) {
      return (
        <Badge variant="secondary">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          {t('statusReview')}
        </Badge>
      );
    }

    return (
      <Badge variant="destructive">
        <AlertCircle className="mr-1 h-3 w-3" />
        {t('statusRequired')}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!account) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName">{t('businessNameLabel')}</Label>
              <Input
                id="businessName"
                placeholder={t('businessNamePlaceholder')}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>{t('whyStripe')}</strong> {t('whyStripeText')}
            </p>
          </div>

          <Button onClick={handleCreateAccount} disabled={isCreating} className="w-full" size="lg">
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('creating')}
              </>
            ) : (
              t('createButton')
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t('setupTitle')}
          </CardTitle>
          {getStatusBadge()}
        </div>
        <CardDescription>{t('manageDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('businessName')}</p>
              <p className="text-base font-semibold">{(account.businessProfile as { businessName?: string })?.businessName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('email')}</p>
              <p className="text-base font-semibold">{(account.businessProfile as { email?: string })?.email || 'N/A'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('country')}</p>
              <p className="text-base font-semibold">{account.country?.toUpperCase() || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('currency')}</p>
              <p className="text-base font-semibold">{account.defaultCurrency?.toUpperCase() || 'N/A'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              {account.chargesEnabled ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <p className="text-sm">{account.chargesEnabled ? t('chargesEnabled') : t('chargesDisabled')}</p>
            </div>
            <div className="flex items-center gap-2">
              {account.payoutsEnabled ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <p className="text-sm">{account.payoutsEnabled ? t('payoutsEnabled') : t('payoutsDisabled')}</p>
            </div>
          </div>
        </div>

        {!account.detailsSubmitted && (
          <>
            <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-950">
              <p className="text-sm text-yellow-900 dark:text-yellow-100">
                <strong>{t('actionRequired')}</strong> {t('actionRequiredText')}
              </p>
            </div>

            <Button
              onClick={handleStartOnboarding}
              disabled={createOnboardingLinkMutation.isPending}
              className="w-full"
              size="lg"
            >
              {createOnboardingLinkMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('loading')}
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t('completeOnboarding')}
                </>
              )}
            </Button>
          </>
        )}

        {account.detailsSubmitted && !account.chargesEnabled && (
          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>{t('underReview')}</strong> {t('underReviewText')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
