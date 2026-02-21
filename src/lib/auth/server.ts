import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import type { ServerSessionResult, BetterAuthUser, BetterAuthSession } from './types';

// Re-export types for convenience
export type { ServerSessionResult, BetterAuthUser, BetterAuthSession } from './types';
export {
  isAuthenticated,
  isSuperAdmin,
  isCompanyAdmin,
  isStaff,
  isClientUser,
  hasAdminAccess,
  hasDashboardAccess,
  hasCompanyContext,
} from './types';

/**
 * BetterAuth Server Session
 *
 * December 2025 - Server-side session helpers for BetterAuth
 * February 2026 - Added proper TypeScript types to eliminate `as any` casts
 *
 * Uses direct auth.api.getSession() for fast, in-process auth (no HTTP roundtrip)
 */

/**
 * Get the current session on the server side
 * Call this inside API routes or server components
 *
 * This uses the auth instance directly instead of making HTTP requests,
 * eliminating ~600ms of network latency per call.
 *
 * Returns typed user object with all custom WeddingFlo fields.
 */
export async function getServerSession(): Promise<ServerSessionResult> {
  try {
    const headersList = await headers();

    // Call auth.api.getSession directly - no HTTP roundtrip
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session?.user) {
      return { userId: null, user: null, session: null };
    }

    // Cast to our typed interface - BetterAuth's additionalFields are included in session.user
    const typedUser = session.user as unknown as BetterAuthUser;
    const typedSession = session.session as unknown as BetterAuthSession;

    return {
      userId: typedUser.id ?? null,
      user: typedUser ?? null,
      session: typedSession ?? null,
    };
  } catch {
    return { userId: null, user: null, session: null };
  }
}
