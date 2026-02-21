'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { trpc } from '@/lib/trpc/client'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Edit, Calendar, CheckCircle, Clock, Users, Heart, MapPin, ArrowRight, Zap } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ClientModuleHeader } from '@/components/dashboard/ClientModuleHeader'
import { Badge } from '@/components/ui/badge'
import { Link } from '@/lib/navigation'

// Pipeline stage labels for display
const PIPELINE_LABELS: Record<string, { label: string; color: string }> = {
  lead: { label: 'Lead', color: 'bg-mocha-500' },
  inquiry: { label: 'Inquiry', color: 'bg-cobalt-500' },
  proposal_sent: { label: 'Proposal Sent', color: 'bg-teal-500' },
  negotiation: { label: 'Negotiation', color: 'bg-gold-500' },
  booked: { label: 'Booked', color: 'bg-sage-500' },
  in_progress: { label: 'In Progress', color: 'bg-cobalt-400' },
  completed: { label: 'Completed', color: 'bg-sage-600' },
  lost: { label: 'Lost', color: 'bg-rose-500' },
}

export default function EventsPage() {
  const params = useParams()
  const clientId = params?.clientId as string
  const { toast } = useToast()
  const t = useTranslations('events')
  const tc = useTranslations('common')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventType: '',
    eventDate: '',
    startTime: '',
    endTime: '',
    location: '',
    venueName: '',
    address: '',
    guestCount: '',
    status: 'draft' as 'draft' | 'planned' | 'confirmed' | 'completed' | 'cancelled',
    notes: '',
  })

  const utils = trpc.useUtils()

  // Queries
  const { data: events, isLoading } = trpc.events.getAll.useQuery({
    clientId: clientId,
  })

  const { data: stats } = trpc.events.getStats.useQuery({
    clientId: clientId,
  })

  // Fetch client to show pipeline stage (for sync indicator)
  const { data: client } = trpc.clients.getById.useQuery({
    id: clientId,
  })

  // Mutations - all use async/await for proper cache invalidation
  const createMutation = trpc.events.create.useMutation({
    onSuccess: async () => {
      toast({ title: t('eventCreated') })
      resetForm()
      setIsAddDialogOpen(false)
      // Invalidate events and related vendor queries (vendors can be linked to events)
      await Promise.all([
        utils.events.getAll.invalidate({ clientId }),
        utils.events.getStats.invalidate({ clientId }),
        utils.vendors.getClientEvents.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = trpc.events.update.useMutation({
    onSuccess: async () => {
      toast({ title: t('eventUpdated') })
      setEditingEvent(null)
      resetForm()
      await Promise.all([
        utils.events.getAll.invalidate({ clientId }),
        utils.events.getStats.invalidate({ clientId }),
        utils.vendors.getClientEvents.invalidate({ clientId }),
        utils.vendors.getAll.invalidate({ clientId }), // Vendors may show event info
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = trpc.events.delete.useMutation({
    onSuccess: async () => {
      toast({ title: t('eventDeleted') })
      await Promise.all([
        utils.events.getAll.invalidate({ clientId }),
        utils.events.getStats.invalidate({ clientId }),
        utils.vendors.getClientEvents.invalidate({ clientId }),
        utils.vendors.getAll.invalidate({ clientId }), // Vendors linked to deleted event need refresh
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      eventType: '',
      eventDate: '',
      startTime: '',
      endTime: '',
      location: '',
      venueName: '',
      address: '',
      guestCount: '',
      status: 'draft',
      notes: '',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const submitData = {
      ...formData,
      guestCount: formData.guestCount ? parseInt(formData.guestCount) : undefined,
    }

    if (editingEvent) {
      updateMutation.mutate({
        id: editingEvent.id,
        data: submitData,
      })
    } else {
      createMutation.mutate({
        clientId: clientId,
        ...submitData,
      })
    }
  }

  const handleEdit = (event: any) => {
    setEditingEvent(event)
    setFormData({
      title: event.title || '',
      description: event.description || '',
      eventType: event.eventType || '',
      eventDate: event.eventDate || '',
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      location: event.location || '',
      venueName: event.venueName || '',
      address: event.address || '',
      guestCount: event.guestCount ? event.guestCount.toString() : '',
      status: event.status || 'draft',
      notes: event.notes || '',
    })
  }

  const handleDelete = (id: string) => {
    if (confirm(t('confirmDelete'))) {
      deleteMutation.mutate({ id })
    }
  }

  if (!clientId) {
    return (
      <div className="p-6">
        <p>{tc('noClientSelected')}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <p>{tc('loading')}</p>
      </div>
    )
  }

  // Find main wedding event (eventType containing 'Wedding' or 'wedding')
  const mainWedding = events?.find(e =>
    e.eventType?.toLowerCase() === 'wedding' ||
    e.title?.toLowerCase().includes('wedding')
  )
  // All other events are sub-events
  const subEvents = events?.filter(e => e.id !== mainWedding?.id) || []

  // Group sub-events by date
  const eventsByDate = subEvents.reduce((acc, event) => {
    const date = event.eventDate || 'no-date'
    if (!acc[date]) acc[date] = []
    acc[date].push(event)
    return acc
  }, {} as Record<string, typeof subEvents>)

  // Sort dates
  const sortedDates = Object.keys(eventsByDate).sort((a, b) => {
    if (a === 'no-date') return 1
    if (b === 'no-date') return -1
    return new Date(a).getTime() - new Date(b).getTime()
  })

  // Calculate sub-event stats (excluding main wedding)
  const subEventStats = {
    total: subEvents.length,
    planned: subEvents.filter(e => e.status === 'planned').length,
    confirmed: subEvents.filter(e => e.status === 'confirmed').length,
    completed: subEvents.filter(e => e.status === 'completed').length,
    cancelled: subEvents.filter(e => e.status === 'cancelled').length,
    draft: subEvents.filter(e => e.status === 'draft').length,
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <ClientModuleHeader
        title={t('eventManagement')}
        description={t('manageWeddingEvents')}
      >
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('addEvent')}
        </Button>
      </ClientModuleHeader>

      {/* Pipeline Sync Indicator - Will be enabled when Pipeline CRM is implemented */}
      {/* {(client as any)?.pipelineStage && (...)} */}

      {/* Stats - Sub-events only (main wedding is shown as header) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard
          title={t('totalEvents')}
          value={subEventStats.total}
          icon={<Calendar className="w-4 h-4" />}
        />
        <StatCard
          title={t('draft')}
          value={subEventStats.draft}
          color="text-mocha-600"
        />
        <StatCard
          title={t('planned')}
          value={subEventStats.planned}
          icon={<Clock className="w-4 h-4" />}
          color="text-yellow-600"
        />
        <StatCard
          title={t('confirmed')}
          value={subEventStats.confirmed}
          icon={<CheckCircle className="w-4 h-4" />}
          color="text-sage-600"
        />
        <StatCard
          title={t('completed')}
          value={subEventStats.completed}
          color="text-cobalt-600"
        />
        <StatCard
          title={t('cancelled')}
          value={subEventStats.cancelled}
          color="text-rose-600"
        />
      </div>

      {/* Event List - Grouped by Main Wedding */}
      <div className="space-y-4">
            {/* Main Wedding Header Card */}
            {mainWedding && (
              <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <Heart className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">{mainWedding.title}</h2>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-muted-foreground">
                          {mainWedding.eventDate && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4" />
                              <span className="font-medium">
                                {new Date(mainWedding.eventDate).toLocaleDateString(undefined, {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          )}
                          {mainWedding.venueName && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4" />
                              <span>{mainWedding.venueName}</span>
                            </div>
                          )}
                          {mainWedding.guestCount && (
                            <div className="flex items-center gap-1.5">
                              <Users className="w-4 h-4" />
                              <span>{mainWedding.guestCount} {t('guests')}</span>
                            </div>
                          )}
                        </div>
                        {mainWedding.status && (
                          <span
                            className={`inline-block mt-3 text-xs px-3 py-1 rounded-full ${
                              mainWedding.status === 'confirmed'
                                ? 'bg-sage-100 text-sage-700 dark:bg-sage-900/30 dark:text-sage-400'
                                : mainWedding.status === 'completed'
                                ? 'bg-cobalt-100 text-cobalt-700 dark:bg-cobalt-900/30 dark:text-cobalt-400'
                                : mainWedding.status === 'cancelled'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                : mainWedding.status === 'draft'
                                ? 'bg-mocha-100 text-mocha-700 dark:bg-mocha-900/30 dark:text-mocha-400'
                                : 'bg-gold-100 text-gold-700 dark:bg-gold-900/30 dark:text-gold-400'
                            }`}
                          >
                            {t(mainWedding.status)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(mainWedding)}
                        className="h-8 w-8 hover:bg-muted"
                      >
                        <Edit className="w-4 h-4" />
                        <span className="sr-only">{tc('edit')}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(mainWedding.id)}
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="sr-only">{tc('delete')}</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sub-Events grouped by date */}
            {events?.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-muted-foreground">
                    {t('noEventsYet')}
                  </div>
                </CardContent>
              </Card>
            ) : subEvents.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('weddingEvents')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {sortedDates.map((date) => (
                    <div key={date}>
                      {/* Date Header */}
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                          {date === 'no-date'
                            ? t('noDateSet')
                            : new Date(date).toLocaleDateString(undefined, {
                                weekday: 'long',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })
                          }
                        </h3>
                        <div className="flex-1 h-px bg-border" />
                      </div>

                      {/* Events for this date */}
                      <div className="space-y-2 ml-6">
                        {eventsByDate[date].map((event) => (
                          <div
                            key={event.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{event.title}</h4>
                                {event.eventType && event.eventType.toLowerCase() !== 'wedding' && (
                                  <span className="text-xs bg-cobalt-100 text-cobalt-700 dark:bg-cobalt-900/30 dark:text-cobalt-400 px-2 py-1 rounded">
                                    {event.eventType}
                                  </span>
                                )}
                                {event.status && (
                                  <span
                                    className={`text-xs px-2 py-1 rounded ${
                                      event.status === 'confirmed'
                                        ? 'bg-sage-100 text-sage-700 dark:bg-sage-900/30 dark:text-sage-400'
                                        : event.status === 'completed'
                                        ? 'bg-cobalt-100 text-cobalt-700 dark:bg-cobalt-900/30 dark:text-cobalt-400'
                                        : event.status === 'cancelled'
                                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                        : event.status === 'draft'
                                        ? 'bg-mocha-100 text-mocha-700 dark:bg-mocha-900/30 dark:text-mocha-400'
                                        : 'bg-gold-100 text-gold-700 dark:bg-gold-900/30 dark:text-gold-400'
                                    }`}
                                  >
                                    {t(event.status)}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-muted-foreground">
                                {event.startTime && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{event.startTime}{event.endTime && ` - ${event.endTime}`}</span>
                                  </div>
                                )}
                                {event.venueName && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    <span>{event.venueName}</span>
                                  </div>
                                )}
                                {event.guestCount && (
                                  <div className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    <span>{event.guestCount}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(event)}
                                className="h-8 w-8 hover:bg-muted"
                              >
                                <Edit className="w-4 h-4" />
                                <span className="sr-only">{tc('edit')}</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(event.id)}
                                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="sr-only">{tc('delete')}</span>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : mainWedding && (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-muted-foreground">
                    {t('noSubEventsYet')}
                  </div>
                </CardContent>
              </Card>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        open={isAddDialogOpen || !!editingEvent}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false)
            setEditingEvent(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? t('editEvent') : t('addNewEvent')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">{t('eventTitle')} *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="eventType">{t('eventType')}</Label>
                <Input
                  id="eventType"
                  value={formData.eventType}
                  onChange={(e) =>
                    setFormData({ ...formData, eventType: e.target.value })
                  }
                  placeholder={t('eventTypePlaceholder')}
                />
              </div>
              <div>
                <Label htmlFor="eventDate">{t('eventDate')} *</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={formData.eventDate}
                  onChange={(e) =>
                    setFormData({ ...formData, eventDate: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="startTime">{t('startTime')}</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="endTime">{t('endTime')}</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="guestCount">{t('estimatedGuests')}</Label>
                <Input
                  id="guestCount"
                  type="number"
                  value={formData.guestCount}
                  onChange={(e) =>
                    setFormData({ ...formData, guestCount: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="status">{t('status')}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">{t('planned')}</SelectItem>
                    <SelectItem value="confirmed">{t('confirmed')}</SelectItem>
                    <SelectItem value="completed">{t('completed')}</SelectItem>
                    <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="description">{tc('description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="venueName">{t('venueName')}</Label>
                <Input
                  id="venueName"
                  value={formData.venueName}
                  onChange={(e) =>
                    setFormData({ ...formData, venueName: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="location">{t('location')}</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="address">{t('address')}</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>
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
                  setEditingEvent(null)
                  resetForm()
                }}
              >
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingEvent ? tc('update') : tc('add')} {t('event')}
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
  color = 'text-foreground',
}: {
  title: string
  value: number
  icon?: React.ReactNode
  color?: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  )
}
