'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2, Edit, Eye, MessageSquare, Users, Calendar, TrendingUp, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'

// Event brief type for dynamic event creation
interface EventBrief {
  id: string
  dbId?: string // Database ID for existing events
  name: string
  date: string
  venue: string
  start_time: string
  duration_hours: number
  duration_minutes: number
  end_time: string // auto-calculated
  required_vendors: string
  already_booked: boolean
  notes: string
  isNew?: boolean // Track if this is a new event or existing
  isDeleted?: boolean // Track if event should be deleted
}

// Generate unique ID for events
const generateId = () => Math.random().toString(36).substring(2, 11)

// Calculate end time from start time and duration
const calculateEndTime = (startTime: string, durationHours: number, durationMinutes: number): string => {
  if (!startTime) return ''

  const [hours, minutes] = startTime.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + durationHours * 60 + durationMinutes

  const endHours = Math.floor(totalMinutes / 60) % 24
  const endMinutes = totalMinutes % 60

  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
}

// Calculate duration from start and end time
const calculateDuration = (startTime: string, endTime: string): { hours: number, minutes: number } => {
  if (!startTime || !endTime) return { hours: 2, minutes: 0 }

  const [startHours, startMinutes] = startTime.split(':').map(Number)
  const [endHours, endMinutes] = endTime.split(':').map(Number)

  let totalMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes)
  if (totalMinutes < 0) totalMinutes += 24 * 60 // Handle overnight events

  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60
  }
}

// Create empty event brief
const createEmptyEvent = (): EventBrief => ({
  id: generateId(),
  name: '',
  date: '',
  venue: '',
  start_time: '',
  duration_hours: 2,
  duration_minutes: 0,
  end_time: '',
  required_vendors: '',
  already_booked: false,
  notes: '',
  isNew: true,
})

