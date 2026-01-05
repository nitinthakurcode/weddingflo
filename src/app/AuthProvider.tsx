'use client';

import { ReactNode } from 'react';

/**
 * Auth Provider
 *
 * BetterAuth uses cookie-based sessions and doesn't require a React context provider.
 * This component is kept for backwards compatibility during migration.
 *
 * December 2025 - Migrated from Clerk to BetterAuth
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // BetterAuth uses cookies, no provider needed
  return <>{children}</>;
}
