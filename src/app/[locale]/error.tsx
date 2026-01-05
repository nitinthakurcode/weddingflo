'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

/**
 * Check if error is a chunk/module loading error
 * These happen when browser cache is stale after deployment
 */
function isChunkLoadError(error: Error): boolean {
  const message = error.message?.toLowerCase() || ''
  const name = error.name?.toLowerCase() || ''

  return (
    message.includes('loading chunk') ||
    message.includes('cannot find module') ||
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('chunkloaderror') ||
    name.includes('chunkloaderror')
  )
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('errorPage')
  const [isChunkError, setIsChunkError] = useState(false)

  useEffect(() => {
    // Check if this is a chunk loading error
    const chunkError = isChunkLoadError(error)
    setIsChunkError(chunkError)

    // Log the error to an error reporting service
    console.error('Application error:', error)

    // Auto-refresh for chunk errors (stale cache after deployment)
    if (chunkError) {
      console.log('Chunk loading error detected, refreshing page...')
      // Add a small delay to avoid rapid refresh loops
      const hasRefreshed = sessionStorage.getItem('chunk_error_refresh')
      if (!hasRefreshed) {
        sessionStorage.setItem('chunk_error_refresh', 'true')
        window.location.reload()
        return
      }
      // Clear the flag after 30 seconds to allow future refreshes
      setTimeout(() => sessionStorage.removeItem('chunk_error_refresh'), 30000)
    }

    // Send to Sentry (skip chunk errors as they're expected during deployments)
    if (typeof window !== 'undefined' && (window as any).Sentry && !chunkError) {
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
            {t('somethingWentWrong')}
          </h1>
          <p className="text-gray-600">
            {t('apologize')}
          </p>
        </div>

        {error.message && (
          <div className="rounded-lg bg-red-50 p-4 text-left">
            <p className="text-sm font-medium text-red-800">{t('errorDetails')}</p>
            <p className="mt-1 text-sm text-red-700">{error.message}</p>
            {error.digest && (
              <p className="mt-2 text-xs text-red-600">{t('errorId', { id: error.digest })}</p>
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
            {t('tryAgain')}
          </Button>

          <Button
            onClick={() => (window.location.href = '/')}
            variant="outline"
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            {t('goHome')}
          </Button>
        </div>

        <p className="text-sm text-gray-500">
          {t('contactSupport')}
        </p>
      </div>
    </div>
  )
}
