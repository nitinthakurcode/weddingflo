'use client'

/**
 * useRealtimeSync Hook
 *
 * February 2026 - Real-time sync using tRPC subscriptions and Redis pub/sub
 *
 * This hook:
 * - Connects to tRPC subscription for real-time updates
 * - Invalidates TanStack Query cache when sync events arrive
 * - Handles offline recovery via lastSyncTimestamp
 * - Provides connection status for UI indicators
 *
 * Architecture: Replaces old SSE-based use-sync-stream.ts
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { trpc } from '@/lib/trpc/client'
import type { SyncAction } from '@/lib/realtime/redis-pubsub'

const SYNC_TIMESTAMP_KEY = 'weddingflo:lastSyncTimestamp'

interface UseRealtimeSyncOptions {
  /** Whether to enable the sync connection (default: true) */
  enabled?: boolean
  /** Callback when a sync event is received */
  onSync?: (action: SyncAction) => void
  /** Callback when connection status changes */
  onConnectionChange?: (connected: boolean) => void
}

interface UseRealtimeSyncResult {
  /** Whether currently connected to sync stream */
  isConnected: boolean
  /** Last sync timestamp (for offline recovery) */
  lastSync: number
  /** Manually reconnect to the sync stream */
  reconnect: () => void
}

/**
 * Hook for real-time sync between chatbot and module pages
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { isConnected, lastSync } = useRealtimeSync({
 *     onSync: (action) => console.log('Sync event:', action),
 *   })
 *
 *   return (
 *     <div>
 *       {isConnected ? 'Connected' : 'Reconnecting...'}
 *     </div>
 *   )
 * }
 * ```
 */
export function useRealtimeSync(
  options: UseRealtimeSyncOptions = {}
): UseRealtimeSyncResult {
  const { enabled = true, onSync, onConnectionChange } = options
  const queryClient = useQueryClient()
  const [isConnected, setIsConnected] = useState(false)
  const [pendingReconnect, setPendingReconnect] = useState(false)
  const onSyncRef = useRef(onSync)
  const onConnectionChangeRef = useRef(onConnectionChange)
  const seenActionIds = useRef(new Set<string>())

  // Keep refs updated
  useEffect(() => {
    onSyncRef.current = onSync
    onConnectionChangeRef.current = onConnectionChange
  }, [onSync, onConnectionChange])

  // Re-enable subscription after reconnect toggle (S7-L02)
  useEffect(() => {
    if (pendingReconnect) {
      const timer = setTimeout(() => setPendingReconnect(false), 100)
      return () => clearTimeout(timer)
    }
  }, [pendingReconnect])

  // Get last sync timestamp from localStorage
  const [lastSync, setLastSync] = useState<number>(() => {
    if (typeof window === 'undefined') return 0
    const stored = localStorage.getItem(SYNC_TIMESTAMP_KEY)
    return stored ? parseInt(stored, 10) : 0
  })

  /**
   * Invalidate tRPC queries based on query paths from sync event
   */
  const invalidateQueries = useCallback(
    (queryPaths: string[]) => {
      for (const path of queryPaths) {
        const parts = path.split('.')

        try {
          queryClient.invalidateQueries({
            predicate: (query) => {
              const key = query.queryKey
              // Check if this is a tRPC query
              if (Array.isArray(key) && key.length > 0 && Array.isArray(key[0])) {
                const trpcKey = key[0] as string[]
                // Check if it matches the path
                for (let i = 0; i < parts.length; i++) {
                  if (trpcKey[i] !== parts[i]) {
                    return false
                  }
                }
                return true
              }
              return false
            },
          })
          console.log(`[Realtime Sync] Invalidated queries for: ${path}`)
        } catch (error) {
          console.error(`[Realtime Sync] Failed to invalidate ${path}:`, error)
        }
      }
    },
    [queryClient]
  )

  /**
   * Handle incoming sync action
   */
  const handleSyncAction = useCallback(
    (action: SyncAction) => {
      // Deduplicate — skip if already processed (S7-L05)
      if (seenActionIds.current.has(action.id)) return
      seenActionIds.current.add(action.id)
      // Evict old IDs to prevent memory leak (keep last 250)
      if (seenActionIds.current.size > 500) {
        const ids = Array.from(seenActionIds.current)
        seenActionIds.current = new Set(ids.slice(-250))
      }

      // Update timestamp for offline recovery
      setLastSync(action.timestamp)
      if (typeof window !== 'undefined') {
        localStorage.setItem(SYNC_TIMESTAMP_KEY, action.timestamp.toString())
      }

      // Invalidate affected queries
      if (action.queryPaths && action.queryPaths.length > 0) {
        invalidateQueries(action.queryPaths)
      }

      // Call user callback
      onSyncRef.current?.(action)

      console.log(
        `[Realtime Sync] Received: ${action.toolName || action.type} on ${action.module}`,
        action.queryPaths
      )
    },
    [invalidateQueries]
  )

  // Use tRPC subscription
  // Note: tRPC subscriptions use SSE under the hood in v11
  trpc.sync.onSync.useSubscription(
    { lastSyncTimestamp: lastSync || undefined },
    {
      enabled: enabled && !pendingReconnect,
      onStarted() {
        console.log('[Realtime Sync] Connected')
        setIsConnected(true)
        onConnectionChangeRef.current?.(true)
      },
      onData(action) {
        handleSyncAction(action as SyncAction)
      },
      onError(error) {
        console.error('[Realtime Sync] Error:', error)
        setIsConnected(false)
        onConnectionChangeRef.current?.(false)
        // tRPC will automatically attempt to reconnect
      },
    }
  )

  /**
   * Manually trigger reconnection by remounting the subscription
   */
  const reconnect = useCallback(() => {
    console.log('[Realtime Sync] Manual reconnect triggered')
    setPendingReconnect(true)
    setIsConnected(false)
  }, [])

  return {
    isConnected,
    lastSync,
    reconnect,
  }
}

/**
 * Export the sync timestamp key for external use
 */
export { SYNC_TIMESTAMP_KEY }
