'use client'

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from '@/lib/navigation'
import { useParams } from 'next/navigation'

interface ClientModuleHeaderProps {
  title: string
  description?: string
  children?: ReactNode
  showBackButton?: boolean
}

/**
 * ClientModuleHeader - Consistent header for client module pages
 *
 * Provides:
 * - Module title and description
 * - Optional back button to client overview
 * - Slot for action buttons (export, import, add, etc.)
 */
export function ClientModuleHeader({
  title,
  description,
  children,
  showBackButton = true,
}: ClientModuleHeaderProps) {
  const router = useRouter()
  const params = useParams()
  const clientId = params?.clientId as string

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        {showBackButton && clientId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/dashboard/clients/${clientId}`)}
            className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Client
          </Button>
        )}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2">
          {children}
        </div>
      )}
    </div>
  )
}

export default ClientModuleHeader
