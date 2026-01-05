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
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Edit, Clock, CheckCircle, AlertTriangle, ListChecks } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ExportButton } from '@/components/export/export-button'
import { ClientModuleHeader } from '@/components/dashboard/ClientModuleHeader'

export default function TimelinePage() {
  const params = useParams()
  const clientId = params?.clientId as string
  const { toast } = useToast()
  const t = useTranslations('timeline')
  const tc = useTranslations('common')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
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

  const { data: timelineItems, isLoading } = trpc.timeline.getAll.useQuery({
    clientId: clientId,
  })

  const { data: stats } = trpc.timeline.getStats.useQuery({
    clientId: clientId,
  })

  const { data: conflicts } = trpc.timeline.detectConflicts.useQuery({
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
      await Promise.all([
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
        ...submitData,
      })
    }
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setFormData({
      title: item.title || '',
      description: item.description || '',
      startTime: item.startTime || '',
      endTime: item.endTime || '',
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
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('addTimelineItem')}
        </Button>
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

      {/* Timeline Items */}
      <Card>
        <CardHeader>
          <CardTitle>{t('timelineSchedule')}</CardTitle>
        </CardHeader>
        <CardContent>
          {timelineItems?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('noTimelineItems')}
            </div>
          ) : (
            <div className="space-y-2">
              {timelineItems?.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 ${
                    item.completed ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <input
                      type="checkbox"
                      checked={item.completed || false}
                      onChange={() => handleToggleComplete(item.id, item.completed)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold ${item.completed ? 'line-through' : ''}`}>
                          {item.title}
                        </h3>
                        {item.completed && (
                          <span className="text-xs bg-sage-100 text-sage-700 px-2 py-1 rounded">
                            {t('completed')}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {item.startTime ? new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          {item.endTime && ` - ${new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                          {item.durationMinutes && ` (${item.durationMinutes} min)`}
                        </p>
                        {item.location && <p>{t('location')}: {item.location}</p>}
                        {item.responsiblePerson && (
                          <p>{t('responsible')}: {item.responsiblePerson}</p>
                        )}
                        {item.description && <p className="italic">{item.description}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog
        open={isAddDialogOpen || !!editingItem}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false)
            setEditingItem(null)
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
