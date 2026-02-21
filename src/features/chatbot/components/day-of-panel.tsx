'use client'

/**
 * Day-Of Panel Component
 *
 * February 2026 - AI Command Chatbot Feature
 *
 * Special UI mode for wedding day operations with:
 * - Timeline tracker with real-time updates
 * - Quick check-in interface
 * - Stats dashboard
 * - Offline indicator
 */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  UserCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Truck,
  Timer,
  WifiOff,
  ChevronRight,
  Search,
  RefreshCw,
  FastForward,
  Loader2,
} from 'lucide-react'
import { useDayOfMode } from '../hooks/use-day-of-mode'
import { QuickCheckIn } from './quick-check-in'
import { TimelineTracker } from './timeline-tracker'

// ============================================
// TYPES
// ============================================

interface DayOfPanelProps {
  clientId: string
  eventId?: string
  onSwitchToChat: () => void
}

// ============================================
// COMPONENT
// ============================================

export function DayOfPanel({ clientId, eventId, onSwitchToChat }: DayOfPanelProps) {
  const t = useTranslations('chatbot')

  // Day-of mode hook
  const {
    stats,
    isOnline,
    isLoading,
    checkInGuest,
    markTimelineComplete,
    shiftTimeline,
    refreshStats,
    timeline,
    currentItem,
    nextItem,
    countdown,
    offlineQueue,
  } = useDayOfMode({ clientId, eventId })

  // Local state
  const [isShifting, setIsShifting] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'checkin' | 'timeline'>('overview')

  // Handle timeline shift
  const handleShiftTimeline = async (minutes: number) => {
    setIsShifting(true)
    try {
      await shiftTimeline(minutes)
    } finally {
      setIsShifting(false)
    }
  }

  const checkedInPercent = stats
    ? Math.round((stats.checkedIn / Math.max(stats.totalGuests, 1)) * 100)
    : 0

  const vendorsArrivedPercent = stats
    ? Math.round((stats.vendorsArrived / Math.max(stats.totalVendors, 1)) * 100)
    : 0

  return (
    <div className="flex flex-col h-full">
      {/* Header with offline indicator */}
      <div className="px-4 py-3 border-b bg-gradient-to-r from-gold-50 to-teal-50 dark:from-gold-950 dark:to-teal-950">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-gold-500 to-teal-500 flex items-center justify-center">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-mocha-900 dark:text-mocha-100">
                Day-Of Mode
              </h2>
              <p className="text-xs text-mocha-500">Wedding Day Operations</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isOnline && (
              <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
            {offlineQueue.length > 0 && (
              <Badge variant="outline" className="text-blue-600 border-blue-300">
                {offlineQueue.length} queued
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onSwitchToChat}
              className="text-xs"
            >
              Chat Mode
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>

        {/* Countdown to next item */}
        {countdown && nextItem && (
          <div className="flex items-center gap-2 text-xs bg-white/50 dark:bg-mocha-900/50 rounded-lg px-3 py-2">
            <Timer className="h-4 w-4 text-teal-500" />
            <span className="text-mocha-600 dark:text-mocha-300">
              Next: <span className="font-medium">{nextItem.title}</span>
            </span>
            <Badge variant="secondary" className="ml-auto">
              {countdown}
            </Badge>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b">
        {(['overview', 'checkin', 'timeline'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 px-4 py-2.5 text-xs font-medium transition-colors',
              'border-b-2 -mb-px',
              activeTab === tab
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-mocha-500 hover:text-mocha-700'
            )}
          >
            {tab === 'overview' && 'Overview'}
            {tab === 'checkin' && 'Check-In'}
            {tab === 'timeline' && 'Timeline'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-3">
                {/* Guests Checked In */}
                <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800">
                  <div className="flex items-center gap-2 mb-2">
                    <UserCheck className="h-4 w-4 text-teal-500" />
                    <span className="text-xs font-medium text-teal-700 dark:text-teal-300">
                      Guests
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-teal-900 dark:text-teal-100">
                    {stats?.checkedIn || 0}
                    <span className="text-sm font-normal text-teal-600">
                      /{stats?.totalGuests || 0}
                    </span>
                  </div>
                  <Progress value={checkedInPercent} className="mt-2 h-1.5" />
                  <span className="text-[10px] text-teal-600">{checkedInPercent}% checked in</span>
                </div>

                {/* Vendors Arrived */}
                <div className="p-3 rounded-lg bg-gold-50 dark:bg-gold-900/30 border border-gold-200 dark:border-gold-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="h-4 w-4 text-gold-500" />
                    <span className="text-xs font-medium text-gold-700 dark:text-gold-300">
                      Vendors
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-gold-900 dark:text-gold-100">
                    {stats?.vendorsArrived || 0}
                    <span className="text-sm font-normal text-gold-600">
                      /{stats?.totalVendors || 0}
                    </span>
                  </div>
                  <Progress value={vendorsArrivedPercent} className="mt-2 h-1.5" />
                  <span className="text-[10px] text-gold-600">{vendorsArrivedPercent}% arrived</span>
                </div>
              </div>

              {/* Current Timeline Item */}
              {currentItem && (
                <div className="p-4 rounded-lg border-2 border-teal-500 bg-teal-50/50 dark:bg-teal-900/20">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-teal-500">Current</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => markTimelineComplete(currentItem.id)}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Mark Done
                    </Button>
                  </div>
                  <h3 className="font-medium text-mocha-900 dark:text-mocha-100">
                    {currentItem.title}
                  </h3>
                  {currentItem.vendorName && (
                    <p className="text-xs text-mocha-500 mt-1">
                      {currentItem.vendorCategory}: {currentItem.vendorName}
                    </p>
                  )}
                </div>
              )}

              {/* Quick Actions */}
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-mocha-500 uppercase tracking-wide">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => setActiveTab('checkin')}
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Check In Guest
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={refreshStats}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => handleShiftTimeline(15)}
                    disabled={isShifting}
                  >
                    {isShifting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FastForward className="h-4 w-4 mr-2" />
                    )}
                    Shift +15 min
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => handleShiftTimeline(-15)}
                    disabled={isShifting}
                  >
                    <FastForward className="h-4 w-4 mr-2 rotate-180" />
                    Shift -15 min
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Check-In Tab */}
          {activeTab === 'checkin' && (
            <QuickCheckIn
              clientId={clientId}
              onCheckIn={checkInGuest}
              isOnline={isOnline}
            />
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <TimelineTracker
              timeline={timeline}
              currentItem={currentItem}
              onMarkComplete={markTimelineComplete}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export default DayOfPanel
