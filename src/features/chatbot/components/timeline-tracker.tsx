'use client'

/**
 * Timeline Tracker Component
 *
 * February 2026 - AI Command Chatbot Feature
 *
 * Real-time timeline display for Day-Of mode:
 * - Status indicators (done/current/upcoming)
 * - Vendor information
 * - Mark complete action
 * - Time display
 */

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  Circle,
  Clock,
  Play,
  User,
} from 'lucide-react'

// ============================================
// TYPES
// ============================================

interface TimelineItem {
  id: string
  title: string
  startTime: Date
  endTime?: Date
  status: 'upcoming' | 'current' | 'completed'
  vendorName?: string
  vendorCategory?: string
}

interface TimelineTrackerProps {
  timeline: TimelineItem[]
  currentItem: TimelineItem | null
  onMarkComplete: (itemId: string) => void
}

// ============================================
// UTILITIES
// ============================================

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ============================================
// COMPONENT
// ============================================

export function TimelineTracker({
  timeline,
  currentItem,
  onMarkComplete,
}: TimelineTrackerProps) {
  if (timeline.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-8 w-8 mx-auto text-mocha-300 mb-2" />
        <p className="text-sm text-mocha-500">No timeline items for today</p>
        <p className="text-xs text-mocha-400 mt-1">
          Add timeline items in the Timeline module
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {timeline.map((item, index) => {
        const isLast = index === timeline.length - 1
        const isCurrent = item.status === 'current'
        const isCompleted = item.status === 'completed'

        return (
          <div key={item.id} className="relative">
            {/* Timeline Line */}
            {!isLast && (
              <div
                className={cn(
                  'absolute left-[15px] top-8 w-0.5 h-[calc(100%-16px)]',
                  isCompleted
                    ? 'bg-green-300 dark:bg-green-700'
                    : 'bg-mocha-200 dark:bg-mocha-700'
                )}
              />
            )}

            {/* Item */}
            <div
              className={cn(
                'relative flex gap-3 p-3 rounded-lg transition-colors',
                isCurrent && 'bg-teal-50 dark:bg-teal-900/20 border-2 border-teal-500',
                isCompleted && 'opacity-60'
              )}
            >
              {/* Status Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {isCompleted ? (
                  <div className="h-7 w-7 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                ) : isCurrent ? (
                  <div className="h-7 w-7 rounded-full bg-teal-500 flex items-center justify-center animate-pulse">
                    <Play className="h-3 w-3 text-white" />
                  </div>
                ) : (
                  <div className="h-7 w-7 rounded-full border-2 border-mocha-300 dark:border-mocha-600 flex items-center justify-center">
                    <Circle className="h-3 w-3 text-mocha-300" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4
                      className={cn(
                        'text-sm font-medium truncate',
                        isCompleted
                          ? 'text-mocha-500 line-through'
                          : 'text-mocha-900 dark:text-mocha-100'
                      )}
                    >
                      {item.title}
                    </h4>

                    {item.vendorName && (
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-mocha-500">
                        <User className="h-3 w-3" />
                        <span>
                          {item.vendorCategory}: {item.vendorName}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Time */}
                  <div className="flex-shrink-0 text-right">
                    <span className="text-xs font-medium text-mocha-600 dark:text-mocha-300">
                      {formatTime(item.startTime)}
                    </span>
                    {item.endTime && (
                      <span className="text-xs text-mocha-400">
                        {' '}
                        - {formatTime(item.endTime)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Current Item Actions */}
                {isCurrent && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-teal-500/20 text-teal-700 dark:text-teal-300 border-0">
                      In Progress
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => onMarkComplete(item.id)}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Done
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default TimelineTracker
