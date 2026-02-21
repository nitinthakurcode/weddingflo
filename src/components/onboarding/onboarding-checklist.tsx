'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  CheckCircle2,
  Circle,
  Users,
  UserPlus,
  Calendar,
  Mail,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  PartyPopper
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { trpc as api } from '@/lib/trpc/client'
import Confetti from 'react-confetti'

// ============================================================================
// CHECKLIST ITEMS DEFINITION
// ============================================================================

interface ChecklistItem {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  checkFn: (data: ChecklistData) => boolean
}

interface ChecklistData {
  hasClients: boolean
  hasTeamMembers: boolean
  hasCalendarConnected: boolean
  hasEmailTemplates: boolean
  hasTimeline: boolean
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'add-client',
    title: 'Add your first client',
    description: 'Create a wedding client to start planning',
    icon: Users,
    href: '/dashboard/clients?action=new',
    checkFn: (data) => data.hasClients,
  },
  {
    id: 'invite-team',
    title: 'Invite a team member',
    description: 'Collaborate with your team on weddings',
    icon: UserPlus,
    href: '/dashboard/team?action=invite',
    checkFn: (data) => data.hasTeamMembers,
  },
  {
    id: 'connect-calendar',
    title: 'Connect Google Calendar',
    description: 'Sync your events automatically',
    icon: Calendar,
    href: '/dashboard/settings/calendar',
    checkFn: (data) => data.hasCalendarConnected,
  },
  {
    id: 'setup-email',
    title: 'Set up email templates',
    description: 'Customize your client communications',
    icon: Mail,
    href: '/dashboard/settings/email',
    checkFn: (data) => data.hasEmailTemplates,
  },
  {
    id: 'create-timeline',
    title: 'Create a timeline',
    description: 'Build your first wedding day schedule',
    icon: Clock,
    href: '/dashboard/clients',
    checkFn: (data) => data.hasTimeline,
  },
]

// ============================================================================
// CHECKLIST COMPONENT
// ============================================================================

interface OnboardingChecklistProps {
  className?: string
}

