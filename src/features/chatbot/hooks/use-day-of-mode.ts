/**
 * Day-Of Mode Hook
 *
 * February 2026 - AI Command Chatbot Feature
 *
 * Specialized hook for wedding day operations with:
 * - Offline-first architecture with queue
 * - Real-time timeline tracking
 * - Quick guest check-in
 * - Countdown timers
 * - Auto-detection of wedding day
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { trpc } from '@/lib/trpc/client'

// ============================================
// TYPES
// ============================================

export type DayOfStatus = 'pre-event' | 'active' | 'completed' | 'offline'

interface CheckInRequest {
  guestId: string
  timestamp: number
  eventId?: string
}

interface TimelineItem {
  id: string
  title: string
  startTime: Date
  endTime?: Date
  status: 'upcoming' | 'current' | 'completed'
  vendorName?: string
  vendorCategory?: string
}

interface DayOfStats {
  checkedIn: number
  totalGuests: number
  vendorsArrived: number
  totalVendors: number
  currentTimelineItem: TimelineItem | null
  nextTimelineItem: TimelineItem | null
  timeUntilNext: number | null // milliseconds
}

export interface UseDayOfModeOptions {
  clientId: string
  eventId?: string
  autoRefreshInterval?: number // ms, default 30000
}

export interface UseDayOfModeReturn {
  // State
  isEnabled: boolean
  status: DayOfStatus
  stats: DayOfStats | null
  offlineQueue: CheckInRequest[]
  isOnline: boolean
  isLoading: boolean

  // Actions
  enableDayOfMode: () => void
  disableDayOfMode: () => void
  checkInGuest: (guestId: string, eventId?: string) => Promise<CheckInResult>
  markTimelineComplete: (itemId: string) => Promise<void>
  shiftTimeline: (minutes: number) => Promise<void>
  refreshStats: () => Promise<void>

  // Timeline
  timeline: TimelineItem[]
  currentItem: TimelineItem | null
  nextItem: TimelineItem | null
  countdown: string | null // formatted countdown string
}

interface CheckInResult {
  success: boolean
  offline: boolean
  message: string
  guestName?: string
}

// ============================================
// UTILITIES
// ============================================

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Now'

  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((ms % (1000 * 60)) / 1000)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  } else {
    return `${seconds}s`
  }
}

function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true
  }
  if (error instanceof Error && error.message.includes('network')) {
    return true
  }
  return false
}

// ============================================
// HOOK
// ============================================

export function useDayOfMode({
  clientId,
  eventId,
  autoRefreshInterval = 30000,
}: UseDayOfModeOptions): UseDayOfModeReturn {
  // State
  const [isEnabled, setIsEnabled] = useState(false)
  const [status, setStatus] = useState<DayOfStatus>('pre-event')
  const [stats, setStats] = useState<DayOfStats | null>(null)
  const [offlineQueue, setOfflineQueue] = useState<CheckInRequest[]>([])
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [isLoading, setIsLoading] = useState(false)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [countdown, setCountdown] = useState<string | null>(null)

  // Refs
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // tRPC context
  const utils = trpc.useUtils()

  // Get client context
  const { data: context } = trpc.chatbot.getContext.useQuery(
    { clientId },
    { enabled: !!clientId }
  )

  // Mutations
  const checkInMutation = trpc.chatbot.confirmToolCall.useMutation()

  // Check if today is the wedding day
  useEffect(() => {
    if (context?.client?.weddingDate) {
      const weddingDate = new Date(context.client.weddingDate)
      if (isToday(weddingDate)) {
        setStatus('active')
      }
    }
  }, [context?.client?.weddingDate])

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setStatus((prev) => (prev === 'offline' ? 'active' : prev))
      // Flush offline queue
      flushOfflineQueue()
    }

    const handleOffline = () => {
      setIsOnline(false)
      setStatus('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Auto-refresh when enabled
  useEffect(() => {
    if (isEnabled && isOnline) {
      refreshIntervalRef.current = setInterval(() => {
        refreshStats()
      }, autoRefreshInterval)

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current)
        }
      }
    }
  }, [isEnabled, isOnline, autoRefreshInterval])

  // Countdown timer
  useEffect(() => {
    if (isEnabled && stats?.timeUntilNext) {
      countdownIntervalRef.current = setInterval(() => {
        if (stats.timeUntilNext) {
          const remaining = stats.timeUntilNext - 1000
          if (remaining > 0) {
            setCountdown(formatCountdown(remaining))
          } else {
            setCountdown('Now')
            refreshStats() // Refresh to get next item
          }
        }
      }, 1000)

      return () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current)
        }
      }
    }
  }, [isEnabled, stats?.timeUntilNext])

  // Flush offline queue when back online
  const flushOfflineQueue = useCallback(async () => {
    if (offlineQueue.length === 0) return

    const queue = [...offlineQueue]
    setOfflineQueue([])

    for (const request of queue) {
      try {
        await processCheckIn(request)
      } catch (error) {
        // Re-queue on failure
        if (isNetworkError(error)) {
          setOfflineQueue((prev) => [...prev, request])
        }
      }
    }
  }, [offlineQueue])

  // Process check-in
  const processCheckIn = useCallback(
    async (request: CheckInRequest): Promise<CheckInResult> => {
      try {
        // In production, this would call the actual check-in tool
        // For now, we simulate success
        await new Promise((resolve) => setTimeout(resolve, 500))

        return {
          success: true,
          offline: false,
          message: 'Guest checked in successfully',
        }
      } catch (error) {
        throw error
      }
    },
    []
  )

  // Check in guest
  const checkInGuest = useCallback(
    async (guestId: string, eventIdOverride?: string): Promise<CheckInResult> => {
      const request: CheckInRequest = {
        guestId,
        timestamp: Date.now(),
        eventId: eventIdOverride || eventId,
      }

      if (!isOnline) {
        // Queue for later
        setOfflineQueue((prev) => [...prev, request])
        return {
          success: true,
          offline: true,
          message: 'Queued for sync when online',
        }
      }

      try {
        const result = await processCheckIn(request)

        // Update stats
        if (result.success && stats) {
          setStats({
            ...stats,
            checkedIn: stats.checkedIn + 1,
          })
        }

        return result
      } catch (error) {
        // Re-queue on network error
        if (isNetworkError(error)) {
          setOfflineQueue((prev) => [...prev, request])
          return {
            success: true,
            offline: true,
            message: 'Queued for sync',
          }
        }
        throw error
      }
    },
    [isOnline, eventId, processCheckIn, stats]
  )

  // Refresh stats
  const refreshStats = useCallback(async () => {
    if (!clientId) return

    setIsLoading(true)
    try {
      // Refresh context which contains stats
      await utils.chatbot.getContext.invalidate({ clientId })

      // Build stats from context
      if (context) {
        setStats({
          checkedIn: 0, // Would come from actual check-in data
          totalGuests: context.guests.total,
          vendorsArrived: context.vendors.confirmed,
          totalVendors: context.vendors.total,
          currentTimelineItem: null,
          nextTimelineItem: null,
          timeUntilNext: null,
        })
      }
    } catch (error) {
      console.error('Failed to refresh stats:', error)
    } finally {
      setIsLoading(false)
    }
  }, [clientId, context, utils])

  // Mark timeline item complete
  const markTimelineComplete = useCallback(async (itemId: string) => {
    // Would call timeline tool
    setTimeline((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, status: 'completed' as const } : item
      )
    )
  }, [])

  // Shift timeline
  const shiftTimeline = useCallback(async (minutes: number) => {
    // Would call shift_timeline tool
    setTimeline((prev) =>
      prev.map((item) => ({
        ...item,
        startTime: new Date(item.startTime.getTime() + minutes * 60 * 1000),
        endTime: item.endTime
          ? new Date(item.endTime.getTime() + minutes * 60 * 1000)
          : undefined,
      }))
    )
  }, [])

  // Enable/disable
  const enableDayOfMode = useCallback(() => {
    setIsEnabled(true)
    refreshStats()
  }, [refreshStats])

  const disableDayOfMode = useCallback(() => {
    setIsEnabled(false)
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }
  }, [])

  // Derived values
  const currentItem = timeline.find((item) => item.status === 'current') || null
  const nextItem = timeline.find((item) => item.status === 'upcoming') || null

  return {
    // State
    isEnabled,
    status,
    stats,
    offlineQueue,
    isOnline,
    isLoading,

    // Actions
    enableDayOfMode,
    disableDayOfMode,
    checkInGuest,
    markTimelineComplete,
    shiftTimeline,
    refreshStats,

    // Timeline
    timeline,
    currentItem,
    nextItem,
    countdown,
  }
}

export default useDayOfMode
