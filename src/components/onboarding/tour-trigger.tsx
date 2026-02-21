'use client'

import { useEffect, useState } from 'react'
import { useTour, DASHBOARD_TOUR_STEPS, CLIENT_PORTAL_TOUR_STEPS } from './product-tour'
import { Button } from '@/components/ui/button'
import { HelpCircle } from 'lucide-react'

/**
 * Auto-starts dashboard tour for new users (company_admin)
 * Shows after onboarding is complete
 */
export function DashboardTourTrigger() {
  const { startTour, isActive } = useTour()
  const [hasTriggered, setHasTriggered] = useState(false)

  useEffect(() => {
    // Only trigger once per session
    if (hasTriggered || isActive) return

    // Check if this is a fresh onboarding completion
    const justCompletedOnboarding = sessionStorage.getItem('weddingflo_just_onboarded')

    if (justCompletedOnboarding === 'true') {
      // Clear the flag
      sessionStorage.removeItem('weddingflo_just_onboarded')

      // Small delay to let the dashboard render
      const timer = setTimeout(() => {
        startTour('dashboard-tour', DASHBOARD_TOUR_STEPS)
        setHasTriggered(true)
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [startTour, isActive, hasTriggered])

  return null
}

/**
 * Auto-starts client portal tour for new clients
 */
export function ClientPortalTourTrigger() {
  const { startTour, isActive } = useTour()
  const [hasTriggered, setHasTriggered] = useState(false)

  useEffect(() => {
    if (hasTriggered || isActive) return

    // Check if this is a new client's first visit
    const isFirstVisit = !localStorage.getItem('weddingflo_portal_visited')

    if (isFirstVisit) {
      localStorage.setItem('weddingflo_portal_visited', 'true')

      const timer = setTimeout(() => {
        startTour('client-portal-tour', CLIENT_PORTAL_TOUR_STEPS)
        setHasTriggered(true)
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [startTour, isActive, hasTriggered])

  return null
}

/**
 * Manual tour restart button
 */
interface TourRestartButtonProps {
  tourType: 'dashboard' | 'portal'
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function TourRestartButton({
  tourType,
  variant = 'ghost',
  size = 'sm',
  className
}: TourRestartButtonProps) {
  const { startTour } = useTour()

  const handleClick = () => {
    // Clear the completed tours flag for this specific tour
    const completedTours = localStorage.getItem('weddingflo_completed_tours')
    const completed = completedTours ? JSON.parse(completedTours) : []
    const tourId = tourType === 'dashboard' ? 'dashboard-tour' : 'client-portal-tour'

    const filtered = completed.filter((id: string) => id !== tourId)
    localStorage.setItem('weddingflo_completed_tours', JSON.stringify(filtered))

    // Start the tour
    const steps = tourType === 'dashboard' ? DASHBOARD_TOUR_STEPS : CLIENT_PORTAL_TOUR_STEPS
    startTour(tourId, steps)
  }

  return (
    <Button variant={variant} size={size} onClick={handleClick} className={className}>
      <HelpCircle className="h-4 w-4 mr-2" />
      Take a Tour
    </Button>
  )
}
