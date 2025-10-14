'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)

    // You can send to Sentry or other error tracking service
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      ;(window as any).Sentry.captureException(error)
    }
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 p-4">
            <AlertCircle className="h-12 w-12 text-red-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Something went wrong
          </h1>
          <p className="text-gray-600">
            We apologize for the inconvenience. An unexpected error occurred.
          </p>
        </div>

        {error.message && (
          <div className="rounded-lg bg-red-50 p-4 text-left">
            <p className="text-sm font-medium text-red-800">Error details:</p>
            <p className="mt-1 text-sm text-red-700">{error.message}</p>
            {error.digest && (
              <p className="mt-2 text-xs text-red-600">Error ID: {error.digest}</p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={reset}
            variant="default"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>

          <Button
            onClick={() => (window.location.href = '/')}
            variant="outline"
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Go home
          </Button>
        </div>

        <p className="text-sm text-gray-500">
          If this problem persists, please contact support.
        </p>
      </div>
    </div>
  )
}
