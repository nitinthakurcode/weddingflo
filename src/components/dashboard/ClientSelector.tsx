'use client'

import { useParams } from 'next/navigation'
import { Link, useRouter } from '@/lib/navigation'
import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Heart, Calendar, ArrowRight, Sparkles, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

// localStorage key for persisting selected client
const SELECTED_CLIENT_KEY = 'weddingflo_selected_client'

export function ClientSelector() {
  const t = useTranslations('common')
  const tClients = useTranslations('clients')
  const router = useRouter()
  const params = useParams()
  const urlClientId = params?.clientId as string | undefined

  // State for persisted client selection
  const [storedClientId, setStoredClientId] = useState<string | undefined>(undefined)

  // On mount, read from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(SELECTED_CLIENT_KEY)
    if (stored) {
      setStoredClientId(stored)
    }
  }, [])

  // When URL has clientId, update localStorage
  useEffect(() => {
    if (urlClientId) {
      localStorage.setItem(SELECTED_CLIENT_KEY, urlClientId)
      setStoredClientId(urlClientId)
    }
  }, [urlClientId])

  // Use URL clientId if available, otherwise use stored
  const currentClientId = urlClientId || storedClientId

  // Fetch all clients
  const { data: clients, isLoading } = trpc.clients.list.useQuery({})

  const handleClientChange = (clientId: string) => {
    // Persist selection
    localStorage.setItem(SELECTED_CLIENT_KEY, clientId)
    setStoredClientId(clientId)
    // Navigate to the selected client's dashboard
    router.push(`/dashboard/clients/${clientId}`)
  }

  if (isLoading) {
    return (
      <div className="px-4 py-3">
        <div className="space-y-2">
          <div className="h-4 w-20 bg-muted/50 animate-pulse rounded" />
          <div className="h-12 bg-muted/30 animate-pulse rounded-xl" />
        </div>
      </div>
    )
  }

  if (!clients || clients.length === 0) {
    return (
      <div className="px-4 py-4">
        <div className="flex flex-col items-center justify-center py-4 px-3 rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 border border-dashed border-muted-foreground/20">
          <Users className="w-8 h-8 text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground text-center">
            {tClients('noClients')}
          </p>
        </div>
      </div>
    )
  }

  // Find current client
  const currentClient = clients.find(c => c.id === currentClientId)

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Section Label */}
      <div className="flex items-center gap-2">
        <Heart className="w-3 h-3 text-rose-400" />
        <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
          {t('activeClient') || 'Active Client'}
        </span>
      </div>

      {/* Client Dropdown */}
      <Select value={currentClientId} onValueChange={handleClientChange}>
        <SelectTrigger
          className={cn(
            "w-full h-auto py-2.5 px-3",
            "bg-gradient-to-br from-background via-primary-50/20 to-secondary-50/10",
            "dark:from-background dark:via-primary-950/20 dark:to-secondary-950/10",
            "border border-primary-200/30 dark:border-primary-800/30",
            "hover:border-primary-300/50 dark:hover:border-primary-700/50",
            "hover:shadow-md hover:shadow-primary-500/5",
            "focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400/50",
            "rounded-xl transition-all duration-300"
          )}
        >
          <div className="flex items-center gap-3 w-full min-w-0">
            {/* Avatar/Icon */}
            <div className={cn(
              "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center",
              "bg-gradient-to-br from-primary-500/20 via-rose-500/15 to-secondary-500/20",
              "border border-primary-200/30 dark:border-primary-700/30"
            )}>
              {currentClient ? (
                <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                  {currentClient.partner1FirstName?.[0] || '?'}
                  {currentClient.partner2FirstName?.[0] || ''}
                </span>
              ) : (
                <Sparkles className="w-4 h-4 text-primary-500/70" />
              )}
            </div>

            {/* Client Info */}
            {currentClient ? (
              <div className="flex flex-col items-start min-w-0 flex-1 text-left">
                <span className="font-semibold text-sm text-foreground truncate w-full leading-tight">
                  {currentClient.partner1FirstName}
                  {currentClient.partner2FirstName && ` & ${currentClient.partner2FirstName}`}
                </span>
                {currentClient.weddingDate && (
                  <span className="text-[11px] text-muted-foreground/80 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    {new Date(currentClient.weddingDate).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">
                {t('selectClient')}
              </span>
            )}
          </div>
        </SelectTrigger>
        <SelectContent className="rounded-xl border-primary-200/30 dark:border-primary-800/30">
          {clients.map((client) => (
            <SelectItem
              key={client.id}
              value={client.id}
              className="rounded-lg focus:bg-primary-50/50 dark:focus:bg-primary-950/50 cursor-pointer"
            >
              <div className="flex items-center gap-3 py-1">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500/10 to-secondary-500/10 flex items-center justify-center border border-primary-200/20">
                  <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                    {client.partner1FirstName?.[0] || '?'}
                    {client.partner2FirstName?.[0] || ''}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">
                    {client.partner1FirstName}{client.partner1LastName && ` ${client.partner1LastName}`}
                    {client.partner2FirstName && ` & ${client.partner2FirstName}`}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {client.weddingDate
                      ? new Date(client.weddingDate).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : t('notSet')}
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* View Details Link - Only when client selected */}
      {currentClientId && (
        <Link
          href={`/dashboard/clients/${currentClientId}`}
          className={cn(
            "w-full group relative overflow-hidden",
            "flex items-center justify-between gap-2 px-3 py-2.5",
            "bg-gradient-to-r from-primary-500/10 via-primary-500/5 to-transparent",
            "hover:from-primary-500/15 hover:via-primary-500/10 hover:to-secondary-500/5",
            "border border-primary-200/40 dark:border-primary-800/40",
            "hover:border-primary-300/60 dark:hover:border-primary-700/60",
            "rounded-xl transition-all duration-300",
            "hover:shadow-lg hover:shadow-primary-500/10"
          )}
        >
          {/* Animated shine effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-500/10 flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
              <Sparkles className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
            </div>
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
              {t('viewDetails') || 'View Planning Dashboard'}
            </span>
          </div>

          <ArrowRight className="w-4 h-4 text-primary-500/70 group-hover:text-primary-600 group-hover:translate-x-1 transition-all duration-300" />
        </Link>
      )}
    </div>
  )
}
