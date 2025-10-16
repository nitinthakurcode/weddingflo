'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { ReactNode } from 'react';

/**
 * Clerk Provider without Convex
 *
 * This provider wraps the app with Clerk authentication.
 * We've removed Convex as we're now using Supabase for database.
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      appearance={{
        variables: {
          colorPrimary: '#8b5cf6',
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
