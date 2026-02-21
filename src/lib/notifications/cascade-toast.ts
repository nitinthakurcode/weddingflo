/**
 * Cascade Toast Notifications
 *
 * February 2026 - Comprehensive Audit Implementation
 *
 * Utility functions for showing toast notifications when cascade operations
 * happen (auto-creation of related records, sync operations, etc.)
 *
 * Usage:
 * ```typescript
 * import { showCascadeToast, showSyncSummary } from '@/lib/notifications/cascade-toast'
 *
 * // Show single cascade action
 * showCascadeToast('hotel', 'created', 'John Smith')
 *
 * // Show summary of multiple actions
 * showSyncSummary({
 *   hotels: 3,
 *   transport: 2,
 *   timeline: 5,
 * })
 * ```
 */

import { toast } from '@/hooks/use-toast'

/**
 * Types of cascade actions
 */
export type CascadeModule = 'hotel' | 'transport' | 'timeline' | 'budget' | 'guest' | 'vendor' | 'event' | 'accommodation' | 'vehicle'
export type CascadeAction = 'created' | 'updated' | 'deleted' | 'synced'

/**
 * Cascade action result from mutations
 * Used for frontend toast notifications
 */
export interface CascadeActionResult {
  module: CascadeModule | string
  action: CascadeAction
  count: number
  entityNames?: string[]
}

/**
 * Standard mutation result with cascade actions
 */
export interface MutationResultWithCascade<T> {
  data: T
  cascadeActions: CascadeActionResult[]
}

/**
 * Helper to process cascadeActions from mutation response and show appropriate toasts
 *
 * @param cascadeActions - Array of cascade action results from mutation
 */
export function processCascadeActions(cascadeActions: CascadeActionResult[]) {
  if (!cascadeActions || cascadeActions.length === 0) return

  // Convert to SyncCounts format
  const counts: SyncCounts = {}

  for (const action of cascadeActions) {
    const module = action.module
    if (module === 'hotel' || module === 'hotels' || module === 'accommodation') {
      counts.hotels = (counts.hotels || 0) + action.count
    } else if (module === 'transport' || module === 'vehicle') {
      counts.transport = (counts.transport || 0) + action.count
    } else if (module === 'timeline') {
      counts.timeline = (counts.timeline || 0) + action.count
    } else if (module === 'budget') {
      counts.budget = (counts.budget || 0) + action.count
    } else if (module === 'guest' || module === 'guests') {
      counts.guests = (counts.guests || 0) + action.count
    } else if (module === 'vendor' || module === 'vendors') {
      counts.vendors = (counts.vendors || 0) + action.count
    } else if (module === 'guestGifts') {
      counts.guestGifts = (counts.guestGifts || 0) + action.count
    }
  }

  // Determine action type (use first one, typically they're all the same)
  const actionType = cascadeActions[0]?.action || 'created'

  showSyncSummary(counts, actionType)
}

/**
 * Sync result counts for summary display
 */
export interface SyncCounts {
  hotels?: number
  transport?: number
  timeline?: number
  budget?: number
  guests?: number
  vendors?: number
  events?: number
  floorPlans?: number
  guestGifts?: number
}

/**
 * Human-readable labels for modules
 */
const moduleLabels: Record<CascadeModule, string> = {
  hotel: 'Hotel record',
  transport: 'Transport record',
  timeline: 'Timeline entry',
  budget: 'Budget item',
  guest: 'Guest',
  vendor: 'Vendor',
  event: 'Event',
  accommodation: 'Accommodation',
  vehicle: 'Vehicle',
}

/**
 * Past tense of actions for descriptions
 */
const actionLabels: Record<CascadeAction, string> = {
  created: 'auto-created',
  updated: 'updated',
  deleted: 'removed',
  synced: 'synced',
}

/**
 * Show a toast notification for a single cascade action
 *
 * @param module - The module that was affected (hotel, transport, etc.)
 * @param action - The action that was performed
 * @param entityName - Optional name of the entity (e.g., guest name)
 */
export function showCascadeToast(
  module: CascadeModule,
  action: CascadeAction,
  entityName?: string
) {
  const moduleLabel = moduleLabels[module]
  const actionLabel = actionLabels[action]

  const title = action === 'created' ? 'Auto-sync completed' : `${moduleLabel} ${actionLabel}`
  const description = entityName
    ? `${moduleLabel} ${actionLabel} for ${entityName}`
    : `${moduleLabel} ${actionLabel}`

  toast({
    title,
    description,
    variant: action === 'deleted' ? 'warning' : 'success',
    duration: 4000,
  })
}

/**
 * Show a summary toast for multiple cascade actions
 *
 * @param counts - Object with counts for each module
 * @param action - The action that was performed (default: 'synced')
 */
