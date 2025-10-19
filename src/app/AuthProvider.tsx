'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { ReactNode } from 'react';

/**
 * Auth Provider
 *
 * This provider wraps the app with Clerk authentication.
 * We're using Supabase for database operations.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
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
