import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

/**
 * BetterAuth Server Session
 *
 * December 2025 - Server-side session helpers for BetterAuth
 * Uses direct auth.api.getSession() for fast, in-process auth (no HTTP roundtrip)
 */

/**
 * Get the current session on the server side
 * Call this inside API routes or server components
 *
 * This uses the auth instance directly instead of making HTTP requests,
 * eliminating ~600ms of network latency per call.
 */
export async function getServerSession() {
  try {
    const headersList = await headers();

    // Call auth.api.getSession directly - no HTTP roundtrip
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session?.user) {
      return { userId: null, user: null, session: null };
    }

    return {
      userId: session.user.id ?? null,
      user: session.user ?? null,
      session: session.session ?? null,
    };
  } catch {
    return { userId: null, user: null, session: null };
  }
}