export function showSyncSummary(counts: SyncCounts, action: CascadeAction = 'synced') {
  const parts: string[] = []

  if (counts.hotels && counts.hotels > 0) {
    parts.push(`${counts.hotels} hotel record${counts.hotels > 1 ? 's' : ''}`)
  }
  if (counts.transport && counts.transport > 0) {
    parts.push(`${counts.transport} transport record${counts.transport > 1 ? 's' : ''}`)
  }
  if (counts.timeline && counts.timeline > 0) {
    parts.push(`${counts.timeline} timeline entr${counts.timeline > 1 ? 'ies' : 'y'}`)
  }
  if (counts.budget && counts.budget > 0) {
    parts.push(`${counts.budget} budget item${counts.budget > 1 ? 's' : ''}`)
  }
  if (counts.guests && counts.guests > 0) {
    parts.push(`${counts.guests} guest${counts.guests > 1 ? 's' : ''}`)
  }
  if (counts.vendors && counts.vendors > 0) {
    parts.push(`${counts.vendors} vendor${counts.vendors > 1 ? 's' : ''}`)
  }
  if (counts.floorPlans && counts.floorPlans > 0) {
    parts.push(`${counts.floorPlans} seating assignment${counts.floorPlans > 1 ? 's' : ''}`)
  }
  if (counts.guestGifts && counts.guestGifts > 0) {
    parts.push(`${counts.guestGifts} gift record${counts.guestGifts > 1 ? 's' : ''}`)
  }

  if (parts.length === 0) {
    return // Nothing to show
  }

  const description = parts.join(', ') + ` ${actionLabels[action]}`

  toast({
    title: action === 'deleted' ? 'Cascade cleanup completed' : 'Auto-sync completed',
    description,
    variant: action === 'deleted' ? 'warning' : 'success',
    duration: 5000,
  })
}

/**
 * Show toast for import results
 *
 * @param imported - Number of records imported
 * @param updated - Number of records updated
 * @param errors - Array of error messages (optional)
 */
export function showImportResult(
  imported: number,
  updated: number,
  errors?: string[]
) {
  const total = imported + updated
  const hasErrors = errors && errors.length > 0

  if (total === 0 && !hasErrors) {
    toast({
      title: 'No changes',
      description: 'No records were imported or updated',
      variant: 'info',
      duration: 3000,
    })
    return
  }

  const parts: string[] = []
  if (imported > 0) {
    parts.push(`${imported} created`)
  }
  if (updated > 0) {
    parts.push(`${updated} updated`)
  }
  if (hasErrors) {
    parts.push(`${errors!.length} failed`)
  }

  toast({
    title: hasErrors ? 'Import completed with errors' : 'Import successful',
    description: parts.join(', '),
    variant: hasErrors ? 'warning' : 'success',
    duration: hasErrors ? 6000 : 4000,
  })
}

/**
 * Show toast for deletion cascade
 *
 * @param entityType - Type of entity deleted (client, guest, vendor)
 * @param entityName - Name of the deleted entity
 * @param counts - Cascade deletion counts
 */
export function showDeletionCascade(
  entityType: 'client' | 'guest' | 'vendor',
  entityName: string,
  counts: SyncCounts
) {
  const totalDeleted = Object.values(counts).reduce((sum, count) => sum + (count || 0), 0)

  if (totalDeleted === 0) {
    toast({
      title: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} deleted`,
      description: entityName,
      variant: 'default',
      duration: 3000,
    })
    return
  }

  const parts: string[] = []
  if (counts.hotels && counts.hotels > 0) parts.push(`${counts.hotels} hotel records`)
  if (counts.transport && counts.transport > 0) parts.push(`${counts.transport} transport records`)
  if (counts.timeline && counts.timeline > 0) parts.push(`${counts.timeline} timeline entries`)
  if (counts.budget && counts.budget > 0) parts.push(`${counts.budget} budget items`)
  if (counts.guests && counts.guests > 0) parts.push(`${counts.guests} guests`)
  if (counts.floorPlans && counts.floorPlans > 0) parts.push(`${counts.floorPlans} seating assignments`)
  if (counts.guestGifts && counts.guestGifts > 0) parts.push(`${counts.guestGifts} gift records`)

  toast({
    title: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} deleted`,
    description: `${entityName} and ${parts.join(', ')} cleaned up`,
    variant: 'warning',
    duration: 5000,
  })
}

/**
 * Show error toast for failed sync operation
 *
 * @param operation - Name of the operation that failed
 * @param error - Error message
 */
export function showSyncError(operation: string, error?: string) {
  toast({
    title: 'Sync failed',
    description: error || `Failed to complete ${operation}. Please try again.`,
    variant: 'destructive',
    duration: 6000,
  })
}
