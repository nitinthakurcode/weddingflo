import { posthog } from './posthog-client';

/**
 * Feature flag keys
 */
export const FeatureFlags = {
  // AI Features
  AI_SEATING: 'ai-seating-enabled',
  AI_BUDGET: 'ai-budget-suggestions',
  AI_VENDOR_RECOMMENDATIONS: 'ai-vendor-recommendations',
  AI_ASSISTANT: 'ai-assistant-enabled',

  // New Features
  ADVANCED_REPORTING: 'advanced-reporting',
  CUSTOM_BRANDING: 'custom-branding',
  MULTI_EVENT: 'multi-event-support',
  TEAM_COLLABORATION: 'team-collaboration',

  // Beta Features
  MOBILE_APP: 'mobile-app-beta',
  VIDEO_MESSAGES: 'video-messages-beta',
  LIVE_STREAMING: 'live-streaming-beta',

  // System Controls
  MAINTENANCE_MODE: 'maintenance-mode',
  NEW_DASHBOARD: 'new-dashboard-ui',
} as const;

export type FeatureFlagKey = typeof FeatureFlags[keyof typeof FeatureFlags];

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flagKey: FeatureFlagKey): boolean {
  if (typeof window === 'undefined') return false;

  const isEnabled = posthog.isFeatureEnabled(flagKey);
  return Boolean(isEnabled);
}

/**
 * Get feature flag value (for multivariate flags)
 */
export function getFeatureFlagValue(flagKey: FeatureFlagKey): string | boolean | undefined {
  if (typeof window === 'undefined') return undefined;

  return posthog.getFeatureFlag(flagKey);
}

/**
 * Wait for feature flags to load
 */
export async function waitForFeatureFlags(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    posthog.onFeatureFlags(() => {
      resolve();
    });
  });
}

/**
 * Reload feature flags
 */
export function reloadFeatureFlags(): void {
  if (typeof window === 'undefined') return;
  posthog.reloadFeatureFlags();
}

/**
 * Get all active feature flags
 */
export function getAllActiveFlags(): Record<string, boolean | string> {
  if (typeof window === 'undefined') return {};

  const flags: Record<string, boolean | string> = {};

  Object.values(FeatureFlags).forEach((flagKey) => {
    const value = posthog.getFeatureFlag(flagKey);
    if (value !== undefined) {
      flags[flagKey] = value;
    }
  });

  return flags;
}

/**
 * Override feature flags for testing (only in development)
 */
export function overrideFeatureFlags(
  flags: Record<string, boolean | string>
): void {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('[Feature Flags] Can only override flags in development');
    return;
  }

  if (typeof window === 'undefined') return;

  // Store overrides in localStorage
  Object.entries(flags).forEach(([key, value]) => {
    localStorage.setItem(`ff_override_${key}`, JSON.stringify(value));
  });

  console.log('[Feature Flags] Overrides applied:', flags);
}

/**
 * Clear feature flag overrides
 */
export function clearFeatureFlagOverrides(): void {
  if (typeof window === 'undefined') return;

  Object.keys(localStorage)
    .filter((key) => key.startsWith('ff_override_'))
    .forEach((key) => localStorage.removeItem(key));

  console.log('[Feature Flags] Overrides cleared');
}
