'use client';

import { useEffect, useState } from 'react';
import { isFeatureEnabled, waitForFeatureFlags, type FeatureFlagKey } from '@/lib/analytics/feature-flags';

interface FeatureFlagWrapperProps {
  flag: FeatureFlagKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
}

/**
 * Wrapper component to conditionally render content based on feature flags
 */
export function FeatureFlagWrapper({
  flag,
  children,
  fallback = null,
  loadingFallback = null,
}: FeatureFlagWrapperProps) {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkFlag() {
      await waitForFeatureFlags();
      if (mounted) {
        setIsEnabled(isFeatureEnabled(flag));
      }
    }

    checkFlag();

    return () => {
      mounted = false;
    };
  }, [flag]);

  // Still loading
  if (isEnabled === null) {
    return <>{loadingFallback}</>;
  }

  // Feature is enabled
  if (isEnabled) {
    return <>{children}</>;
  }

  // Feature is disabled
  return <>{fallback}</>;
}

/**
 * Hook to check if a feature is enabled
 */
export function useFeatureFlag(flag: FeatureFlagKey): boolean {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkFlag() {
      await waitForFeatureFlags();
      if (mounted) {
        setIsEnabled(isFeatureEnabled(flag));
      }
    }

    checkFlag();

    return () => {
      mounted = false;
    };
  }, [flag]);

  return isEnabled;
}

/**
 * Hook to get all active feature flags
 */
export function useActiveFeatureFlags(): Record<string, boolean | string> {
  const [flags, setFlags] = useState<Record<string, boolean | string>>({});

  useEffect(() => {
    let mounted = true;

    async function loadFlags() {
      await waitForFeatureFlags();
      if (mounted) {
        // In a real implementation, this would get all flags from PostHog
        setFlags({});
      }
    }

    loadFlags();

    return () => {
      mounted = false;
    };
  }, []);

  return flags;
}
