'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Dashboard error:', error)

    // You can send to Sentry or other error tracking service
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      ;(window as any).Sentry.captureException(error, {
        tags: { section: 'dashboard' }
      })
    }
  }, [error])

  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-yellow-100 p-3">
            <AlertTriangle className="h-10 w-10 text-yellow-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">
            Dashboard Error
          </h2>
          <p className="text-sm text-muted-foreground">
            We encountered an issue loading this section.
          </p>
        </div>

        {error.message && (
          <div className="rounded-md bg-yellow-50 p-3 text-left">
            <p className="text-xs font-medium text-yellow-800">
              {error.message}
            </p>
            {error.digest && (
              <p className="mt-1 text-xs text-yellow-700">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        <Button
          onClick={reset}
          variant="default"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    </div>
  )
}
