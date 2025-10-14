'use client';

import { PlanCard } from './plan-card';
import { SUBSCRIPTION_PLANS } from '@/lib/stripe/plans';

interface PlanComparisonProps {
  currentPlan?: string;
  onSelectPlan: (priceId: string) => void;
  loading?: boolean;
}

export function PlanComparison({ currentPlan, onSelectPlan, loading }: PlanComparisonProps) {
  const plans = Object.values(SUBSCRIPTION_PLANS);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {plans.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          currentPlan={currentPlan}
          onSelect={onSelectPlan}
          loading={loading}
        />
      ))}
    </div>
  );
}
