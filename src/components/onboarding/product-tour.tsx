'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ============================================================================
// TOUR STEP DEFINITIONS
// ============================================================================

export interface TourStep {
  id: string
  target: string // CSS selector for the element to highlight
  title: string
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  spotlightPadding?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    target: '[data-tour="dashboard-header"]',
    title: 'Welcome to WeddingFlo! 🎉',
    content: 'This is your command center for managing all your wedding planning clients. Let\'s take a quick tour!',
    placement: 'bottom',
  },
  {
    id: 'clients',
    target: '[data-tour="sidebar-clients"]',
    title: 'Client Management',
    content: 'All your wedding clients in one place. Create profiles, track progress, and manage every detail.',
    placement: 'right',
  },
  {
    id: 'timeline',
    target: '[data-tour="sidebar-timeline"]',
    title: 'Timeline Planning',
    content: 'Build detailed day-of timelines with phases, vendor segments, and automatic conflict detection.',
    placement: 'right',
  },
  {
    id: 'ai',
    target: '[data-tour="sidebar-ai"]',
    title: 'AI-Powered Features',
    content: 'Get smart budget predictions, timeline optimization, and AI-generated emails. Your planning assistant!',
    placement: 'right',
  },
  {
    id: 'settings',
    target: '[data-tour="sidebar-settings"]',
    title: 'Settings & Customization',
    content: 'Configure your company branding, email templates, team members, and integrations.',
    placement: 'right',
  },
]

export const CLIENT_PORTAL_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    target: '[data-tour="portal-countdown"]',
    title: 'Your Wedding Countdown! 💒',
    content: 'See exactly how many days until your special day. Share this excitement with your guests!',
    placement: 'bottom',
  },
  {
    id: 'wedding',
    target: '[data-tour="portal-wedding"]',
    title: 'Wedding Details',
    content: 'View your events, timeline, and all the important details your planner has prepared.',
    placement: 'top',
  },
  {
    id: 'chat',
    target: '[data-tour="portal-chat"]',
    title: 'Chat with Your Planner',
    content: 'Message your wedding planner directly. Ask questions, share inspiration, and stay connected.',
    placement: 'top',
  },
]

// ============================================================================
// TOUR CONTEXT
// ============================================================================

interface TourContextType {
  isActive: boolean
  currentStep: number
  steps: TourStep[]
  startTour: (tourId: string, steps: TourStep[]) => void
  endTour: () => void
  nextStep: () => void
  prevStep: () => void
  skipTour: () => void
  tourId: string | null
}

const TourContext = createContext<TourContextType | null>(null)

export function useTour() {
  const context = useContext(TourContext)
  if (!context) {
    throw new Error('useTour must be used within a TourProvider')
  }
  return context
}

// ============================================================================
// TOUR PROVIDER
// ============================================================================

interface TourProviderProps {
  children: ReactNode
}

export function TourProvider({ children }: TourProviderProps) {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [steps, setSteps] = useState<TourStep[]>([])
  const [tourId, setTourId] = useState<string | null>(null)

  const startTour = useCallback((id: string, tourSteps: TourStep[]) => {
    // Check if tour was already completed
    const completedTours = localStorage.getItem('weddingflo_completed_tours')
    const completed = completedTours ? JSON.parse(completedTours) : []

    if (completed.includes(id)) {
      return // Tour already completed, don't start
    }

    setTourId(id)
    setSteps(tourSteps)
    setCurrentStep(0)
    setIsActive(true)
  }, [])

  const markTourComplete = useCallback((id: string) => {
    const completedTours = localStorage.getItem('weddingflo_completed_tours')
    const completed = completedTours ? JSON.parse(completedTours) : []
    if (!completed.includes(id)) {
      completed.push(id)
      localStorage.setItem('weddingflo_completed_tours', JSON.stringify(completed))
    }
  }, [])

  const endTour = useCallback(() => {
    if (tourId) {
      markTourComplete(tourId)
    }
    setIsActive(false)
    setCurrentStep(0)
    setSteps([])
    setTourId(null)
  }, [tourId, markTourComplete])

  const skipTour = useCallback(() => {
    if (tourId) {
      markTourComplete(tourId)
    }
    setIsActive(false)
    setCurrentStep(0)
    setSteps([])
    setTourId(null)
  }, [tourId, markTourComplete])

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      endTour()
    }
  }, [currentStep, steps.length, endTour])

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  return (
    <TourContext.Provider
      value={{
        isActive,
        currentStep,
        steps,
        startTour,
        endTour,
        nextStep,
        prevStep,
        skipTour,
        tourId,
      }}
    >
      {children}
      {isActive && <TourOverlay />}
    </TourContext.Provider>
  )
}

