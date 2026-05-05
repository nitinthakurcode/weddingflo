'use client';

import { createAuthClient } from 'better-auth/react';
import { twoFactorClient as twoFactorPlugin } from 'better-auth/client/plugins';

/**
 * BetterAuth Client - Core (leaf module, no app imports)
 *
 * This module exists to break the circular import between
 * AuthProvider.tsx and auth-client.ts. It contains ONLY the
 * createAuthClient call and its raw exports.
 *
 * Import chain: auth-client-core (leaf) ← AuthProvider ← auth-client
 *
 * DO NOT import from @/app/ or @/lib/auth-client in this file.
 */
export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL,
  plugins: [twoFactorPlugin()],
});

// Raw exports from BetterAuth client
export const {
  useSession,
  signIn,
  signUp,
  signOut,
} = authClient;
