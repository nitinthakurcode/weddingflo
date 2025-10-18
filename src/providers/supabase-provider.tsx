'use client'

import { createContext, useContext, useMemo } from 'react'
import { useAuth } from '@clerk/nextjs'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

const SupabaseContext = createContext<SupabaseClient<Database> | null>(null)

/**
 * SupabaseProvider - Native Clerk + Supabase Integration (April 2025+)
 *
 * Uses the new native integration where Supabase directly accepts Clerk session tokens.
 * No JWT templates or manual header manipulation required.
 *
 * Benefits:
 * - No need to create JWT templates in Clerk dashboard
 * - No need to share Supabase JWT secret with Clerk
 * - Tokens are automatically refreshed on each request
 * - Clerk automatically adds "role": "authenticated" claim
 *
 * @see https://clerk.com/docs/integrations/databases/supabase
 */
export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, getToken } = useAuth()

  // Create Supabase client with native Clerk integration (2025)
  // Uses accessToken callback to fetch fresh token per request
  const supabase = useMemo(() => {
    if (!isLoaded) {
      return null  // Return null until Clerk is fully loaded
    }

    return createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        async accessToken() {
          return (await getToken()) ?? null
        },
      }
    )
  }, [isLoaded, getToken])

  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  )
}

/**
 * useSupabase - Hook to access the shared Supabase client
 *
 * Must be used within SupabaseProvider. Returns the singleton Supabase client
 * instance with Clerk authentication automatically configured.
 *
 * IMPORTANT: Returns null until Clerk is fully loaded. Components must handle this:
 * - Check if supabase is null before using
 * - Use enabled: !!supabase in React Query
 * - Show loading state while null
 *
 * @returns SupabaseClient | null
 * @throws Error if used outside SupabaseProvider
 *
 * @example
 * ```tsx
 * 'use client'
 * import { useSupabase } from '@/providers/supabase-provider'
 * import { useQuery } from '@tanstack/react-query'
 *
 * export default function MyComponent() {
 *   const supabase = useSupabase()
 *
 *   const { data, isLoading } = useQuery({
 *     queryKey: ['users'],
 *     queryFn: async () => {
 *       if (!supabase) throw new Error('Supabase not ready')
 *       const { data } = await supabase.from('users').select('*')
 *       return data
 *     },
 *     enabled: !!supabase,  // Only run when client exists
 *   })
 *
 *   if (!supabase || isLoading) return <div>Loading...</div>
 *   return <div>{data}</div>
 * }
 * ```
 */
export function useSupabase(): SupabaseClient<Database> | null {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error('useSupabase must be used within SupabaseProvider')
  }
  return context
}
