'use client'

import { motion } from 'framer-motion'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  Users,
  CheckCircle2,
  Briefcase,
  Clock,
  Globe,
  PartyPopper,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useState } from 'react'
import { trpc as api } from '@/lib/trpc/client'

interface ProgressItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  isComplete: boolean
  detail?: string
}

interface WeddingProgressBarProps {
  clientId: string
  className?: string
}

export function WeddingProgressBar({ clientId, className }: WeddingProgressBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Fetch progress data from API
  const { data: progressData, isLoading } = api.portal.getWeddingProgress.useQuery(
    { clientId },
    { staleTime: 60000 } // 1 minute
  )

  if (isLoading || !progressData) {
    return (
      <div className={cn('animate-pulse bg-card rounded-xl p-4', className)}>
        <div className="h-4 bg-muted rounded w-3/4 mb-2" />
        <div className="h-2 bg-muted rounded w-full" />
      </div>
    )
  }

  const progressItems: ProgressItem[] = [
    {
      id: 'guests',
      label: 'Guest list',
      icon: Users,
      isComplete: progressData.hasGuests,
      detail: progressData.guestCount > 0 ? `${progressData.guestCount} guests added` : 'Add your guests',
    },
    {
      id: 'rsvps',
      label: 'RSVPs received',
      icon: CheckCircle2,
      isComplete: progressData.rsvpPercentage >= 50,
      detail: `${progressData.rsvpPercentage}% responded`,
    },
    {
      id: 'vendors',
      label: 'Vendors confirmed',
      icon: Briefcase,
      isComplete: progressData.hasVendors,
      detail: progressData.vendorCount > 0 ? `${progressData.confirmedVendors}/${progressData.vendorCount} confirmed` : 'No vendors yet',
    },
    {
      id: 'timeline',
      label: 'Timeline ready',
      icon: Clock,
      isComplete: progressData.hasTimeline,
      detail: progressData.timelineItemCount > 0 ? `${progressData.timelineItemCount} items planned` : 'Create your timeline',
    },
    {
      id: 'website',
      label: 'Website published',
      icon: Globe,
      isComplete: progressData.websitePublished,
      detail: progressData.websitePublished ? 'Live and ready!' : 'Publish your website',
    },
  ]

  const completedCount = progressItems.filter(item => item.isComplete).length
  const totalCount = progressItems.length
  const progressPercentage = Math.round((completedCount / totalCount) * 100)
  const isComplete = completedCount === totalCount

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border border-border bg-card overflow-hidden',
        'shadow-sm',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'p-4 cursor-pointer transition-colors',
          'hover:bg-muted',
          isComplete && 'bg-gradient-to-r from-rose-50 to-gold-50 dark:from-rose-950/30 dark:to-gold-950/30'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {isComplete ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-gold-500 text-primary-foreground">
                <PartyPopper className="h-5 w-5" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-rose-500 text-primary-foreground">
                <span className="text-sm font-bold">{progressPercentage}%</span>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-foreground">
                {isComplete ? 'All set for your big day!' : 'Wedding Planning Progress'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isComplete
                  ? 'Everything is ready for your celebration'
                  : `${completedCount} of ${totalCount} milestones complete`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <Progress
          value={progressPercentage}
          className="h-2"
          variant={isComplete ? 'gold' : 'rose'}
        />
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-border"
        >
          <div className="p-4 space-y-3">
            {progressItems.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg',
                    item.isComplete
                      ? 'bg-rose-50 dark:bg-rose-950/30'
                      : 'bg-muted'
                  )}
                >
                  {item.isComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-rose-500 flex-shrink-0" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-border flex-shrink-0" />
                  )}
                  <Icon className={cn(
                    'h-5 w-5 flex-shrink-0',
                    item.isComplete ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-medium',
                      item.isComplete
                        ? 'text-rose-700 dark:text-rose-400'
                        : 'text-foreground'
                    )}>
                      {item.label}
                    </p>
                    <p className={cn(
                      'text-xs',
                      item.isComplete
                        ? 'text-rose-600/70 dark:text-rose-500/70'
                        : 'text-muted-foreground'
                    )}>
                      {item.detail}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

// Compact version for header/sidebar
export function MiniWeddingProgress({ clientId }: { clientId: string }) {
  const { data: progressData, isLoading } = api.portal.getWeddingProgress.useQuery(
    { clientId },
    { staleTime: 60000 }
  )

  if (isLoading || !progressData) {
    return null
  }

  const items = [
    progressData.hasGuests,
    progressData.rsvpPercentage >= 50,
    progressData.hasVendors,
    progressData.hasTimeline,
    progressData.websitePublished,
  ]

  const completedCount = items.filter(Boolean).length
  const progressPercentage = Math.round((completedCount / items.length) * 100)

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
      <PartyPopper className="h-4 w-4 text-rose-500" />
      <span className="text-xs font-medium text-rose-700 dark:text-rose-400">
        {progressPercentage}% ready
      </span>
      <Progress value={progressPercentage} className="w-16 h-1.5" variant="rose" />
    </div>
  )
}
