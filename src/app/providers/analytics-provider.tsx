'use client';

import { useEffect, Suspense } from 'react';
import { useSession } from '@/lib/auth-client';
import { usePathname, useSearchParams } from 'next/navigation';
// TODO: PostHog temporarily disabled due to posthog-js compatibility issue
// import { initPostHog, posthog } from '@/lib/analytics/posthog-client';
import * as Sentry from '@sentry/nextjs';

// TODO: PostHog tracking temporarily disabled
// Separate component for page view tracking that uses searchParams
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track page views
  useEffect(() => {
    if (pathname) {
      // const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
      // posthog.capture('$pageview', {
      //   $current_url: url,
      // });
    }
  }, [pathname, searchParams]);

  return null;
}

function AnalyticsProviderInner({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  // Initialize PostHog
  useEffect(() => {
    // initPostHog(); // Temporarily disabled
  }, []);

  // Track user identification
  useEffect(() => {
    if (!session?.user) {
      // posthog.reset(); // Temporarily disabled
      return;
    }

    const user = session.user;

    // Identify user in PostHog (temporarily disabled)
    // posthog.identify(user.id, {
    //   email: user.email,
    //   name: user.name,
    // });

    // Set user context in Sentry
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name || undefined,
    });
  }, [session?.user]);

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
