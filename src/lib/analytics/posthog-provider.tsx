'use client';

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    capture_pageview: false, // We'll track manually
    capture_pageleave: true,
    autocapture: false // Explicit event tracking only
  });
}

export function PHProvider({ children }: { children: React.ReactNode }) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

export function PostHogIdentifier() {
  const { userId, sessionId } = useAuth();

  useEffect(() => {
    if (userId) {
      posthog.identify(userId, {
        session_id: sessionId
      });
    }
  }, [userId, sessionId]);

  return null;
}
