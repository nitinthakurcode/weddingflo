import { cookies } from 'next/headers';
import { betterAuth } from 'better-auth';

/**
 * BetterAuth Server Session
 *
 * December 2025 - Server-side session helpers for BetterAuth
 * Uses cookie-based sessions for fast, secure auth
 */

// Initialize better-auth for server-side operations
// Note: This is a simplified version - full config should be in a separate auth config file
const auth = betterAuth({
  // Config is loaded from environment and auth config
});

/**
 * Get the current session on the server side
 * Call this inside API routes or server components
 */
export async function getServerSession() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('better-auth.session_token');

    if (!sessionCookie?.value) {
      return { userId: null, user: null, session: null };
    }

    // For now, return a placeholder - actual implementation should verify the session
    // with better-auth's session verification
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/get-session`, {
      headers: {
        cookie: `better-auth.session_token=${sessionCookie.value}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return { userId: null, user: null, session: null };
    }

    const data = await response.json();

    return {
      userId: data.user?.id ?? null,
      user: data.user ?? null,
      session: data.session ?? null,
    };
  } catch {
    return { userId: null, user: null, session: null };
  }
}
