'use client'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Creates a Supabase client for browser/client-side usage.
 *
 * DEPRECATED: Use useSupabase() hook from SupabaseProvider instead.
 * This ensures the Clerk session token is automatically included.
 *
 * @deprecated Use useSupabase() hook instead
 * @returns Supabase client instance (without authentication)
 *
 * @example
 * ```tsx
 * 'use client'
 * import { useSupabase } from '@/lib/supabase/client'
 *
 * export default function MyComponent() {
 *   const supabase = useSupabase() // Preferred - includes Clerk auth
 *
 *   async function fetchData() {
 *     const { data, error } = await supabase
 *       .from('users')
 *       .select('*')
 *   }
 * }
 * ```
 */
export function createClient() {
  // This creates a client WITHOUT Clerk authentication
  // Use useSupabase() hook instead for authenticated requests
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}

// Re-export useSupabase hook from provider for backward compatibility
export { useSupabase } from '@/providers/supabase-provider'

/**
 * @deprecated Use useSupabase() instead (same functionality, clearer name)
 * @see useSupabase
 */
export { useSupabase as useSupabaseClient } from '@/providers/supabase-provider'
