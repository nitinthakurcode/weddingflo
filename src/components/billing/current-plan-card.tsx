'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPlanByTier, formatPrice, PlanTier } from '@/lib/stripe/plans';
import { format } from 'date-fns';

interface CurrentPlanCardProps {
  tier: PlanTier;
  status: string;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  onManageSubscription: () => void;
  onCancelSubscription: () => void;
  loading?: boolean;
}

export function CurrentPlanCard({
  tier,
  status,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  onManageSubscription,
  onCancelSubscription,
  loading,
}: CurrentPlanCardProps) {
  const plan = getPlanByTier(tier);

  const getStatusBadge = () => {
    if (cancelAtPeriodEnd) {
      return <Badge variant="destructive">Canceling</Badge>;
    }
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'trialing':
        return <Badge variant="secondary">Trial</Badge>;
      case 'past_due':
        return <Badge variant="destructive">Past Due</Badge>;
      case 'canceled':
        return <Badge variant="destructive">Canceled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Manage your subscription</CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-2xl font-bold">{plan.name}</h3>
          <p className="text-muted-foreground">
            {formatPrice(plan.price)}/{plan.interval}
          </p>
        </div>

        {currentPeriodEnd && (
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              {cancelAtPeriodEnd ? 'Cancels on' : 'Renews on'}
            </p>
            <p className="font-medium">{format(new Date(currentPeriodEnd), 'MMMM d, yyyy')}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={onManageSubscription} disabled={loading} variant="outline">
            Manage Subscription
          </Button>
          {!cancelAtPeriodEnd && status === 'active' && (
            <Button
              onClick={onCancelSubscription}
              disabled={loading}
              variant="ghost"
              className="text-destructive hover:text-destructive"
            >
              Cancel Plan
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
