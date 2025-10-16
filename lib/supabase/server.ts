import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'
import type { Database } from './types'

/**
 * Creates a Supabase client for server-side usage with Clerk authentication.
 * This client uses the user's Clerk session token for authenticated requests.
 *
 * Use this in:
 * - Server Components
 * - Server Actions
 * - API Route Handlers
 *
 * @returns Promise resolving to Supabase client instance configured with Clerk auth
 *
 * @example
 * ```tsx
 * // In a Server Component
 * import { createServerSupabaseClient } from '@/lib/supabase/server'
 *
 * export default async function MyServerComponent() {
 *   const supabase = await createServerSupabaseClient()
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
 * // In a Server Action
 * 'use server'
 * import { createServerSupabaseClient } from '@/lib/supabase/server'
 *
 * export async function myServerAction() {
 *   const supabase = await createServerSupabaseClient()
 *   // Use supabase client...
 * }
 * ```
 */
export async function createServerSupabaseClient() {
  const { getToken } = await auth()

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const token = await getToken({ template: 'supabase' })
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: {
        headers: getAuthHeaders as any,
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
