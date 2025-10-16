import { posthog } from './posthog-client';

export interface UserProperties {
  userId: string;
  email: string;
  name?: string;
  role?: 'owner' | 'admin' | 'manager' | 'staff';
  companyId?: string;
  plan?: 'free' | 'starter' | 'professional' | 'enterprise';
  createdAt?: Date;
  lastLoginAt?: Date;
}

export interface CompanyProperties {
  companyId: string;
  companyName?: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  userCount: number;
  guestCount: number;
  vendorCount: number;
  eventCount: number;
  budgetTotal?: number;
  createdAt?: Date;
  subscriptionStatus?: 'active' | 'trialing' | 'past_due' | 'canceled';
  features?: string[];
}

/**
 * Identify user in PostHog
 */
export function identifyUser(properties: UserProperties): void {
  if (!properties.userId) {
    console.warn('[Analytics] Cannot identify user without userId');
    return;
  }

  posthog.identify(properties.userId, {
    email: properties.email,
    name: properties.name,
    role: properties.role,
    company_id: properties.companyId,
    plan: properties.plan,
    created_at: properties.createdAt?.toISOString(),
    last_login_at: properties.lastLoginAt?.toISOString(),
  });
}

/**
 * Set company properties (group analytics)
 */
export function setCompanyProperties(properties: CompanyProperties): void {
  if (!properties.companyId) {
    console.warn('[Analytics] Cannot set company properties without companyId');
    return;
  }

  // Set group in PostHog
  posthog.group('company', properties.companyId, {
    name: properties.companyName,
    plan: properties.plan,
    user_count: properties.userCount,
    guest_count: properties.guestCount,
    vendor_count: properties.vendorCount,
    event_count: properties.eventCount,
    budget_total: properties.budgetTotal,
    created_at: properties.createdAt?.toISOString(),
    subscription_status: properties.subscriptionStatus,
    features: properties.features,
  });
}

/**
 * Update user properties
 */
export function updateUserProperties(updates: Partial<UserProperties>): void {
  const cleanUpdates: Record<string, unknown> = {};

  if (updates.role) cleanUpdates.role = updates.role;
  if (updates.plan) cleanUpdates.plan = updates.plan;
  if (updates.companyId) cleanUpdates.company_id = updates.companyId;
  if (updates.lastLoginAt) cleanUpdates.last_login_at = updates.lastLoginAt.toISOString();

  posthog.setPersonProperties(cleanUpdates);
}

/**
 * Track user engagement level
 */
export function trackUserEngagement(
  userId: string,
  metrics: {
    daysActive: number;
    actionsPerformed: number;
    lastActiveAt: Date;
    favoriteFeatures: string[];
  }
): void {
  posthog.setPersonProperties({
    days_active: metrics.daysActive,
    actions_performed: metrics.actionsPerformed,
    last_active_at: metrics.lastActiveAt.toISOString(),
    favorite_features: metrics.favoriteFeatures,
  });
}

/**
 * Track plan upgrade/downgrade
 */
export function trackPlanChange(
  fromPlan: string,
  toPlan: string,
  companyId: string
): void {
  posthog.capture('plan_changed', {
    from_plan: fromPlan,
    to_plan: toPlan,
    company_id: companyId,
  });

  // Update user and company properties
  updateUserProperties({ plan: toPlan as UserProperties['plan'] });
}

/**
 * Track feature access
 */
export function trackFeatureAccess(
  featureName: string,
  hasAccess: boolean,
  plan: string
): void {
  posthog.capture('feature_access_checked', {
    feature_name: featureName,
    has_access: hasAccess,
    plan,
  });
}

/**
 * Track company milestones
 */
export function trackCompanyMilestone(
  milestone: string,
  companyId: string,
  metadata?: Record<string, unknown>
): void {
  posthog.capture('company_milestone', {
    milestone,
    company_id: companyId,
    ...metadata,
  });
}

/**
 * Common milestones
 */
export const Milestones = {
  FIRST_GUEST: 'first_guest_added',
  GUESTS_10: '10_guests_added',
  GUESTS_50: '50_guests_added',
  GUESTS_100: '100_guests_added',
  GUESTS_200: '200_guests_added',
  FIRST_VENDOR: 'first_vendor_added',
  FIRST_EVENT: 'first_event_created',
  FIRST_BUDGET_ITEM: 'first_budget_item_created',
  FIRST_QR_CODE: 'first_qr_code_generated',
  FIRST_AI_USE: 'first_ai_feature_used',
  FIRST_EXPORT: 'first_export_generated',
  FIRST_CHECK_IN: 'first_guest_checked_in',
  UPGRADED_TO_PAID: 'upgraded_to_paid_plan',
};
