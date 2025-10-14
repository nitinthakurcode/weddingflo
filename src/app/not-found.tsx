import { Button } from '@/components/ui/button'
import { FileQuestion, Home, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-blue-100 p-4">
            <FileQuestion className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl font-bold tracking-tight text-gray-900">404</h1>
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
            Page not found
          </h2>
          <p className="text-gray-600">
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/">
            <Button variant="default" className="w-full gap-2 sm:w-auto">
              <Home className="h-4 w-4" />
              Go home
            </Button>
          </Link>

          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
        </div>

        <div className="pt-4">
          <p className="text-sm text-gray-500">
            If you believe this is a mistake, please contact support.
          </p>
        </div>
      </div>
    </div>
  )
}
