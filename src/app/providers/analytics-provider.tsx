'use client';

import { useEffect, Suspense } from 'react';
import { useUser } from '@clerk/nextjs';
import { usePathname, useSearchParams } from 'next/navigation';
import { initPostHog, posthog } from '@/lib/analytics/posthog-client';
import { setUserContext } from '@/lib/errors/sentry-logger';

// Separate component for page view tracking that uses searchParams
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track page views
  useEffect(() => {
    if (pathname) {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
      posthog.capture('$pageview', {
        $current_url: url,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

function AnalyticsProviderInner({ children }: { children: React.ReactNode }) {
  const { user } = useUser();

  // Initialize PostHog
  useEffect(() => {
    initPostHog();
  }, []);

  // Track user identification
  useEffect(() => {
    if (!user) {
      posthog.reset();
      return;
    }

    // Identify user in PostHog
    posthog.identify(user.id, {
      email: user.emailAddresses[0]?.emailAddress,
      name: user.fullName || user.firstName,
      createdAt: user.createdAt,
    });

    // Set user context in Sentry
    setUserContext({
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      name: user.fullName || user.firstName || undefined,
    });
  }, [user]);

  return (
    <>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </>
  );
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return <AnalyticsProviderInner>{children}</AnalyticsProviderInner>;
}
