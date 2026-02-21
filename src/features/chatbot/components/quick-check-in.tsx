'use client'

/**
 * Quick Check-In Component
 *
 * February 2026 - AI Command Chatbot Feature
 *
 * Fast guest check-in interface for Day-Of mode:
 * - Search by name or guest number
 * - QR code scan support (placeholder)
 * - Recent check-ins display
 * - Offline queuing
 */

import { useState, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  UserCheck,
  Search,
  QrCode,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Hash,
} from 'lucide-react'

// ============================================
// TYPES
// ============================================

interface QuickCheckInProps {
  clientId: string
  onCheckIn: (guestId: string, eventId?: string) => Promise<{
    success: boolean
    offline: boolean
    message: string
    guestName?: string
  }>
  isOnline: boolean
}

interface RecentCheckIn {
  id: string
  guestName: string
  timestamp: Date
  offline: boolean
}

// ============================================
// COMPONENT
// ============================================

export function QuickCheckIn({ clientId, onCheckIn, isOnline }: QuickCheckInProps) {
  const t = useTranslations('chatbot')
  const inputRef = useRef<HTMLInputElement>(null)

  // State
  const [searchValue, setSearchValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastResult, setLastResult] = useState<{
    success: boolean
    message: string
    offline: boolean
  } | null>(null)
  const [recentCheckIns, setRecentCheckIns] = useState<RecentCheckIn[]>([])

  // Handle check-in
  const handleCheckIn = useCallback(async () => {
    if (!searchValue.trim()) return

    setIsLoading(true)
    setLastResult(null)

    try {
      // Parse input - could be guest number or name
      const isGuestNumber = /^#?\d+$/.test(searchValue.trim())
      const guestId = isGuestNumber
        ? searchValue.replace('#', '').trim()
        : searchValue.trim() // In production, would resolve name to ID

      const result = await onCheckIn(guestId)

      setLastResult({
        success: result.success,
        message: result.message,
        offline: result.offline,
      })

      if (result.success) {
        // Add to recent check-ins
        setRecentCheckIns((prev) => [
          {
            id: guestId,
            guestName: result.guestName || searchValue,
            timestamp: new Date(),
            offline: result.offline,
          },
          ...prev.slice(0, 4), // Keep last 5
        ])

        // Clear input
        setSearchValue('')
        inputRef.current?.focus()
      }
    } catch (error) {
      setLastResult({
        success: false,
        message: error instanceof Error ? error.message : 'Check-in failed',
        offline: false,
      })
    } finally {
      setIsLoading(false)
    }
  }, [searchValue, onCheckIn])

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCheckIn()
    }
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-mocha-700 dark:text-mocha-300">
          Guest Name or Number
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mocha-400" />
            <Input
              ref={inputRef}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter name or #42..."
              className="pl-9"
              disabled={isLoading}
              data-testid="check-in-input"
            />
          </div>
          <Button
            onClick={handleCheckIn}
            disabled={!searchValue.trim() || isLoading}
            className="bg-teal-500 hover:bg-teal-600"
            data-testid="check-in-button"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* QR Scanner Placeholder */}
      <div className="p-4 border-2 border-dashed border-mocha-200 dark:border-mocha-700 rounded-lg text-center">
        <QrCode className="h-8 w-8 mx-auto text-mocha-300 mb-2" />
        <p className="text-xs text-mocha-400">QR Scanner (Coming Soon)</p>
      </div>

      {/* Result Message */}
      {lastResult && (
        <div
          className={cn(
            'p-3 rounded-lg flex items-start gap-2',
            lastResult.success
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
          )}
          data-testid="check-in-status"
        >
          {lastResult.success ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">
              {lastResult.success
                ? lastResult.offline
                  ? 'Queued'
                  : 'Checked In'
                : 'Error'}
            </p>
            <p className="text-xs opacity-80">{lastResult.message}</p>
          </div>
        </div>
      )}

      {/* Recent Check-ins */}
      {recentCheckIns.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-mocha-500 uppercase tracking-wide">
            Recent Check-ins
          </h3>
          <div className="space-y-1">
            {recentCheckIns.map((checkIn) => (
              <div
                key={`${checkIn.id}-${checkIn.timestamp.getTime()}`}
                className="flex items-center justify-between p-2 rounded-lg bg-cloud-50 dark:bg-mocha-800/50"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-mocha-900 dark:text-mocha-100">
                    {checkIn.guestName}
                  </span>
                  {checkIn.offline && (
                    <Badge variant="outline" className="text-xs text-yellow-600">
                      Queued
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-mocha-400">
                  <Clock className="h-3 w-3" />
                  {checkIn.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Helpful Tips */}
      <div className="p-3 bg-cloud-50 dark:bg-mocha-800/50 rounded-lg">
        <h4 className="text-xs font-medium text-mocha-600 dark:text-mocha-300 mb-2">
          Tips
        </h4>
        <ul className="text-xs text-mocha-500 space-y-1">
          <li className="flex items-center gap-2">
            <Hash className="h-3 w-3" />
            Use guest number for faster check-in (e.g., #42)
          </li>
          <li className="flex items-center gap-2">
            <Search className="h-3 w-3" />
            Or search by first/last name
          </li>
          {!isOnline && (
            <li className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="h-3 w-3" />
              Offline - check-ins will sync when connected
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}

export default QuickCheckIn
