'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { SubscriptionPlan, formatPrice } from '@/lib/stripe/plans';
import { Badge } from '@/components/ui/badge';

interface PlanCardProps {
  plan: SubscriptionPlan;
  currentPlan?: string;
  onSelect: (priceId: string) => void;
  loading?: boolean;
}

export function PlanCard({ plan, currentPlan, onSelect, loading }: PlanCardProps) {
  const isCurrentPlan = currentPlan === plan.id;

  const handleClick = () => {
    console.log(`🎯 Plan Card Clicked: ${plan.name}`, { priceId: plan.priceId });
    onSelect(plan.priceId);
  };

  return (
    <Card className={plan.popular ? 'border-2 border-primary' : ''}>
      <CardHeader>
        {plan.popular && (
          <Badge className="mb-2 w-fit" variant="default">
            Most Popular
          </Badge>
        )}
        <CardTitle className="text-2xl">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
        <div className="mt-4">
          <span className="text-4xl font-bold">{formatPrice(plan.price)}</span>
          <span className="text-muted-foreground">/{plan.interval}</span>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          className="mb-6 w-full"
          onClick={handleClick}
          disabled={isCurrentPlan || loading}
          variant={isCurrentPlan ? 'secondary' : 'default'}
        >
          {isCurrentPlan ? 'Current Plan' : 'Upgrade'}
        </Button>
        <ul className="space-y-3">
          {plan.limits.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="mr-2 h-5 w-5 flex-shrink-0 text-primary" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
