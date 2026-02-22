/**
 * Realtime Feature Pocket
 *
 * February 2026 - Real-time sync using Redis pub/sub
 *
 * Exports:
 * - RealtimeProvider: Wrap dashboard to enable real-time sync
 * - RealtimeWrapper: Client wrapper for server component layouts
 * - useRealtimeStatus: Access connection status from any component
 * - useRealtimeSync: Low-level hook for custom sync handling
 * - RealtimeStatusIndicator: Visual connection status indicator
 */

// Components
export {
  RealtimeProvider,
  useRealtimeStatus,
  RealtimeStatusIndicator,
} from './components/realtime-provider'

export { RealtimeWrapper } from './components/realtime-wrapper'

// Hooks
export { useRealtimeSync, SYNC_TIMESTAMP_KEY } from './hooks/use-realtime-sync'
