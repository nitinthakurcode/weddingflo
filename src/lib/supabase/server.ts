import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'
import type { Database } from '../database.types'

/**
 * Request-scoped Supabase client for PROTECTED server code paths.
 *
 * IMPORTANT:
 * - Requires Clerk middleware to have run
 * - Requires a valid Clerk session token
 * - Fails fast if the token is missing (no silent fallbacks)
 *
 * Use this in:
 * - Protected Server Components
 * - Protected Server Actions
 * - Protected API Route Handlers
 *
 * @throws Error if user is not authenticated
 * @returns Supabase client instance with Clerk auth
 *
 * @example
 * ```tsx
 * // In a Protected Server Component
 * import { createServerSupabaseClient } from '@/lib/supabase/server'
 *
 * export default async function MyServerComponent() {
 *   const supabase = createServerSupabaseClient()
 *
 *   const { data, error } = await supabase
 *     .from('your_table')
 *     .select('*')
 *
 *   return <div>{JSON.stringify(data)}</div>
 * }
 * ```
 *
 * @example
 * ```tsx
 * // In a Protected Server Action
 * 'use server'
 * import { createServerSupabaseClient } from '@/lib/supabase/server'
 *
 * export async function myServerAction() {
 *   const supabase = createServerSupabaseClient()
 *   // Use supabase client...
 * }
 * ```
 */
export function createServerSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      async accessToken() {
        const { getToken } = await auth()
        // Native integration (2025) - no template needed
        // Session token already includes metadata claims
        const jwt = await getToken()
        if (!jwt) throw new Error("Not authenticated")
        return jwt
      },
    }
  )
}

/**
 * Creates a Supabase admin client for server-side usage with full database access.
 * This client bypasses Row Level Security (RLS) and should be used with caution.
 *
 * ⚠️ WARNING: This client has unrestricted access to your database.
 * Only use for administrative operations that require bypassing RLS.
 *
 * Use cases:
 * - Admin operations that need to access all data
 * - Background jobs and cron tasks
 * - Data migrations
 * - System-level operations
 *
 * @returns Supabase admin client instance with service role key
 *
 * @example
 * ```tsx
 * // In a Server Action (admin only)
 * 'use server'
 * import { createServerSupabaseAdminClient } from '@/lib/supabase/server'
 *
 * export async function adminOnlyAction() {
 *   // Verify user is admin first!
 *   const supabase = createServerSupabaseAdminClient()
 *
 *   const { data, error } = await supabase
 *     .from('your_table')
 *     .select('*') // This bypasses RLS
 * }
 * ```
 */
export function createServerSupabaseAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