// ============================================================================
// TOUR OVERLAY (Spotlight + Tooltip)
// ============================================================================

function TourOverlay() {
  const { steps, currentStep, nextStep, prevStep, skipTour, endTour } = useTour()
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [mounted, setMounted] = useState(false)

  const step = steps[currentStep]

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (!step) return

    const updatePosition = () => {
      const element = document.querySelector(step.target)
      if (element) {
        const rect = element.getBoundingClientRect()
        setTargetRect(rect)

        // Scroll element into view if needed
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }

    updatePosition()

    // Update on resize/scroll
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [step])

  if (!mounted || !step) return null

  const padding = step.spotlightPadding ?? 8

  // Calculate tooltip position
  const getTooltipPosition = () => {
    if (!targetRect) return { top: '50%', left: '50%' }

    const placement = step.placement || 'bottom'
    const tooltipWidth = 320
    const tooltipHeight = 180
    const offset = 16

    switch (placement) {
      case 'top':
        return {
          top: targetRect.top - tooltipHeight - offset,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        }
      case 'bottom':
        return {
          top: targetRect.bottom + offset,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        }
      case 'left':
        return {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.left - tooltipWidth - offset,
        }
      case 'right':
        return {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.right + offset,
        }
      default:
        return {
          top: targetRect.bottom + offset,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        }
    }
  }

  const tooltipPos = getTooltipPosition()

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999]">
        {/* Dark overlay with spotlight cutout */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60"
          onClick={skipTour}
        />

        {/* Spotlight */}
        {targetRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute rounded-lg ring-4 ring-primary/50 ring-offset-2"
            style={{
              top: targetRect.top - padding,
              left: targetRect.left - padding,
              width: targetRect.width + padding * 2,
              height: targetRect.height + padding * 2,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Tooltip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className={cn(
            'absolute w-80 rounded-xl bg-white p-5 shadow-2xl',
            'border border-gray-100'
          )}
          style={{
            top: typeof tooltipPos.top === 'number' ? tooltipPos.top : tooltipPos.top,
            left: typeof tooltipPos.left === 'number' ? tooltipPos.left : tooltipPos.left,
          }}
        >
          {/* Header */}
          <div className="mb-3 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-gray-900">{step.title}</h3>
            </div>
            <button
              onClick={skipTour}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <p className="mb-4 text-sm text-gray-600">{step.content}</p>

          {/* Custom action */}
          {step.action && (
            <Button
              variant="outline"
              size="sm"
              className="mb-4 w-full"
              onClick={step.action.onClick}
            >
              {step.action.label}
            </Button>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    'h-1.5 w-6 rounded-full transition-colors',
                    index === currentStep ? 'bg-primary' : 'bg-gray-200'
                  )}
                />
              ))}
            </div>

            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button variant="ghost" size="sm" onClick={prevStep}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <Button size="sm" onClick={nextStep}>
                {currentStep === steps.length - 1 ? (
                  'Finish'
                ) : (
                  <>
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Step counter */}
          <p className="mt-3 text-center text-xs text-gray-400">
            Step {currentStep + 1} of {steps.length}
          </p>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  )
}

// ============================================================================
// TOUR TRIGGER HOOK
// ============================================================================

export function useStartDashboardTour() {
  const { startTour } = useTour()

  return useCallback(() => {
    startTour('dashboard-tour', DASHBOARD_TOUR_STEPS)
  }, [startTour])
}

export function useStartClientPortalTour() {
  const { startTour } = useTour()

  return useCallback(() => {
    startTour('client-portal-tour', CLIENT_PORTAL_TOUR_STEPS)
  }, [startTour])
}

// ============================================================================
// RESET TOURS (for testing)
// ============================================================================

export function resetAllTours() {
  localStorage.removeItem('weddingflo_completed_tours')
}
