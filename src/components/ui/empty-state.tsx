'use client'

import { LucideIcon, Plus, ArrowRight, Lightbulb, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface EmptyStateAction {
  label: string
  onClick: () => void
  variant?: 'default' | 'outline' | 'ghost' | 'link'
  icon?: LucideIcon
}

interface EmptyStateTip {
  title: string
  description: string
}

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: EmptyStateAction
  secondaryActions?: EmptyStateAction[]
  tips?: EmptyStateTip[]
  variant?: 'default' | 'minimal' | 'illustrated'
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryActions,
  tips,
  variant = 'default',
  className,
}: EmptyStateProps) {
  if (variant === 'minimal') {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8 px-4', className)}>
        {Icon && (
          <Icon className="h-8 w-8 text-muted-foreground mb-3" />
        )}
        <p className="text-sm text-muted-foreground text-center">{title}</p>
        {action && (
          <Button
            onClick={action.onClick}
            variant="link"
            size="sm"
            className="mt-2"
          >
            {action.icon && <action.icon className="h-4 w-4 mr-1" />}
            {action.label}
          </Button>
        )}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4',
        variant === 'illustrated' && 'relative overflow-hidden',
        className
      )}
    >
      {/* Background decoration for illustrated variant */}
      {variant === 'illustrated' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 via-transparent to-gold-50/50 dark:from-rose-950/20 dark:to-gold-950/20" />
          <div className="absolute top-4 right-8 w-20 h-20 bg-rose-200/30 dark:bg-rose-800/20 rounded-full blur-2xl" />
          <div className="absolute bottom-4 left-8 w-24 h-24 bg-gold-200/30 dark:bg-gold-800/20 rounded-full blur-2xl" />
        </>
      )}

      <div className="relative z-10 flex flex-col items-center">
        {/* Icon */}
        {Icon && (
          <div className={cn(
            'mb-4',
            variant === 'illustrated'
              ? 'p-5 rounded-2xl bg-gradient-to-br from-rose-100 to-gold-100 dark:from-rose-900/50 dark:to-gold-900/50 shadow-lg'
              : 'rounded-full bg-muted p-4'
          )}>
            <Icon className={cn(
              'h-10 w-10',
              variant === 'illustrated'
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-muted-foreground'
            )} />
          </div>
        )}

        {/* Title & Description */}
        <h3 className="text-lg font-semibold mb-2 text-center">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
            {description}
          </p>
        )}

        {/* Primary Action */}
        {action && (
          <Button
            onClick={action.onClick}
            size="sm"
            className={cn(
              variant === 'illustrated' &&
              'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-md'
            )}
          >
            {action.icon ? (
              <action.icon className="h-4 w-4 mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            {action.label}
          </Button>
        )}

        {/* Secondary Actions */}
        {secondaryActions && secondaryActions.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
            {secondaryActions.map((secondaryAction, index) => (
              <Button
                key={index}
                onClick={secondaryAction.onClick}
                variant={secondaryAction.variant || 'ghost'}
                size="sm"
              >
                {secondaryAction.icon && (
                  <secondaryAction.icon className="h-4 w-4 mr-1" />
                )}
                {secondaryAction.label}
              </Button>
            ))}
          </div>
        )}

        {/* Contextual Tips */}
        {tips && tips.length > 0 && (
          <div className="mt-8 w-full max-w-lg">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
              <Lightbulb className="h-4 w-4" />
              <span>Quick tips to get started</span>
            </div>
            <div className="space-y-2">
              {tips.map((tip, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tip.title}</p>
                    <p className="text-xs text-muted-foreground">{tip.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Pre-configured empty states for common scenarios
interface PresetEmptyStateProps {
  onAction: () => void
  className?: string
}

export function NoClientsEmptyState({ onAction, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={Sparkles}
      title="No clients yet"
      description="Start your wedding planning journey by adding your first client. Track their events, manage guests, and more."
      action={{
        label: 'Add First Client',
        onClick: onAction,
      }}
      tips={[
        {
          title: 'Add basic info',
          description: 'Enter couple names, wedding date, and contact details',
        },
        {
          title: 'Set up events',
          description: 'Create ceremony, reception, and other wedding events',
        },
        {
          title: 'Invite to portal',
          description: 'Give couples access to view their wedding details',
        },
      ]}
      variant="illustrated"
      className={className}
    />
  )
}

export function NoGuestsEmptyState({ onAction, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={Sparkles}
      title="No guests yet"
      description="Build your guest list to track RSVPs, dietary requirements, and seating arrangements."
      action={{
        label: 'Add Guests',
        onClick: onAction,
      }}
      secondaryActions={[
        {
          label: 'Import from Excel',
          onClick: onAction,
          variant: 'outline',
        },
      ]}
      tips={[
        {
          title: 'Organize by groups',
          description: 'Create groups like "Bride\'s Family" or "College Friends"',
        },
        {
          title: 'Track RSVPs',
          description: 'Send invites and monitor responses in real-time',
        },
      ]}
      variant="illustrated"
      className={className}
    />
  )
}

export function NoEventsEmptyState({ onAction, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={Sparkles}
      title="No events planned"
      description="Create events for the wedding day and celebrations. Each event can have its own timeline, vendors, and guest list."
      action={{
        label: 'Create Event',
        onClick: onAction,
      }}
      tips={[
        {
          title: 'Start with ceremony',
          description: 'Add the main ceremony with time and venue',
        },
        {
          title: 'Add reception',
          description: 'Plan the celebration with catering and entertainment',
        },
      ]}
      variant="illustrated"
      className={className}
    />
  )
}

export function NoVendorsEmptyState({ onAction, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={Sparkles}
      title="No vendors added"
      description="Track all your wedding vendors in one place. Manage contracts, payments, and communications."
      action={{
        label: 'Add Vendor',
        onClick: onAction,
      }}
      tips={[
        {
          title: 'Essential vendors first',
          description: 'Start with venue, photographer, and caterer',
        },
        {
          title: 'Track payments',
          description: 'Record deposits and payment schedules',
        },
      ]}
      variant="illustrated"
      className={className}
    />
  )
}

export function NoBudgetItemsEmptyState({ onAction, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={Sparkles}
      title="No budget items yet"
      description="Create your wedding budget to track spending and stay on target. Categorize expenses and monitor payments."
      action={{
        label: 'Add Budget Item',
        onClick: onAction,
      }}
      tips={[
        {
          title: 'Set your total budget',
          description: 'Define the overall budget before adding items',
        },
        {
          title: 'Use categories',
          description: 'Group items by venue, catering, decor, etc.',
        },
      ]}
      variant="illustrated"
      className={className}
    />
  )
}

export function NoTimelineItemsEmptyState({ onAction, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={Sparkles}
      title="Timeline is empty"
      description="Build your wedding day timeline to keep everything running smoothly. Add activities with times and assigned vendors."
      action={{
        label: 'Add Timeline Item',
        onClick: onAction,
      }}
      secondaryActions={[
        {
          label: 'Use Template',
          onClick: onAction,
          variant: 'outline',
        },
      ]}
      tips={[
        {
          title: 'Work backwards',
          description: 'Start with ceremony time and plan around it',
        },
        {
          title: 'Add buffer time',
          description: 'Include 15-30 min buffers between major events',
        },
      ]}
      variant="illustrated"
      className={className}
    />
  )
}
