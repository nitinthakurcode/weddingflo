/**
 * Invalidate tRPC queries from a list of dotted query paths (e.g.
 * 'budget.getAll'). Matches any tRPC query whose key prefix equals the path,
 * so 'budget.getAll' invalidates that query for every clientId variant.
 *
 * Shared by the realtime sync consumer (incoming SyncAction) and the global
 * mutation-cache handler (instant local invalidation for the acting tab).
 */
import type { QueryClient } from '@tanstack/react-query'

export function invalidateQueryPaths(queryClient: QueryClient, queryPaths: string[]): void {
  for (const path of queryPaths) {
    const parts = path.split('.')
    try {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey
          // tRPC query keys look like [[router, procedure], { input, type }]
          if (Array.isArray(key) && key.length > 0 && Array.isArray(key[0])) {
            const trpcKey = key[0] as string[]
            for (let i = 0; i < parts.length; i++) {
              if (trpcKey[i] !== parts[i]) return false
            }
            return true
          }
          return false
        },
      })
    } catch (error) {
      console.error(`[Invalidate] Failed to invalidate ${path}:`, error)
    }
  }
}
