'use client';

import { ReactNode } from 'react';

/**
 * Auth Loaded Boundary
 *
 * BetterAuth uses cookie-based sessions and doesn't require waiting for auth state.
 * This component is kept for backwards compatibility during migration.
 *
 * December 2025 - Migrated from Clerk to BetterAuth
 */
export function AuthLoadedBoundary({ children }: { children: ReactNode }) {
  // BetterAuth uses cookies, auth is immediately available via getServerSession()
  return <>{children}</>;
}
