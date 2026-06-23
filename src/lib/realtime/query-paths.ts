/**
 * Shared module → cross-module query-path map.
 *
 * Single source of truth for "when module X changes, which tRPC query paths
 * must be invalidated" — including cross-module cascade targets. Used by:
 *  - the server import/sheets sync (broadcast queryPaths)
 *  - the realtime sync consumer (invalidate on incoming SyncAction)
 *  - the global mutation-cache handler (instant local invalidation for the
 *    acting tab, so cross-module views refresh without waiting on Redis)
 *
 * Keep this dependency-free (no React/query imports) so it is safe to import
 * on both the server and the client.
 */

// Query paths to invalidate per module (includes cross-module cascade paths).
export function getQueryPathsForModule(module: string): string[] {
  const map: Record<string, string[]> = {
    guests: ['guests.getAll', 'guests.getStats', 'guests.getDietaryStats', 'hotels.getAll', 'guestTransport.getAll', 'timeline.getAll', 'budget.getSummary', 'clients.list', 'clients.getAll'],
    budget: ['budget.getAll', 'budget.getSummary', 'vendors.getAll', 'vendors.getStats', 'clients.list', 'clients.getAll'],
    timeline: ['timeline.getAll', 'timeline.getStats'],
    hotels: ['hotels.getAll', 'hotels.getStats', 'timeline.getAll'],
    transport: ['guestTransport.getAll', 'guestTransport.getStats', 'timeline.getAll'],
    guestTransport: ['guestTransport.getAll', 'guestTransport.getStats', 'timeline.getAll'],
    vendors: ['vendors.getAll', 'vendors.getStats', 'budget.getAll', 'budget.getSummary', 'timeline.getAll', 'clients.list', 'clients.getAll'],
    gifts: ['gifts.getAll', 'gifts.getStats'],
    events: ['events.getAll', 'timeline.getAll', 'vendors.getAll', 'budget.getAll', 'clients.list', 'clients.getAll'],
    clients: ['clients.getAll', 'clients.list'],
    floorPlans: ['floorPlans.list', 'floorPlans.getById'],
  }
  return map[module] ?? [`${module}.getAll`]
}

/**
 * Derive the module (tRPC router) name from a tRPC mutation key.
 * tRPC v11 sets `mutationKey = [[router, procedure]]` on every mutation
 * (see @trpc/react-query getMutationKeyInternal).
 */
export function moduleFromTrpcMutationKey(mutationKey: unknown): string | null {
  if (!Array.isArray(mutationKey) || mutationKey.length === 0) return null
  const first = mutationKey[0]
  if (Array.isArray(first)) return typeof first[0] === 'string' ? first[0] : null
  return typeof first === 'string' ? first : null
}
