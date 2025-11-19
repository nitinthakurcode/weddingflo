import { SUBSCRIPTION_TIERS, getPrice, type SubscriptionTier } from './config';

/**
 * Legacy plans.ts - Maintains backward compatibility with existing code
 *
 * This file bridges the old static Price ID structure with the new
 * multi-currency dynamic pricing system. For new code, use config.ts directly.
 */

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
  priceId: string; // Note: This is now a placeholder. Use tRPC stripe.createCheckoutSession for actual Price IDs
  interval: 'month';
  limits: PlanLimits;
  popular?: boolean;
}

// Map new SUBSCRIPTION_TIERS structure to old SUBSCRIPTION_PLANS structure
export const SUBSCRIPTION_PLANS: Record<PlanTier, SubscriptionPlan> = {
  starter: {
    id: 'starter',
    name: SUBSCRIPTION_TIERS.starter.name,
    description: SUBSCRIPTION_TIERS.starter.description,
    price: getPrice('starter', 'USD', 'monthly'),
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || 'price_starter_placeholder',
    interval: 'month',
    limits: {
      maxGuests: SUBSCRIPTION_TIERS.starter.limits.maxGuestsPerWedding,
      maxEvents: SUBSCRIPTION_TIERS.starter.limits.maxClients, // Map maxClients to maxEvents
      maxUsers: SUBSCRIPTION_TIERS.starter.limits.maxStaff,
      features: [...SUBSCRIPTION_TIERS.starter.features],
    },
  },
  professional: {
    id: 'professional',
    name: SUBSCRIPTION_TIERS.professional.name,
    description: SUBSCRIPTION_TIERS.professional.description,
    price: getPrice('professional', 'USD', 'monthly'),
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL || 'price_professional_placeholder',
    interval: 'month',
    popular: true,
    limits: {
      maxGuests: SUBSCRIPTION_TIERS.professional.limits.maxGuestsPerWedding,
      maxEvents: SUBSCRIPTION_TIERS.professional.limits.maxClients,
      maxUsers: SUBSCRIPTION_TIERS.professional.limits.maxStaff,
      features: [...SUBSCRIPTION_TIERS.professional.features],
    },
  },
  enterprise: {
    id: 'enterprise',
    name: SUBSCRIPTION_TIERS.enterprise.name,
    description: SUBSCRIPTION_TIERS.enterprise.description,
    price: getPrice('enterprise', 'USD', 'monthly'),
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || 'price_enterprise_placeholder',
    interval: 'month',
    limits: {
      maxGuests: -1, // unlimited
      maxEvents: -1, // unlimited
      maxUsers: -1, // unlimited
      features: [...SUBSCRIPTION_TIERS.enterprise.features],
    },
  },
};

export function getPlanByTier(tier: PlanTier): SubscriptionPlan {
  return SUBSCRIPTION_PLANS[tier];
}

export function getPlanByPriceId(priceId: string): SubscriptionPlan | undefined {
  return Object.values(SUBSCRIPTION_PLANS).find((plan) => plan.priceId === priceId);
}

export function formatPrice(price: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
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
