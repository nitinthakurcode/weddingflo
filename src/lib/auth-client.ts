'use client';

import { createAuthClient } from 'better-auth/react';
import { twoFactorClient as twoFactorPlugin } from 'better-auth/client/plugins';
import { useAuthContext, type AuthUser } from '@/app/AuthProvider';

/**
 * BetterAuth Client
 *
 * January 2026 - Client-side auth helpers for BetterAuth
 * February 2026 - Added 2FA/TOTP support
 * Uses cookie-based sessions with proper server hydration
 */
export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL,
  plugins: [twoFactorPlugin()],
});

// Export commonly used hooks and methods from BetterAuth
export const {
  useSession,
  signIn,
  signUp,
  signOut,
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

export async function signUpWithEmail(email: string, password: string, name: string, captchaToken?: string) {
  return signUp.email({
    email,
    password,
    name,
    ...(captchaToken && { captchaToken }),
  });
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

// Two-Factor Authentication helpers - Security February 2026
// Note: The twoFactor client plugin provides these methods on authClient
// Type definitions for 2FA response
interface TwoFactorResult {
  data?: {
    totpURI?: string;
    backupCodes?: string[];
  };
  error?: {
    message?: string;
  };
}

// Cast authClient to access twoFactor methods
const twoFactorClient = authClient as unknown as {
  twoFactor: {
    enable: (opts?: { password?: string }) => Promise<TwoFactorResult>;
    verifyTotp: (opts: { code: string }) => Promise<TwoFactorResult>;
    disable: (opts: { password: string }) => Promise<TwoFactorResult>;
    sendOtp: () => Promise<TwoFactorResult>;
    verifyOtp: (opts: { code: string }) => Promise<TwoFactorResult>;
  };
};

/**
 * Enable 2FA for the current user
 * Returns a TOTP secret and QR code URL
 */
export async function enable2FA(): Promise<TwoFactorResult> {
  return twoFactorClient.twoFactor.enable();
}

/**
 * Verify and complete 2FA setup with a TOTP code
 */
export async function verify2FA(code: string): Promise<TwoFactorResult> {
  return twoFactorClient.twoFactor.verifyTotp({ code });
}

/**
 * Disable 2FA for the current user
 */
export async function disable2FA(password: string): Promise<TwoFactorResult> {
  return twoFactorClient.twoFactor.disable({ password });
}

/**
 * Send OTP email for 2FA verification
 */
export async function send2FAOtp(): Promise<TwoFactorResult> {
  return twoFactorClient.twoFactor.sendOtp();
}

/**
 * Verify 2FA with OTP (email backup)
 */
export async function verify2FAWithOtp(code: string): Promise<TwoFactorResult> {
  return twoFactorClient.twoFactor.verifyOtp({ code });
}

/**
 * Check if user has 2FA enabled
 * Note: Cast to access twoFactorEnabled which may be added by 2FA plugin
 */
export function useHas2FA() {
  const { user } = useAuth();
  return (user as { twoFactorEnabled?: boolean } | null)?.twoFactorEnabled ?? false;
}

// Re-export types
export type { AuthUser } from '@/app/AuthProvider';
