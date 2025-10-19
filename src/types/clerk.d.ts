/**
 * Clerk Custom Session Claims Type Definitions
 *
 * This file extends Clerk's JwtSessionClaims interface to include custom metadata
 * that is synced via webhook (src/app/api/webhooks/clerk/route.ts).
 *
 * The metadata contains:
 * - role: User role for authorization checks (fast - no DB query)
 * - company_id: Company UUID for multi-tenant queries (fast - no DB query)
 *
 * @see https://clerk.com/docs/backend-requests/making/custom-session-token
 */

import type { UserRole } from '@/lib/supabase/types';

export {};

declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: UserRole;
      company_id?: string;
    };
  }
}
