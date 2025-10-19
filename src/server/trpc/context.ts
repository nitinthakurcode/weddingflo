import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Roles } from '@/types/globals';
import type { inferAsyncReturnType } from '@trpc/server';

/**
 * Creates the tRPC context for each request.
 *
 * This context provides:
 * - userId: Clerk user ID (null if not authenticated)
 * - role: User role from session claims (fast, no DB query)
 * - companyId: Company ID from session claims (fast, no DB query)
 * - supabase: Supabase client configured with Clerk JWT for RLS
 *
 * IMPORTANT: Uses session claims only (<5ms, no database queries).
 * Session claims are synced via webhook in src/app/api/webhooks/clerk/route.ts
 */
export async function createTRPCContext() {
  const { userId, sessionClaims } = await auth();

  const role = sessionClaims?.metadata?.role as Roles | undefined;
  const companyId = sessionClaims?.metadata?.company_id;

  const supabase = createServerSupabaseClient();

  return {
    userId,
    role,
    companyId,
    supabase,
  };
}

export type Context = inferAsyncReturnType<typeof createTRPCContext>;
