'use client'

import { useState, useRef } from 'react'
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
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Edit, Clock, CheckCircle, AlertTriangle, ListChecks, ChevronDown, ChevronRight, Calendar, PartyPopper, Settings, Star, Flag, Upload, Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ExportButton } from '@/components/export/export-button'
import { ClientModuleHeader } from '@/components/dashboard/ClientModuleHeader'
import { importTimelineExcel, type TimelineImportItem } from '@/lib/import/excel-parser'
import { exportTimelineExcel } from '@/lib/export/excel-exporter'

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

  // Import state
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importPreview, setImportPreview] = useState<{
    items: TimelineImportItem[]
    errors: Array<{ row: number; field: string; message: string }>
    totalRows: number
    validRows: number
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Get events for import/export
  const { data: clientEvents } = trpc.events.getAll.useQuery({
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

  const bulkImportMutation = trpc.timeline.bulkImport.useMutation({
    onSuccess: async (result) => {
      const message = `Created: ${result.created}, Updated: ${result.updated}, Deleted: ${result.deleted}`
      toast({ title: t('importComplete') || 'Import Complete', description: message })
      setIsImportDialogOpen(false)
      setImportPreview(null)
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

  // Import handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    try {
      const events = (clientEvents || []).map(ev => ({
        id: ev.id,
        title: ev.title,
      }))
      const result = await importTimelineExcel(file, events)
      setImportPreview({
        items: result.data,
        errors: result.errors,
        totalRows: result.totalRows,
        validRows: result.validRows,
      })
    } catch (error) {
      toast({
        title: tc('error'),
        description: error instanceof Error ? error.message : 'Failed to parse Excel file',
        variant: 'destructive',
      })
    } finally {
      setIsImporting(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleImportConfirm = () => {
    if (!importPreview) return

    bulkImportMutation.mutate({
      clientId,
      items: importPreview.items,
    })
  }

  const handleExportToExcel = async () => {
    if (!timelineItems || !clientEvents) return

    const events = (clientEvents || []).map(ev => ({
      id: ev.id,
      title: ev.title,
      eventDate: ev.eventDate || null,
    }))

    await exportTimelineExcel(timelineItems, events, {
      filename: `timeline-${clientName}-${new Date().toISOString().split('T')[0]}.xlsx`,
    })
    toast({ title: t('timelineExported', { format: 'EXCEL' }) })
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
        <div className="flex gap-2">
          {/* Import Button */}
          <Button
            variant="outline"
            onClick={() => setIsImportDialogOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          {/* Export Excel Button */}
          <Button
            variant="outline"
            onClick={handleExportToExcel}
            disabled={!timelineItems || timelineItems.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          {/* Legacy Export Button */}
          <ExportButton
            data={timelineItems || []}
            dataType="timeline"
            clientName={clientName}
            onExportComplete={(format) => {
              toast({ title: t('timelineExported', { format: format.toUpperCase() }) })
            }}
          />
        </div>
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

      {/* Import Dialog */}
      <Dialog
        open={isImportDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsImportDialogOpen(false)
            setImportPreview(null)
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import Timeline from Excel
            </DialogTitle>
            <DialogDescription>
              Upload an Excel file to import or update timeline items. Use the exported Excel as a template.
            </DialogDescription>
          </DialogHeader>

          {!importPreview ? (
            <div className="space-y-4">
              {/* File Input */}
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Select an Excel file (.xlsx) to import
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="timeline-import-file"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Select File
                    </>
                  )}
                </Button>
              </div>

              {/* Instructions */}
              <div className="bg-muted/50 rounded-lg p-4 text-sm">
                <h4 className="font-semibold mb-2">Instructions:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>First export the timeline to get the correct template format</li>
                  <li>Edit the Excel file offline - add, modify, or delete rows</li>
                  <li>Keep the ID column for existing items you want to update</li>
                  <li>Leave ID empty for new items</li>
                  <li>Add "DELETE" in the Notes column to remove items</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-700">
                    {importPreview.items.filter(i => i._action === 'create').length}
                  </p>
                  <p className="text-sm text-emerald-600">New Items</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">
                    {importPreview.items.filter(i => i._action === 'update').length}
                  </p>
                  <p className="text-sm text-blue-600">Updates</p>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-rose-700">
                    {importPreview.items.filter(i => i._action === 'delete').length}
                  </p>
                  <p className="text-sm text-rose-600">Deletions</p>
                </div>
              </div>

              {/* Errors */}
              {importPreview.errors.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                  <h4 className="font-semibold text-rose-700 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Validation Errors ({importPreview.errors.length})
                  </h4>
                  <ul className="text-sm text-rose-600 space-y-1 max-h-32 overflow-y-auto">
                    {importPreview.errors.map((err, idx) => (
                      <li key={idx}>
                        Row {err.row}: {err.field} - {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Items Preview */}
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">Action</th>
                      <th className="text-left p-2">Title</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Time</th>
                      <th className="text-left p-2">Phase</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.items.slice(0, 20).map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            item._action === 'create' ? 'bg-emerald-100 text-emerald-700' :
                            item._action === 'delete' ? 'bg-rose-100 text-rose-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {item._action || 'create'}
                          </span>
                        </td>
                        <td className="p-2 truncate max-w-[200px]">{item.title}</td>
                        <td className="p-2">{item.date || '-'}</td>
                        <td className="p-2">{item.startTime || '-'}</td>
                        <td className="p-2">{item.phase || 'showtime'}</td>
                      </tr>
                    ))}
                    {importPreview.items.length > 20 && (
                      <tr className="border-t bg-muted/50">
                        <td colSpan={5} className="p-2 text-center text-muted-foreground">
                          ... and {importPreview.items.length - 20} more items
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <p className="text-sm text-muted-foreground">
                Total: {importPreview.totalRows} rows parsed, {importPreview.validRows} valid items
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsImportDialogOpen(false)
                setImportPreview(null)
              }}
            >
              {tc('cancel')}
            </Button>
            {importPreview && (
              <Button
                onClick={handleImportConfirm}
                disabled={bulkImportMutation.isPending || importPreview.validRows === 0}
              >
                {bulkImportMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm Import ({importPreview.validRows} items)
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
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