export function OnboardingChecklist({ className }: OnboardingChecklistProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })

  // Check if checklist was dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('weddingflo_checklist_dismissed')
    if (dismissed === 'true') {
      setIsDismissed(true)
    }

    // Get window size for confetti
    setWindowSize({ width: window.innerWidth, height: window.innerHeight })
  }, [])

  // Fetch checklist status from API
  const { data: checklistStatus, isLoading } = api.onboarding.getChecklistStatus.useQuery(
    undefined,
    {
      refetchOnWindowFocus: true,
      staleTime: 30000, // 30 seconds
    }
  )

  // Calculate completion
  const checklistData: ChecklistData = {
    hasClients: checklistStatus?.hasClients ?? false,
    hasTeamMembers: checklistStatus?.hasTeamMembers ?? false,
    hasCalendarConnected: checklistStatus?.hasCalendarConnected ?? false,
    hasEmailTemplates: checklistStatus?.hasEmailTemplates ?? false,
    hasTimeline: checklistStatus?.hasTimeline ?? false,
  }

  const completedCount = CHECKLIST_ITEMS.filter(item => item.checkFn(checklistData)).length
  const totalCount = CHECKLIST_ITEMS.length
  const progressPercent = Math.round((completedCount / totalCount) * 100)
  const isComplete = completedCount === totalCount

  // Show confetti when all items complete
  useEffect(() => {
    if (isComplete && !isDismissed) {
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [isComplete, isDismissed])

  const handleDismiss = () => {
    localStorage.setItem('weddingflo_checklist_dismissed', 'true')
    setIsDismissed(true)
  }

  const handleItemClick = (href?: string) => {
    if (href) {
      router.push(href)
    }
  }

  // Don't show if dismissed or still loading
  if (isDismissed || isLoading) {
    return null
  }

  return (
    <>
      {/* Confetti */}
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          'rounded-xl border bg-white shadow-lg dark:bg-mocha-900 dark:border-mocha-800',
          'overflow-hidden',
          className
        )}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-mocha-800/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-gold-500 text-white">
              {isComplete ? <PartyPopper className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {isComplete ? 'All set!' : 'Getting Started'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-mocha-400">
                {isComplete
                  ? 'You\'ve completed all setup tasks'
                  : `${completedCount} of ${totalCount} tasks complete`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Progress */}
            <div className="hidden sm:flex items-center gap-2">
              <Progress value={progressPercent} className="w-24 h-2" />
              <span className="text-sm font-medium text-gray-600 dark:text-mocha-300">
                {progressPercent}%
              </span>
            </div>

            {/* Expand/Collapse */}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {/* Dismiss */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
              onClick={(e) => {
                e.stopPropagation()
                handleDismiss()
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Checklist Items */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border-t dark:border-mocha-800 p-4 space-y-2">
                {CHECKLIST_ITEMS.map((item) => {
                  const isCompleted = item.checkFn(checklistData)
                  const Icon = item.icon

                  return (
                    <motion.div
                      key={item.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all',
                        isCompleted
                          ? 'bg-teal-50 dark:bg-teal-950/30'
                          : 'hover:bg-gray-50 dark:hover:bg-mocha-800/50'
                      )}
                      onClick={() => !isCompleted && handleItemClick(item.href)}
                      whileHover={!isCompleted ? { scale: 1.01 } : undefined}
                      whileTap={!isCompleted ? { scale: 0.99 } : undefined}
                    >
                      {/* Status Icon */}
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-teal-500 flex-shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-300 dark:text-mocha-600 flex-shrink-0" />
                      )}

                      {/* Item Icon */}
                      <div className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0',
                        isCompleted
                          ? 'bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-mocha-800 dark:text-mocha-400'
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'font-medium text-sm',
                          isCompleted
                            ? 'text-teal-700 dark:text-teal-400 line-through'
                            : 'text-gray-900 dark:text-white'
                        )}>
                          {item.title}
                        </p>
                        <p className={cn(
                          'text-xs truncate',
                          isCompleted
                            ? 'text-teal-600/70 dark:text-teal-500/70'
                            : 'text-gray-500 dark:text-mocha-400'
                        )}>
                          {item.description}
                        </p>
                      </div>

                      {/* Action indicator */}
                      {!isCompleted && item.href && (
                        <div className="text-xs text-teal-600 dark:text-teal-400 font-medium">
                          Start →
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>

              {/* Footer */}
              {isComplete && (
                <div className="border-t dark:border-mocha-800 p-4 bg-gradient-to-r from-teal-50 to-gold-50 dark:from-teal-950/30 dark:to-gold-950/30">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-mocha-300">
                      You're all set to start planning weddings!
                    </p>
                    <Button size="sm" onClick={handleDismiss}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  )
}

// ============================================================================
// MINI CHECKLIST (for sidebar or header)
// ============================================================================

export function MiniOnboardingChecklist() {
  const { data: checklistStatus, isLoading } = api.onboarding.getChecklistStatus.useQuery(
    undefined,
    { staleTime: 30000 }
  )

  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem('weddingflo_checklist_dismissed')
    if (dismissed === 'true') {
      setIsDismissed(true)
    }
  }, [])

  if (isDismissed || isLoading || !checklistStatus) {
    return null
  }

  const checklistData: ChecklistData = {
    hasClients: checklistStatus.hasClients,
    hasTeamMembers: checklistStatus.hasTeamMembers,
    hasCalendarConnected: checklistStatus.hasCalendarConnected,
    hasEmailTemplates: checklistStatus.hasEmailTemplates,
    hasTimeline: checklistStatus.hasTimeline,
  }

  const completedCount = CHECKLIST_ITEMS.filter(item => item.checkFn(checklistData)).length
  const totalCount = CHECKLIST_ITEMS.length
  const progressPercent = Math.round((completedCount / totalCount) * 100)

  if (completedCount === totalCount) {
    return null // Hide when complete
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800">
      <Sparkles className="h-4 w-4 text-teal-500" />
      <span className="text-xs font-medium text-teal-700 dark:text-teal-400">
        Setup: {progressPercent}%
      </span>
      <Progress value={progressPercent} className="w-16 h-1.5" />
    </div>
  )
}
