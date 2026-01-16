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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Edit, Clock, CheckCircle, AlertTriangle, ListChecks, ChevronDown, ChevronRight, Calendar, PartyPopper, Settings, Star, Flag } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ExportButton } from '@/components/export/export-button'
import { ClientModuleHeader } from '@/components/dashboard/ClientModuleHeader'

// Event type icons/emojis
const eventTypeIcons: Record<string, string> = {
  wedding: '💍',
  sangeet: '🎉',
  mehendi: '🎨',
  haldi: '💛',
  reception: '🎊',
  rehearsal_dinner: '🍽️',
  engagement: '💎',
  general: '📋',
}

// Phase configuration for timeline segmentation
const phaseConfig: Record<string, { label: string; icon: React.ReactNode; bgColor: string; borderColor: string }> = {
  setup: {
    label: 'Setup',
    icon: <Settings className="w-4 h-4" />,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  showtime: {
    label: 'Showtime',
    icon: <Star className="w-4 h-4" />,
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  wrapup: {
    label: 'Wrap Up',
    icon: <Flag className="w-4 h-4" />,
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
  },
}

// Group items by phase
function groupItemsByPhase(items: any[]) {
  const phases = {
    setup: [] as any[],
    showtime: [] as any[],
    wrapup: [] as any[],
  }

  for (const item of items) {
    const phase = item.phase || 'showtime' // Default to showtime if no phase
    if (phases[phase as keyof typeof phases]) {
      phases[phase as keyof typeof phases].push(item)
    } else {
      phases.showtime.push(item)
    }
  }

  return phases
}

// Format date for display
function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === 'unknown') return 'Unscheduled'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export default function TimelinePage() {
  const params = useParams()
  const clientId = params?.clientId as string
  const { toast } = useToast()
  const t = useTranslations('timeline')
  const tc = useTranslations('common')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    durationMinutes: '',
    location: '',
    responsiblePerson: '',
    sortOrder: '0',
    notes: '',
  })

  const utils = trpc.useUtils()

  // Queries
  const { data: client } = trpc.clients.getById.useQuery({
    id: clientId,
  })

  const { data: groupedTimeline, isLoading } = trpc.timeline.getGroupedByEvent.useQuery({
    clientId: clientId,
  })

  const { data: stats } = trpc.timeline.getStats.useQuery({
    clientId: clientId,
  })

  const { data: conflicts } = trpc.timeline.detectConflicts.useQuery({
    clientId: clientId,
  })

  // Get flat list for export
  const { data: timelineItems } = trpc.timeline.getAll.useQuery({
    clientId: clientId,
  })

  // Generate client name for export filename
  const partner1Name = client?.partner1FirstName
  const partner2Name = client?.partner2FirstName
  const clientName = partner1Name && partner2Name
    ? `${partner1Name}-${partner2Name}`
    : partner1Name || partner2Name || 'Wedding'

  // Mutations
  const createMutation = trpc.timeline.create.useMutation({
    onSuccess: async () => {
      toast({ title: t('itemAdded') })
      resetForm()
      setIsAddDialogOpen(false)
      setSelectedEventId(null)
      await Promise.all([
        utils.timeline.getGroupedByEvent.invalidate({ clientId }),
        utils.timeline.getAll.invalidate({ clientId }),
        utils.timeline.getStats.invalidate({ clientId }),
        utils.timeline.detectConflicts.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = trpc.timeline.update.useMutation({
    onSuccess: async () => {
      toast({ title: t('itemUpdated') })
      setEditingItem(null)
      resetForm()
      await Promise.all([
        utils.timeline.getGroupedByEvent.invalidate({ clientId }),
        utils.timeline.getAll.invalidate({ clientId }),
        utils.timeline.getStats.invalidate({ clientId }),
        utils.timeline.detectConflicts.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = trpc.timeline.delete.useMutation({
    onSuccess: async () => {
      toast({ title: t('itemDeleted') })
      await Promise.all([
        utils.timeline.getGroupedByEvent.invalidate({ clientId }),
        utils.timeline.getAll.invalidate({ clientId }),
        utils.timeline.getStats.invalidate({ clientId }),
        utils.timeline.detectConflicts.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const markCompleteMutation = trpc.timeline.markComplete.useMutation({
    onSuccess: async () => {
      toast({ title: t('itemUpdated') })
      await Promise.all([
        utils.timeline.getGroupedByEvent.invalidate({ clientId }),
        utils.timeline.getAll.invalidate({ clientId }),
        utils.timeline.getStats.invalidate({ clientId }),
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
      startTime: '',
      endTime: '',
      durationMinutes: '',
      location: '',
      responsiblePerson: '',
      sortOrder: '0',
      notes: '',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const submitData = {
      ...formData,
      durationMinutes: formData.durationMinutes ? parseInt(formData.durationMinutes) : undefined,
      sortOrder: parseInt(formData.sortOrder),
    }

    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        data: submitData,
      })
    } else {
      createMutation.mutate({
        clientId: clientId,
        eventId: selectedEventId && selectedEventId !== 'general' ? selectedEventId : undefined,
        ...submitData,
      })
    }
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setFormData({
      title: item.title || '',
      description: item.description || '',
      startTime: item.startTime ? new Date(item.startTime).toTimeString().slice(0, 5) : '',
      endTime: item.endTime ? new Date(item.endTime).toTimeString().slice(0, 5) : '',
      durationMinutes: item.durationMinutes ? item.durationMinutes.toString() : '',
      location: item.location || '',
      responsiblePerson: item.responsiblePerson || '',
      sortOrder: item.sortOrder ? item.sortOrder.toString() : '0',
      notes: item.notes || '',
    })
  }

  const handleDelete = (id: string) => {
    if (confirm(t('confirmDelete'))) {
      deleteMutation.mutate({ id })
    }
  }

  const handleToggleComplete = (id: string, completed: boolean | null) => {
    markCompleteMutation.mutate({ id, completed: !completed })
  }

  const handleAddToEvent = (eventId: string) => {
    setSelectedEventId(eventId)
    setIsAddDialogOpen(true)
  }

  const toggleEventExpanded = (eventId: string) => {
    const newExpanded = new Set(expandedEvents)
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId)
    } else {
      newExpanded.add(eventId)
    }
    setExpandedEvents(newExpanded)
  }

  // Expand all events by default
  const isEventExpanded = (eventId: string) => {
    // If expandedEvents is empty (initial state), show all expanded
    if (expandedEvents.size === 0) return true
    return expandedEvents.has(eventId)
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

  const hasNoEvents = !groupedTimeline || groupedTimeline.length === 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <ClientModuleHeader
        title={t('weddingDayTimeline')}
        description={t('manageSchedule')}
      >
        <ExportButton
          data={timelineItems || []}
          dataType="timeline"
          clientName={clientName}
          onExportComplete={(format) => {
            toast({ title: t('timelineExported', { format: format.toUpperCase() }) })
          }}
        />
      </ClientModuleHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title={t('totalItems')}
          value={stats?.total || 0}
          icon={<ListChecks className="w-4 h-4" />}
        />
        <StatCard
          title={t('completed')}
          value={stats?.completed || 0}
          icon={<CheckCircle className="w-4 h-4" />}
          color="text-sage-600"
        />
        <StatCard
          title={tc('pending')}
          value={stats?.pending || 0}
          icon={<Clock className="w-4 h-4" />}
          color="text-gold-600"
        />
        <StatCard
          title={t('totalDuration')}
          value={`${stats?.totalDurationHours || 0}h ${stats?.totalDurationMinutes || 0}m`}
          color="text-cobalt-600"
        />
      </div>

      {/* Conflicts Warning */}
      {conflicts && conflicts.length > 0 && (
        <Card className="border-rose-200 bg-rose-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="w-5 h-5" />
              {t('timeConflicts')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {conflicts.map((conflict, idx) => (
                <div key={idx} className="text-sm text-rose-600">
                  {t('conflictOverlap', { item1: conflict.item1.title, item2: conflict.item2.title, minutes: conflict.overlapMinutes })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {hasNoEvents && (
        <Card>
          <CardContent className="py-12 text-center">
            <PartyPopper className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('noTimelineItems')}</h3>
            <p className="text-muted-foreground mb-4">
              Timeline items are automatically generated when you create events.
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.href = `/dashboard/clients/${clientId}/events`}
            >
              Go to Events
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Grouped Timeline by Date -> Event */}
      {groupedTimeline && groupedTimeline.map((dateGroup) => (
        <div key={dateGroup.date} className="space-y-4">
          {/* Date Header */}
          <div className="flex items-center gap-3 py-2 border-b border-border">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              {formatDate(dateGroup.date)}
            </h2>
          </div>

          {/* Events for this date */}
          {dateGroup.events.map((event) => (
            <Card key={event.eventId} className="overflow-hidden">
              <Collapsible
                open={isEventExpanded(event.eventId)}
                onOpenChange={() => toggleEventExpanded(event.eventId)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isEventExpanded(event.eventId) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <span className="text-2xl">
                          {eventTypeIcons[event.eventType?.toLowerCase() || 'general'] || '📋'}
                        </span>
                        <CardTitle className="text-lg">{event.eventTitle}</CardTitle>
                        <span className="text-sm text-muted-foreground">
                          ({event.items.length} items)
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAddToEvent(event.eventId)
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Item
                      </Button>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {event.items.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        No timeline items for this event yet.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Render items grouped by phase */}
                        {(() => {
                          const phaseGroups = groupItemsByPhase(event.items)
                          const phaseOrder = ['setup', 'showtime', 'wrapup'] as const

                          return phaseOrder.map((phaseKey) => {
                            const items = phaseGroups[phaseKey]
                            if (items.length === 0) return null

                            const config = phaseConfig[phaseKey]

                            return (
                              <div key={phaseKey} className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-3`}>
                                {/* Phase Header */}
                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-current/10">
                                  <span className="text-muted-foreground">{config.icon}</span>
                                  <h5 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                                    {config.label}
                                  </h5>
                                  <span className="text-xs text-muted-foreground">
                                    ({items.length} {items.length === 1 ? 'item' : 'items'})
                                  </span>
                                </div>

                                {/* Phase Items */}
                                <div className="space-y-2">
                                  {items.map((item) => (
                                    <div
                                      key={item.id}
                                      className={`flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-muted/50 ${
                                        item.completed ? 'opacity-50 bg-muted/30' : ''
                                      }`}
                                    >
                                      <div className="flex items-center gap-3 flex-1">
                                        <input
                                          type="checkbox"
                                          checked={item.completed || false}
                                          onChange={() => handleToggleComplete(item.id, item.completed)}
                                          className="w-4 h-4 cursor-pointer"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className={`font-medium ${item.completed ? 'line-through' : ''}`}>
                                              {item.title}
                                            </h4>
                                            {item.completed && (
                                              <span className="text-xs bg-sage-100 text-sage-700 px-2 py-0.5 rounded">
                                                Done
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                            <span className="flex items-center gap-1">
                                              <Clock className="w-3 h-3" />
                                              {item.startTime ? new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                              {item.endTime && ` - ${new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                              {item.durationMinutes && ` (${item.durationMinutes} min)`}
                                            </span>
                                            {item.location && (
                                              <span className="text-xs bg-muted px-2 py-0.5 rounded">
                                                {item.location}
                                              </span>
                                            )}
                                          </div>
                                          {item.description && (
                                            <p className="text-sm text-muted-foreground italic mt-1 truncate">
                                              {item.description}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex gap-1 ml-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleEdit(item)}
                                        >
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDelete(item.id)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })
                        })()}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      ))}

      {/* Add/Edit Dialog */}
      <Dialog
        open={isAddDialogOpen || !!editingItem}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false)
            setEditingItem(null)
            setSelectedEventId(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? t('editTimelineItem') : t('addTimelineItem')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">{t('itemTitle')} *</Label>
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
                <Label htmlFor="startTime">{t('startTime')} *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  required
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
                <Label htmlFor="durationMinutes">{t('durationMinutes')}</Label>
                <Input
                  id="durationMinutes"
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, durationMinutes: e.target.value })
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
              <div>
                <Label htmlFor="responsiblePerson">{t('responsiblePerson')}</Label>
                <Input
                  id="responsiblePerson"
                  value={formData.responsiblePerson}
                  onChange={(e) =>
                    setFormData({ ...formData, responsiblePerson: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="sortOrder">{t('sortOrder')}</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData({ ...formData, sortOrder: e.target.value })
                  }
                />
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
                  setEditingItem(null)
                  setSelectedEventId(null)
                  resetForm()
                }}
              >
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingItem ? tc('update') : tc('add')} {t('item')}
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
  value: number | string
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
