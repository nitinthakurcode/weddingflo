'use client';

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { FileQuestion, Home, ArrowLeft } from 'lucide-react'
import { Link } from '@/lib/navigation'

export default function NotFound() {
  const t = useTranslations('notFoundPage')

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary-100 p-4">
            <FileQuestion className="h-12 w-12 text-primary-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl font-bold tracking-tight text-gray-900">404</h1>
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
            {t('pageNotFound')}
          </h2>
          <p className="text-gray-600">
            {t('sorryNotFound')}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/">
            <Button variant="default" className="w-full gap-2 sm:w-auto">
              <Home className="h-4 w-4" />
              {t('goHome')}
            </Button>
          </Link>

          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('goBack')}
          </Button>
        </div>

        <div className="pt-4">
          <p className="text-sm text-gray-500">
            {t('contactSupport')}
          </p>
        </div>
      </div>
    </div>
  )
}
