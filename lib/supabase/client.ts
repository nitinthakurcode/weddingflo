'use client'

import { createClient } from '@supabase/supabase-js'
import { useSession } from '@clerk/nextjs'
import type { Database } from './types'

/**
 * Hook to create a Supabase client for client-side usage with Clerk authentication.
 * The client automatically injects the Clerk session token for authenticated requests.
 *
 * @returns Supabase client instance configured with Clerk auth
 *
 * @example
 * ```tsx
 * 'use client'
 * import { useSupabaseClient } from '@/lib/supabase/client'
 *
 * export default function MyComponent() {
 *   const supabase = useSupabaseClient()
 *
 *   async function fetchData() {
 *     const { data, error } = await supabase
 *       .from('your_table')
 *       .select('*')
 *   }
 * }
 * ```
 */
export function useSupabaseClient() {
  const { session } = useSession()

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const token = await session?.getToken({ template: 'supabase' })
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: {
        headers: getAuthHeaders as any,
      },
      auth: {
        persistSession: false,
      },
    }
  )
}

/**
 * Alias for useSupabaseClient for convenience.
 * Hook to get a Supabase client instance in React components.
 *
 * @returns Supabase client instance
 *
 * @example
 * ```tsx
 * 'use client'
 * import { useSupabase } from '@/lib/supabase/client'
 *
 * export default function MyComponent() {
 *   const supabase = useSupabase()
 *   // Use supabase client...
 * }
 * ```
 */
export function useSupabase() {
  return useSupabaseClient()
}
