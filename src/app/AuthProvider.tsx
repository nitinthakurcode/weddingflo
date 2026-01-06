'use client';

import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useSession } from '@/lib/auth-client';

/**
 * Auth Context Types
 *
 * Defines the shape of auth data passed from server to client
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string | null;
  companyId: string | null;
  firstName: string | null;
  lastName: string | null;
  onboardingCompleted: boolean;
}

export interface AuthSession {
  user: AuthUser | null;
  isAuthenticated: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  session: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Server Session Props
 *
 * Initial session data passed from server components to eliminate hydration mismatch
 */
export interface ServerSession {
  user: AuthUser | null;
  session: any | null;
}

// Context with null default - will be populated by provider
const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Auth Provider
 *
 * January 2026 - Production-grade auth provider with server-side session hydration
 *
 * Key features:
 * - Accepts initial session from server to prevent hydration mismatch
 * - Falls back to BetterAuth's useSession for client-side updates
 * - Provides consistent auth state across server and client renders
 *
 * Usage in server component (layout.tsx):
 * ```tsx
 * const { user } = await getServerSession();
 * <AuthProvider initialSession={{ user, session: null }}>
 *   {children}
 * </AuthProvider>
 * ```
 */
export function AuthProvider({
  children,
  initialSession,
}: {
  children: ReactNode;
  initialSession?: ServerSession | null;
}) {
  // Get BetterAuth's live session (updates on auth changes)
  const betterAuthSession = useSession();

  // Compute final auth state
  // Priority: BetterAuth data (if loaded) > Initial server session > null
  const authValue = useMemo<AuthContextValue>(() => {
    // If BetterAuth has loaded and has data, use it
    if (!betterAuthSession.isPending && betterAuthSession.data?.user) {
      const user = betterAuthSession.data.user as any;
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role ?? null,
          companyId: user.companyId ?? null,
          firstName: user.firstName ?? null,
          lastName: user.lastName ?? null,
          onboardingCompleted: user.onboardingCompleted ?? false,
        },
        session: betterAuthSession.data.session,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    }

    // If BetterAuth has loaded but no user (logged out)
    if (!betterAuthSession.isPending && !betterAuthSession.data?.user) {
      return {
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        error: betterAuthSession.error ?? null,
      };
    }

    // BetterAuth is still loading - use initial session from server
    if (initialSession?.user) {
      return {
        user: initialSession.user,
        session: initialSession.session,
        isAuthenticated: true,
        isLoading: false, // Not loading - we have server data
        error: null,
      };
    }

    // No initial session and BetterAuth still loading
    // This only happens on public pages where no server session check occurred
    return {
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: betterAuthSession.isPending,
      error: null,
    };
  }, [betterAuthSession, initialSession]);

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuthContext Hook
 *
 * Access auth state from the AuthProvider context.
 * Use this instead of BetterAuth's useSession for consistent hydration.
 */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
}