export default function ClientsPage() {
  const t = useTranslations('clients')
  const tc = useTranslations('common')
  const router = useRouter()
  const { toast } = useToast()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<any>(null)
  const [familyDetailsOpen, setFamilyDetailsOpen] = useState(false)
  const [eventBriefOpen, setEventBriefOpen] = useState(true)

  // Form state for basic info
  const [formData, setFormData] = useState({
    bride_name: '',
    groom_name: '',
    wedding_name: '',
    wedding_date: '',
    venue: '',
    email: '',
    phone: '',
    notes: '',
    // Family details (optional)
    bride_father_name: '',
    bride_mother_name: '',
    groom_father_name: '',
    groom_mother_name: '',
    // Planning context
    planning_side: 'both' as 'bride_side' | 'groom_side' | 'both',
    wedding_type: 'traditional' as 'traditional' | 'destination' | 'intimate' | 'elopement' | 'multi_day' | 'cultural',
  })

  // Event briefs state
  const [eventBriefs, setEventBriefs] = useState<EventBrief[]>([createEmptyEvent()])

  const utils = trpc.useUtils()

  // Queries
  const { data: clients, isLoading } = trpc.clients.list.useQuery({})

  // Get events for this month to calculate "Active This Month" stat
  const { data: eventsThisMonth } = trpc.events.getEventsThisMonth.useQuery()

  // Calculate stats - "Active This Month" counts clients with ANY event this month
  const stats = {
    total: clients?.length || 0,
    upcoming: clients?.filter(c => {
      if (!c.weddingDate) return false
      const weddingDate = new Date(c.weddingDate)
      return weddingDate > new Date()
    }).length || 0,
    // Count unique clients who have events this month
    activeThisMonth: eventsThisMonth
      ? new Set(eventsThisMonth.map(e => e.clientId)).size
      : 0,
  }

  // Mutations
  const createMutation = trpc.clients.create.useMutation({
    onSuccess: async (newClient) => {
      toast({ title: t('clientAdded') })

      // Create events for the new client
      const validEvents = eventBriefs.filter(e => e.name && e.date)
      if (validEvents.length > 0) {
        // Use Promise.all to create all events and then auto-create vendors
        await Promise.all(validEvents.map(async (event) => {
          // Build notes with vendor info
          let eventNotes = event.notes || ''
          if (event.required_vendors) {
            eventNotes += (eventNotes ? '\n\n' : '') + `Required Vendors: ${event.required_vendors}`
          }
          if (event.already_booked) {
            eventNotes += (eventNotes ? '\n\n' : '') + '[Vendors Already Booked]'
          }

          try {
            // Create event and get the event ID back
            const createdEvent = await createEventMutation.mutateAsync({
              clientId: newClient.id,
              title: event.name,
              eventDate: event.date,
              venueName: event.venue || undefined,
              startTime: event.start_time || undefined,
              endTime: event.end_time || undefined,
              notes: eventNotes || undefined,
            })

            // Auto-create vendors from comma-separated list if provided
            // Skip if "already_booked" is checked (vendors already exist)
            if (event.required_vendors && !event.already_booked && createdEvent?.id) {
              const vendorResult = await bulkCreateVendorsMutation.mutateAsync({
                clientId: newClient.id,
                eventId: createdEvent.id,
                vendorNames: event.required_vendors,
              })
              if (vendorResult.created > 0) {
                toast({
                  title: t('vendorsAutoCreated') || 'Vendors Auto-Created',
                  description: `${vendorResult.created} vendor(s) added for ${event.name}`,
                })
              }
            }
          } catch (error) {
            console.error('Failed to create event or vendors:', error)
          }
        }))
      }

      resetForm()
      setIsAddDialogOpen(false)

      // Invalidate AFTER closing dialog to ensure fresh data on next render
      // Include events and vendors since we may have auto-created them
      await Promise.all([
        utils.clients.list.invalidate(),
        utils.events.invalidate(), // Auto-created events need to show up
        utils.vendors.invalidate(), // Auto-created vendors need to show up
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: async () => {
      // Handle event updates after client update succeeds
      if (editingClient) {
        const currentEventDbIds = new Set(eventBriefs.filter(e => e.dbId).map(e => e.dbId!))

        // Delete events that were removed
        originalEventIds.forEach(dbId => {
          if (!currentEventDbIds.has(dbId)) {
            deleteEventMutation.mutate({ id: dbId })
          }
        })

        // Create or update events with vendor auto-creation
        await Promise.all(eventBriefs.map(async (event) => {
          if (!event.name || !event.date) return // Skip empty events

          // Build notes with vendor info
          let eventNotes = event.notes || ''
          if (event.required_vendors) {
            eventNotes += (eventNotes ? '\n\n' : '') + `Required Vendors: ${event.required_vendors}`
          }
          if (event.already_booked) {
            eventNotes += (eventNotes ? '\n\n' : '') + '[Vendors Already Booked]'
          }

          if (event.dbId) {
            // Update existing event
            updateEventMutation.mutate({
              id: event.dbId,
              data: {
                title: event.name,
                eventDate: event.date,
                venueName: event.venue || undefined,
                startTime: event.start_time || undefined,
                endTime: event.end_time || undefined,
                notes: eventNotes || undefined,
              },
            })
          } else {
            try {
              // Create new event and get the event ID back
              const createdEvent = await createEventMutation.mutateAsync({
                clientId: editingClient.id,
                title: event.name,
                eventDate: event.date,
                venueName: event.venue || undefined,
                startTime: event.start_time || undefined,
                endTime: event.end_time || undefined,
                notes: eventNotes || undefined,
              })

              // Auto-create vendors from comma-separated list if provided
              // Skip if "already_booked" is checked (vendors already exist)
              if (event.required_vendors && !event.already_booked && createdEvent?.id) {
                const vendorResult = await bulkCreateVendorsMutation.mutateAsync({
                  clientId: editingClient.id,
                  eventId: createdEvent.id,
                  vendorNames: event.required_vendors,
                })
                if (vendorResult.created > 0) {
                  toast({
                    title: t('vendorsAutoCreated') || 'Vendors Auto-Created',
                    description: `${vendorResult.created} vendor(s) added for ${event.name}`,
                  })
                }
              }
            } catch (error) {
              console.error('Failed to create event or vendors:', error)
            }
          }
        }))
      }

      toast({ title: t('clientUpdated') })
      setEditingClient(null)
      resetForm()

      // Invalidate caches AFTER state reset to ensure fresh data
      // Use events.invalidate() to refresh ALL event queries including getEventsThisMonth
      await Promise.all([
        utils.clients.list.invalidate(),
        utils.events.invalidate(),
        utils.vendors.invalidate(), // Auto-created vendors need to show up
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: async () => {
      toast({ title: t('clientDeleted') })
      // Invalidate both clients and events (client's events should also be removed)
      await Promise.all([
        utils.clients.list.invalidate(),
        utils.events.invalidate(),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  // Event mutations
  const createEventMutation = trpc.events.create.useMutation({
    onError: (error) => {
      console.error('Failed to create event:', error.message)
    },
  })

  // Vendor mutations
  const bulkCreateVendorsMutation = trpc.vendors.bulkCreateFromCommaList.useMutation({
    onError: (error) => {
      console.error('Failed to auto-create vendors:', error.message)
    },
  })

  const updateEventMutation = trpc.events.update.useMutation({
    onError: (error) => {
      console.error('Failed to update event:', error.message)
    },
  })

  const deleteEventMutation = trpc.events.delete.useMutation({
    onError: (error) => {
      console.error('Failed to delete event:', error.message)
    },
  })

  // Track original events for comparison during edit
  const [originalEventIds, setOriginalEventIds] = useState<Set<string>>(new Set())

  const resetForm = () => {
    setFormData({
      bride_name: '',
      groom_name: '',
      wedding_name: '',
      wedding_date: '',
      venue: '',
      email: '',
      phone: '',
      notes: '',
      bride_father_name: '',
      bride_mother_name: '',
      groom_father_name: '',
      groom_mother_name: '',
      planning_side: 'both',
      wedding_type: 'traditional',
    })
    setEventBriefs([createEmptyEvent()])
    setOriginalEventIds(new Set())
    setFamilyDetailsOpen(false)
    setEventBriefOpen(true)
  }

  // Event brief handlers
  const addEvent = useCallback(() => {
    setEventBriefs(prev => [...prev, createEmptyEvent()])
  }, [])

  const removeEvent = useCallback((id: string) => {
    setEventBriefs(prev => prev.filter(e => e.id !== id))
  }, [])

  const updateEvent = useCallback((id: string, field: keyof EventBrief, value: any) => {
    setEventBriefs(prev => prev.map(event => {
      if (event.id !== id) return event

      const updated = { ...event, [field]: value }

      // Auto-calculate end time when start time or duration changes
      if (field === 'start_time' || field === 'duration_hours' || field === 'duration_minutes') {
        updated.end_time = calculateEndTime(
          field === 'start_time' ? value : updated.start_time,
          field === 'duration_hours' ? value : updated.duration_hours,
          field === 'duration_minutes' ? value : updated.duration_minutes
        )
      }

      return updated
    }))
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Parse names - split on whitespace and handle single-word names
    const brideParts = formData.bride_name.trim().split(/\s+/)
    const groomParts = formData.groom_name.trim().split(/\s+/)

    // For single-word names, leave last name empty
    const partner1_first_name = brideParts[0] || ''
    const partner1_last_name = brideParts.length > 1 ? brideParts.slice(1).join(' ') : ''
    const partner2_first_name = groomParts[0] || ''
    const partner2_last_name = groomParts.length > 1 ? groomParts.slice(1).join(' ') : ''

    if (editingClient) {
      // For updates, send all fields using snake_case to match router schema
      const updateData: {
        id: string
        partner1_first_name?: string
        partner1_last_name?: string
        partner1_email?: string
        partner1_phone?: string
        partner1_father_name?: string
        partner1_mother_name?: string
        partner2_first_name?: string
        partner2_last_name?: string
        partner2_father_name?: string
        partner2_mother_name?: string
        wedding_name?: string
        wedding_date?: string
        venue?: string
        notes?: string
        planning_side?: 'bride_side' | 'groom_side' | 'both'
        wedding_type?: 'traditional' | 'destination' | 'intimate' | 'elopement' | 'multi_day' | 'cultural'
      } = {
        id: editingClient.id,
        // Always send name fields to allow clearing
        partner1_first_name: partner1_first_name,
        partner1_last_name: partner1_last_name,
        partner2_first_name: partner2_first_name,
        partner2_last_name: partner2_last_name,
      }

      // Send all fields (empty string will be transformed to null by router)
      updateData.partner1_email = formData.email || undefined
      updateData.partner1_phone = formData.phone || undefined
      updateData.wedding_name = formData.wedding_name || undefined
      updateData.wedding_date = formData.wedding_date || undefined
      updateData.venue = formData.venue || undefined
      updateData.notes = formData.notes || undefined
      // Family details
      updateData.partner1_father_name = formData.bride_father_name || undefined
      updateData.partner1_mother_name = formData.bride_mother_name || undefined
      updateData.partner2_father_name = formData.groom_father_name || undefined
      updateData.partner2_mother_name = formData.groom_mother_name || undefined
      updateData.planning_side = formData.planning_side
      updateData.wedding_type = formData.wedding_type

      updateMutation.mutate(updateData)
    } else {
      // For creates, all required fields must be sent
      // If email is empty, show error
      if (!formData.email) {
        toast({ title: tc('error'), description: t('emailRequired'), variant: 'destructive' })
        return
      }

      const createData = {
        partner1_first_name,
        partner1_last_name,
        partner1_email: formData.email,
        partner1_phone: formData.phone || undefined,
        partner1_father_name: formData.bride_father_name || undefined,
        partner1_mother_name: formData.bride_mother_name || undefined,
        partner2_first_name: partner2_first_name || undefined,
        partner2_last_name: partner2_last_name || undefined,
        partner2_father_name: formData.groom_father_name || undefined,
        partner2_mother_name: formData.groom_mother_name || undefined,
        wedding_name: formData.wedding_name || undefined,
        wedding_date: formData.wedding_date || undefined,
        venue: formData.venue || undefined,
        notes: formData.notes || undefined,
        planning_side: formData.planning_side,
        wedding_type: formData.wedding_type,
      }

      createMutation.mutate(createData)
    }
  }

  const handleEdit = async (client: any) => {
    setEditingClient(client)

    // Format wedding date for the date input (YYYY-MM-DD)
    let formattedDate = ''
    if (client.weddingDate) {
      const date = new Date(client.weddingDate)
      formattedDate = date.toISOString().split('T')[0]
    }

    setFormData({
      bride_name: `${client.partner1FirstName || ''} ${client.partner1LastName || ''}`.trim(),
      groom_name: `${client.partner2FirstName || ''} ${client.partner2LastName || ''}`.trim(),
      wedding_name: client.weddingName || '',
      wedding_date: formattedDate,
      venue: client.venue || '',
      email: client.partner1Email || '',
      phone: client.partner1Phone || '',
      notes: client.notes || '',
      bride_father_name: client.partner1FatherName || '',
      bride_mother_name: client.partner1MotherName || '',
      groom_father_name: client.partner2FatherName || '',
      groom_mother_name: client.partner2MotherName || '',
      planning_side: client.planningSide || 'both',
      wedding_type: client.weddingType || 'traditional',
    })

    // Open family details if any are filled
    if (client.partner1FatherName || client.partner1MotherName ||
        client.partner2FatherName || client.partner2MotherName) {
      setFamilyDetailsOpen(true)
    }

    // Load existing events for this client
    try {
      const events = await utils.events.getAll.fetch({ clientId: client.id })
      if (events && events.length > 0) {
        // Convert database events to EventBrief format
        // Note: Drizzle returns camelCase field names (eventDate, venueName, startTime, endTime)
        const loadedEvents: EventBrief[] = events.map((event: any) => {
          // Parse notes to extract required_vendors and already_booked
          let required_vendors = ''
          let already_booked = false
          let cleanNotes = event.notes || ''

          if (cleanNotes.includes('Required Vendors:')) {
            const match = cleanNotes.match(/Required Vendors:\s*([^\n]+)/)
            if (match) {
              required_vendors = match[1].trim()
              cleanNotes = cleanNotes.replace(/Required Vendors:\s*[^\n]+\n?/, '').trim()
            }
          }
          if (cleanNotes.includes('[Vendors Already Booked]')) {
            already_booked = true
            cleanNotes = cleanNotes.replace(/\[Vendors Already Booked\]\n?/, '').trim()
          }

          // Calculate duration from start and end time (using camelCase field names from Drizzle)
          const duration = calculateDuration(event.startTime || '', event.endTime || '')

          return {
            id: generateId(),
            dbId: event.id,
            name: event.title || '',
            date: event.eventDate || '', // camelCase from Drizzle
            venue: event.venueName || '', // camelCase from Drizzle
            start_time: event.startTime || '', // camelCase from Drizzle
            duration_hours: duration.hours,
            duration_minutes: duration.minutes,
            end_time: event.endTime || '', // camelCase from Drizzle
            required_vendors,
            already_booked,
            notes: cleanNotes,
            isNew: false,
          }
        })
        setEventBriefs(loadedEvents)
        setOriginalEventIds(new Set(events.map((e: any) => e.id)))
        setEventBriefOpen(true)
      } else {
        // No existing events, start with empty one
        setEventBriefs([createEmptyEvent()])
        setOriginalEventIds(new Set())
      }
    } catch (error) {
      console.error('Failed to load events:', error)
      setEventBriefs([createEmptyEvent()])
      setOriginalEventIds(new Set())
    }
  }

  const handleDelete = (id: string) => {
    if (confirm(t('deleteConfirmation'))) {
      deleteMutation.mutate({ id })
    }
  }

  const handleViewDetails = (clientId: string) => {
    router.push(`/dashboard/clients/${clientId}`)
  }

  const handleChat = (clientId: string) => {
    router.push(`/portal/chat?clientId=${clientId}`)
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <p>{tc('loading')}</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('addClient')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title={t('totalClients')}
          value={stats.total}
          icon={<Users className="w-4 h-4" />}
          color="teal"
        />
        <StatCard
          title={t('upcomingWeddings')}
          value={stats.upcoming}
          icon={<Calendar className="w-4 h-4" />}
          color="gold"
        />
        <StatCard
          title={t('activeThisMonth')}
          value={stats.activeThisMonth}
          icon={<TrendingUp className="w-4 h-4" />}
          color="sage"
        />
      </div>

      {/* Client Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4">{t('allClients')}</h2>
        {clients?.length === 0 ? (
          <Card variant="glass" className="border border-primary-200/50 dark:border-primary-800/30 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                {t('noClientsYet')}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients?.map((client) => (
              <Card
                key={client.id}
                variant="glass"
                className="group hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 border border-teal-200/50 dark:border-teal-800/30 shadow-lg shadow-teal-500/10 hover:shadow-xl hover:shadow-teal-500/20 bg-gradient-to-br from-white via-teal-50/20 to-white dark:from-mocha-900 dark:via-teal-950/20 dark:to-mocha-900"
              >
                <CardHeader>
                  <CardTitle className="text-lg bg-gradient-to-r from-teal-700 to-gold-600 bg-clip-text text-transparent">
                    {client.weddingName || `${client.partner1FirstName} & ${client.partner2FirstName}`}
                  </CardTitle>
                  {client.weddingName && (
                    <p className="text-sm text-muted-foreground">
                      {client.partner1FirstName}{client.partner1LastName && ` ${client.partner1LastName}`}
                      {client.partner2FirstName && ` & ${client.partner2FirstName}`}{client.partner2LastName && ` ${client.partner2LastName}`}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {client.weddingDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {new Date(client.weddingDate).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                    {client.venue && (
                      <p className="text-sm text-muted-foreground truncate" title={client.venue}>
                        {client.venue}
                      </p>
                    )}
                    {client.partner1Email && (
                      <p className="text-sm text-muted-foreground truncate" title={client.partner1Email}>
                        {client.partner1Email}
                      </p>
                    )}
                    {client.partner1Phone && (
                      <p className="text-sm text-muted-foreground">
                        {client.partner1Phone}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleViewDetails(client.id)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      {tc('view')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleChat(client.id)}
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      {tc('chat')}
                    </Button>
                  </div>

                  {/* Edit/Delete Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(client)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      {tc('edit')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(client.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        open={isAddDialogOpen || !!editingClient}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false)
            setEditingClient(null)
            resetForm()
          }
        }}
      >
        <DialogContent variant="luxury" size="lg" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? t('editClient') : t('addNewClient')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Wedding Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">{t('weddingDetails') || 'Wedding Details'}</h3>

              {/* Wedding Name (Optional) */}
              <div>
                <Label htmlFor="wedding_name">{t('weddingName') || 'Wedding Name'}</Label>
                <Input
                  id="wedding_name"
                  placeholder={t('weddingNamePlaceholder') || 'e.g., Smith & Johnson Wedding'}
                  value={formData.wedding_name}
                  onChange={(e) =>
                    setFormData({ ...formData, wedding_name: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('weddingNameHint') || 'Optional custom name for this wedding'}
                </p>
              </div>

              {/* Planning Side & Wedding Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="planning_side">{t('planningSide') || 'Handling Side'}</Label>
                  <Select
                    value={formData.planning_side}
                    onValueChange={(value: 'bride_side' | 'groom_side' | 'both') =>
                      setFormData({ ...formData, planning_side: value })
                    }
                  >
                    <SelectTrigger id="planning_side">
                      <SelectValue placeholder={t('selectPlanningSide') || 'Select side'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">{t('bothSides') || 'Both Families'}</SelectItem>
                      <SelectItem value="bride_side">{t('brideSide') || "Bride's Side"}</SelectItem>
                      <SelectItem value="groom_side">{t('groomSide') || "Groom's Side"}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('planningSideHint') || 'Which family are you planning for?'}
                  </p>
                </div>
                <div>
                  <Label htmlFor="wedding_type">{t('weddingType') || 'Wedding Type'}</Label>
                  <Select
                    value={formData.wedding_type}
                    onValueChange={(value: 'traditional' | 'destination' | 'intimate' | 'elopement' | 'multi_day' | 'cultural') =>
                      setFormData({ ...formData, wedding_type: value })
                    }
                  >
                    <SelectTrigger id="wedding_type">
                      <SelectValue placeholder={t('selectWeddingType') || 'Select type'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="traditional">{t('typeTraditional') || 'Traditional'}</SelectItem>
                      <SelectItem value="destination">{t('typeDestination') || 'Destination'}</SelectItem>
                      <SelectItem value="multi_day">{t('typeMultiDay') || 'Multi-Day'}</SelectItem>
                      <SelectItem value="intimate">{t('typeIntimate') || 'Intimate'}</SelectItem>
                      <SelectItem value="elopement">{t('typeElopement') || 'Elopement'}</SelectItem>
                      <SelectItem value="cultural">{t('typeCultural') || 'Cultural'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bride_name">{t('brideName')} *</Label>
                  <Input
                    id="bride_name"
                    placeholder={t('brideNamePlaceholder') || 'First Last'}
                    value={formData.bride_name}
                    onChange={(e) =>
                      setFormData({ ...formData, bride_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="groom_name">{t('groomName')} *</Label>
                  <Input
                    id="groom_name"
                    placeholder={t('groomNamePlaceholder') || 'First Last'}
                    value={formData.groom_name}
                    onChange={(e) =>
                      setFormData({ ...formData, groom_name: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">{tc('email')} *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required={!editingClient}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">{tc('phone')}</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wedding_date">{t('weddingDate')}</Label>
                  <Input
                    id="wedding_date"
                    type="date"
                    value={formData.wedding_date}
                    onChange={(e) =>
                      setFormData({ ...formData, wedding_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="venue">{t('venue')}</Label>
                  <Input
                    id="venue"
                    value={formData.venue}
                    onChange={(e) =>
                      setFormData({ ...formData, venue: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Family Details (Collapsible) */}
            <Collapsible open={familyDetailsOpen} onOpenChange={setFamilyDetailsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                  <h3 className="font-semibold text-lg">{t('familyDetails') || 'Family Details'}</h3>
                  {familyDetailsOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t('familyDetailsHint') || 'Optional parent names for invitations and announcements'}
                </p>

                {/* Bride's Parents */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t('brideParents') || "Bride's Parents"}
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bride_father_name">{t('fatherName') || 'Father Name'}</Label>
                      <Input
                        id="bride_father_name"
                        value={formData.bride_father_name}
                        onChange={(e) =>
                          setFormData({ ...formData, bride_father_name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="bride_mother_name">{t('motherName') || 'Mother Name'}</Label>
                      <Input
                        id="bride_mother_name"
                        value={formData.bride_mother_name}
                        onChange={(e) =>
                          setFormData({ ...formData, bride_mother_name: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Groom's Parents */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t('groomParents') || "Groom's Parents"}
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="groom_father_name">{t('fatherName') || 'Father Name'}</Label>
                      <Input
                        id="groom_father_name"
                        value={formData.groom_father_name}
                        onChange={(e) =>
                          setFormData({ ...formData, groom_father_name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="groom_mother_name">{t('motherName') || 'Mother Name'}</Label>
                      <Input
                        id="groom_mother_name"
                        value={formData.groom_mother_name}
                        onChange={(e) =>
                          setFormData({ ...formData, groom_mother_name: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Event Brief Section */}
            <Collapsible open={eventBriefOpen} onOpenChange={setEventBriefOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                    <h3 className="font-semibold text-lg">{t('eventBrief') || 'Event Brief'}</h3>
                    {eventBriefOpen ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {t('eventBriefHint') || 'Add events that are part of this wedding (e.g., Mehndi, Sangeet, Wedding, Reception)'}
                  </p>

                  {eventBriefs.map((event, index) => (
                    <Card key={event.id} className="p-4">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">{t('event') || 'Event'} {index + 1}</h4>
                          {eventBriefs.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeEvent(event.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>{t('eventName') || 'Event Name'} *</Label>
                            <Input
                              placeholder={t('eventNamePlaceholder') || 'e.g., Sangeet, Wedding Ceremony'}
                              value={event.name}
                              onChange={(e) => updateEvent(event.id, 'name', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>{t('eventDate') || 'Date'} *</Label>
                            <Input
                              type="date"
                              value={event.date}
                              onChange={(e) => updateEvent(event.id, 'date', e.target.value)}
                            />
                          </div>
                        </div>

                        <div>
                          <Label>{t('eventVenue') || 'Venue'}</Label>
                          <Input
                            placeholder={t('eventVenuePlaceholder') || 'Event venue'}
                            value={event.venue}
                            onChange={(e) => updateEvent(event.id, 'venue', e.target.value)}
                          />
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <Label>{t('startTime') || 'Start Time'}</Label>
                            <Input
                              type="time"
                              value={event.start_time}
                              onChange={(e) => updateEvent(event.id, 'start_time', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>{t('durationHours') || 'Hours'}</Label>
                            <Input
                              type="number"
                              min="0"
                              max="24"
                              value={event.duration_hours}
                              onChange={(e) => updateEvent(event.id, 'duration_hours', parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <Label>{t('durationMinutes') || 'Minutes'}</Label>
                            <Input
                              type="number"
                              min="0"
                              max="59"
                              step="15"
                              value={event.duration_minutes}
                              onChange={(e) => updateEvent(event.id, 'duration_minutes', parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <Label>{t('endTime') || 'End Time'}</Label>
                            <div className="flex items-center h-9 px-3 border rounded-md bg-muted text-muted-foreground">
                              <Clock className="w-4 h-4 mr-2" />
                              {event.end_time || '--:--'}
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label>{t('requiredVendors') || 'Required Vendors'}</Label>
                          <Input
                            placeholder={t('requiredVendorsPlaceholder') || 'e.g., Photographer, DJ, Caterer'}
                            value={event.required_vendors}
                            onChange={(e) => updateEvent(event.id, 'required_vendors', e.target.value)}
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`already_booked_${event.id}`}
                            checked={event.already_booked}
                            onCheckedChange={(checked) => updateEvent(event.id, 'already_booked', checked)}
                          />
                          <Label htmlFor={`already_booked_${event.id}`} className="text-sm">
                            {t('vendorsAlreadyBooked') || 'Vendors already booked for this event'}
                          </Label>
                        </div>

                        <div>
                          <Label>{tc('notes')}</Label>
                          <Textarea
                            placeholder={t('eventNotesPlaceholder') || 'Any special requirements or notes'}
                            value={event.notes}
                            onChange={(e) => updateEvent(event.id, 'notes', e.target.value)}
                            rows={2}
                          />
                        </div>
                      </div>
                    </Card>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={addEvent}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('addAnotherEvent') || 'Add Another Event'}
                  </Button>
                </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Notes */}
            <div>
              <Label htmlFor="notes">{tc('notes')}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false)
                  setEditingClient(null)
                  resetForm()
                }}
              >
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingClient ? t('updateClient') : t('addClient')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  color = 'rose',
}: {
  title: string
  value: number
  icon?: React.ReactNode
  color?: 'rose' | 'teal' | 'sage' | 'gold' | 'cobalt' | 'mocha'
}) {
  // 2026 Color Palette - Wedding Flo Design System
  const colorStyles = {
    rose: {
      border: 'border-rose-200/50 dark:border-rose-800/30',
      shadow: 'shadow-rose-500/10 hover:shadow-rose-500/20',
      gradient: 'from-white via-rose-50/30 to-white dark:from-mocha-900 dark:via-rose-950/20 dark:to-mocha-900',
      iconBg: 'from-rose-500/20 to-rose-600/10 group-hover:from-rose-500/30 group-hover:to-rose-600/20',
      iconColor: 'text-rose-500',
      valueGradient: 'from-rose-600 to-rose-500',
    },
    teal: {
      border: 'border-teal-200/50 dark:border-teal-800/30',
      shadow: 'shadow-teal-500/10 hover:shadow-teal-500/20',
      gradient: 'from-white via-teal-50/30 to-white dark:from-mocha-900 dark:via-teal-950/20 dark:to-mocha-900',
      iconBg: 'from-teal-500/20 to-teal-600/10 group-hover:from-teal-500/30 group-hover:to-teal-600/20',
      iconColor: 'text-teal-500',
      valueGradient: 'from-teal-600 to-teal-500',
    },
    sage: {
      border: 'border-sage-200/50 dark:border-sage-800/30',
      shadow: 'shadow-sage-500/10 hover:shadow-sage-500/20',
      gradient: 'from-white via-sage-50/30 to-white dark:from-mocha-900 dark:via-sage-950/20 dark:to-mocha-900',
      iconBg: 'from-sage-500/20 to-sage-600/10 group-hover:from-sage-500/30 group-hover:to-sage-600/20',
      iconColor: 'text-sage-500',
      valueGradient: 'from-sage-600 to-sage-500',
    },
    gold: {
      border: 'border-gold-200/50 dark:border-gold-800/30',
      shadow: 'shadow-gold-500/10 hover:shadow-gold-500/20',
      gradient: 'from-white via-gold-50/30 to-white dark:from-mocha-900 dark:via-gold-950/20 dark:to-mocha-900',
      iconBg: 'from-gold-500/20 to-gold-600/10 group-hover:from-gold-500/30 group-hover:to-gold-600/20',
      iconColor: 'text-gold-500',
      valueGradient: 'from-gold-600 to-gold-500',
    },
    cobalt: {
      border: 'border-cobalt-200/50 dark:border-cobalt-800/30',
      shadow: 'shadow-cobalt-500/10 hover:shadow-cobalt-500/20',
      gradient: 'from-white via-cobalt-50/30 to-white dark:from-mocha-900 dark:via-cobalt-950/20 dark:to-mocha-900',
      iconBg: 'from-cobalt-500/20 to-cobalt-600/10 group-hover:from-cobalt-500/30 group-hover:to-cobalt-600/20',
      iconColor: 'text-cobalt-500',
      valueGradient: 'from-cobalt-600 to-cobalt-500',
    },
    mocha: {
      border: 'border-mocha-200/50 dark:border-mocha-800/30',
      shadow: 'shadow-mocha-500/10 hover:shadow-mocha-500/20',
      gradient: 'from-white via-mocha-50/30 to-white dark:from-mocha-900 dark:via-mocha-950/20 dark:to-mocha-900',
      iconBg: 'from-mocha-500/20 to-mocha-600/10 group-hover:from-mocha-500/30 group-hover:to-mocha-600/20',
      iconColor: 'text-mocha-500',
      valueGradient: 'from-mocha-600 to-mocha-500',
    },
  }

  const styles = colorStyles[color]

  return (
    <Card
      variant="glass"
      size="compact"
      className={`group hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 border ${styles.border} shadow-lg ${styles.shadow} hover:shadow-xl bg-gradient-to-br ${styles.gradient}`}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          {icon && (
            <div className={`p-2 rounded-xl bg-gradient-to-br ${styles.iconBg} transition-colors shadow-inner ${styles.iconColor}`}>
              {icon}
            </div>
          )}
          <span className="text-xs text-muted-foreground font-medium">{title}</span>
        </div>
        <div className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r ${styles.valueGradient} bg-clip-text text-transparent`}>
          {value}
        </div>
      </CardContent>
    </Card>
  )
}
