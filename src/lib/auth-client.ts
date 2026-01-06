'use client';

import { createAuthClient } from 'better-auth/react';
import { useAuthContext, type AuthUser } from '@/app/AuthProvider';

/**
 * BetterAuth Client
 *
 * January 2026 - Client-side auth helpers for BetterAuth
 * Uses cookie-based sessions with proper server hydration
 */
export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL,
});

// Export commonly used hooks and methods from BetterAuth
export const {
  useSession,
  signIn,
  signUp,
  signOut,
  useActiveOrganization,
} = authClient;

// Convenience method for sign out with redirect
export async function signOutAndRedirect(redirectTo: string = '/sign-in') {
  await signOut();
  if (typeof window !== 'undefined') {
    window.location.href = redirectTo;
  }
}

// Convenience methods for different sign-in methods
export async function signInWithEmail(email: string, password: string, captchaToken?: string) {
  return signIn.email({
    email,
    password,
    ...(captchaToken && { captchaToken }),
  });
}

export async function signInWithGoogle() {
  return signIn.social({ provider: 'google' });
}

/**
 * useAuth Hook - PRODUCTION VERSION
 *
 * This hook provides auth state with proper server hydration support.
 * It uses the AuthContext which receives initial session data from the server,
 * eliminating hydration mismatches.
 *
 * Key benefits:
 * - No hydration mismatch (server and client render the same initial state)
 * - No loading flash on authenticated pages
 * - Automatic updates when auth state changes
 *
 * Usage:
 * ```tsx
 * const { user, isAuthenticated, isLoading } = useAuth();
 * ```
 */
export function useAuth(): {
  user: AuthUser | null;
  session: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
} {
  return useAuthContext();
}

// Re-export types
export type { AuthUser } from '@/app/AuthProvider';
