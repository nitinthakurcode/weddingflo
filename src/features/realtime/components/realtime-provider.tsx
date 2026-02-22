'use client'

/**
 * RealtimeProvider Component
 *
 * February 2026 - Real-time sync context provider
 *
 * This component:
 * - Wraps the dashboard with real-time sync capabilities
 * - Provides connection status via React Context
 * - Handles offline recovery automatically
 *
 * Usage: Add to dashboard layout to enable real-time sync
 */

import { createContext, useContext, type ReactNode } from 'react'
import { useRealtimeSync } from '../hooks/use-realtime-sync'
import type { SyncAction } from '@/lib/realtime/redis-pubsub'

interface RealtimeContextValue {
  /** Whether currently connected to sync stream */
  isConnected: boolean
  /** Last sync timestamp (for debugging/UI) */
  lastSync: number
  /** Manually reconnect to the sync stream */
  reconnect: () => void
}

const RealtimeContext = createContext<RealtimeContextValue>({
  isConnected: false,
  lastSync: 0,
  reconnect: () => {},
})

/**
 * Hook to access realtime sync status
 *
 * @example
 * ```tsx
 * function StatusIndicator() {
 *   const { isConnected } = useRealtimeStatus()
 *   return (
 *     <div className={isConnected ? 'bg-green-500' : 'bg-red-500'} />
 *   )
 * }
 * ```
 */
export function useRealtimeStatus(): RealtimeContextValue {
  return useContext(RealtimeContext)
}

interface RealtimeProviderProps {
  children: ReactNode
  /** Whether to enable real-time sync (default: true) */
  enabled?: boolean
  /** Callback when a sync event is received */
  onSync?: (action: SyncAction) => void
}

/**
 * Provider component for real-time sync
 *
 * Add this to your dashboard layout to enable real-time sync
 * between chatbot and module pages.
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * export default function DashboardLayout({ children }) {
 *   return (
 *     <RealtimeProvider>
 *       {children}
 *     </RealtimeProvider>
 *   )
 * }
 * ```
 */
export function RealtimeProvider({
  children,
  enabled = true,
  onSync,
}: RealtimeProviderProps) {
  const { isConnected, lastSync, reconnect } = useRealtimeSync({
    enabled,
    onSync,
  })

  return (
    <RealtimeContext.Provider value={{ isConnected, lastSync, reconnect }}>
      {children}
    </RealtimeContext.Provider>
  )
}

/**
 * Simple status indicator component
 * Shows a small dot indicating connection status
 */
export function RealtimeStatusIndicator() {
  const { isConnected } = useRealtimeStatus()

  return (
    <div
      className={`w-2 h-2 rounded-full transition-colors ${
        isConnected ? 'bg-green-500' : 'bg-amber-500 animate-pulse'
      }`}
      title={isConnected ? 'Real-time sync connected' : 'Reconnecting...'}
    />
  )
}
