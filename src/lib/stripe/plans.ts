import { STRIPE_CONFIG } from './config';

export type PlanTier = 'starter' | 'professional' | 'enterprise';

export interface PlanLimits {
  maxGuests: number;
  maxEvents: number;
  maxUsers: number;
  features: string[];
}

export interface SubscriptionPlan {
  id: PlanTier;
  name: string;
  description: string;
  price: number;
  priceId: string;
  interval: 'month';
  limits: PlanLimits;
  popular?: boolean;
}

export const SUBSCRIPTION_PLANS: Record<PlanTier, SubscriptionPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small events and getting started',
    price: 29,
    priceId: STRIPE_CONFIG.prices.starter,
    interval: 'month',
    limits: {
      maxGuests: 100,
      maxEvents: 5,
      maxUsers: 2,
      features: [
        '100 guests per event',
        '5 events total',
        '2 team members',
        'Basic guest management',
        'QR code check-in',
        'Email support',
        'Basic reporting',
        'Mobile app access',
      ],
    },
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'For professional planners managing multiple events',
    price: 99,
    priceId: STRIPE_CONFIG.prices.professional,
    interval: 'month',
    popular: true,
    limits: {
      maxGuests: 1000,
      maxEvents: -1, // unlimited
      maxUsers: 10,
      features: [
        '1,000 guests per event',
        'Unlimited events',
        '10 team members',
        'Advanced guest management',
        'QR code check-in',
        'Bulk email & SMS',
        'AI seating suggestions',
        'Budget tracking',
        'Vendor management',
        'Advanced analytics',
        'Priority support',
        'Custom branding',
      ],
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations with complex needs',
    price: 299,
    priceId: STRIPE_CONFIG.prices.enterprise,
    interval: 'month',
    limits: {
      maxGuests: -1, // unlimited
      maxEvents: -1, // unlimited
      maxUsers: -1, // unlimited
      features: [
        'Unlimited guests',
        'Unlimited events',
        'Unlimited team members',
        'Everything in Professional',
        'White-label branding',
        'Custom domain',
        'Advanced AI features',
        'API access',
        'Dedicated account manager',
        'SLA guarantee',
        '24/7 phone support',
        'Custom integrations',
      ],
    },
  },
};

export function getPlanByTier(tier: PlanTier): SubscriptionPlan {
  return SUBSCRIPTION_PLANS[tier];
}

export function getPlanByPriceId(priceId: string): SubscriptionPlan | undefined {
  return Object.values(SUBSCRIPTION_PLANS).find((plan) => plan.priceId === priceId);
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(price);
}

// Debug logging for client side
if (typeof window !== 'undefined') {
  console.log('📦 SUBSCRIPTION_PLANS loaded on client:', {
    starter: SUBSCRIPTION_PLANS.starter.priceId,
    professional: SUBSCRIPTION_PLANS.professional.priceId,
    enterprise: SUBSCRIPTION_PLANS.enterprise.priceId,
  });
}
