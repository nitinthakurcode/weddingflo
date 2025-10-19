'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, usePathname } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2, Calendar } from 'lucide-react'

export function ClientSelector() {
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const currentClientId = params?.clientId as string | undefined

  // Fetch all clients
  const { data: clients, isLoading } = trpc.clients.list.useQuery({})

  const handleClientChange = (clientId: string) => {
    // Navigate to the selected client's dashboard
    router.push(`/dashboard/clients/${clientId}`)
  }

  if (isLoading) {
    return (
      <div className="px-3 py-2">
        <div className="h-10 bg-muted animate-pulse rounded-md" />
      </div>
    )
  }

  if (!clients || clients.length === 0) {
    return (
      <div className="px-3 py-2 text-center">
        <div className="text-xs text-muted-foreground">
          No clients yet
        </div>
      </div>
    )
  }

  // Find current client
  const currentClient = clients.find(c => c.id === currentClientId)

  return (
    <div className="px-3 py-2">
      <Select value={currentClientId} onValueChange={handleClientChange}>
        <SelectTrigger className="w-full bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20 hover:border-primary/40 transition-colors">
          <div className="flex items-center gap-2 w-full">
            <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
            {currentClient ? (
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="font-medium text-sm truncate w-full">
                  {currentClient.partner1_first_name} {currentClient.partner1_last_name}
                  {currentClient.partner2_first_name && ` & ${currentClient.partner2_first_name} ${currentClient.partner2_last_name}`}
                </span>
                {currentClient.wedding_date && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(currentClient.wedding_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            ) : (
              <SelectValue placeholder="Select a client" />
            )}
          </div>
        </SelectTrigger>
        <SelectContent>
          {clients.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              <div className="flex flex-col">
                <span className="font-medium">
                  {client.partner1_first_name} {client.partner1_last_name}
                  {client.partner2_first_name && ` & ${client.partner2_first_name} ${client.partner2_last_name}`}
                </span>
                <span className="text-xs text-muted-foreground">
                  {client.wedding_date
                    ? new Date(client.wedding_date).toLocaleDateString()
                    : 'No date set'}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
