'use client'

import { useState } from 'react'
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

export default function TimelinePage() {
  const params = useParams()
  const clientId = params?.clientId as string
  const { toast } = useToast()
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
  const { data: timelineItems, isLoading } = trpc.timeline.getAll.useQuery({
    clientId: clientId,
  })

  const { data: stats } = trpc.timeline.getStats.useQuery({
    clientId: clientId,
  })

  const { data: conflicts } = trpc.timeline.detectConflicts.useQuery({
    clientId: clientId,
  })

  // Mutations
  const createMutation = trpc.timeline.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Timeline item added successfully' })
      utils.timeline.getAll.invalidate()
      utils.timeline.getStats.invalidate()
      utils.timeline.detectConflicts.invalidate()
      resetForm()
      setIsAddDialogOpen(false)
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = trpc.timeline.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Timeline item updated successfully' })
      utils.timeline.getAll.invalidate()
      utils.timeline.getStats.invalidate()
      utils.timeline.detectConflicts.invalidate()
      setEditingItem(null)
      resetForm()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = trpc.timeline.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Timeline item deleted successfully' })
      utils.timeline.getAll.invalidate()
      utils.timeline.getStats.invalidate()
      utils.timeline.detectConflicts.invalidate()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const markCompleteMutation = trpc.timeline.markComplete.useMutation({
    onSuccess: () => {
      toast({ title: 'Timeline item updated' })
      utils.timeline.getAll.invalidate()
      utils.timeline.getStats.invalidate()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
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
      startTime: item.start_time || '',
      endTime: item.end_time || '',
      durationMinutes: item.duration_minutes ? item.duration_minutes.toString() : '',
      location: item.location || '',
      responsiblePerson: item.responsible_person || '',
      sortOrder: item.sort_order ? item.sort_order.toString() : '0',
      notes: item.notes || '',
    })
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this timeline item?')) {
      deleteMutation.mutate({ id })
    }
  }

  const handleToggleComplete = (id: string, completed: boolean | null) => {
    markCompleteMutation.mutate({ id, completed: !completed })
  }

  if (!clientId) {
    return (
      <div className="p-6">
        <p>No client selected</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <p>Loading timeline...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Wedding Day Timeline</h1>
          <p className="text-muted-foreground">Manage your wedding day schedule</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Timeline Item
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Items"
          value={stats?.total || 0}
          icon={<ListChecks className="w-4 h-4" />}
        />
        <StatCard
          title="Completed"
          value={stats?.completed || 0}
          icon={<CheckCircle className="w-4 h-4" />}
          color="text-green-600"
        />
        <StatCard
          title="Pending"
          value={stats?.pending || 0}
          icon={<Clock className="w-4 h-4" />}
          color="text-yellow-600"
        />
        <StatCard
          title="Total Duration"
          value={`${stats?.totalDurationHours || 0}h ${stats?.totalDurationMinutes || 0}m`}
          color="text-blue-600"
        />
      </div>

      {/* Conflicts Warning */}
      {conflicts && conflicts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Time Conflicts Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {conflicts.map((conflict, idx) => (
                <div key={idx} className="text-sm text-red-600">
                  &quot;{conflict.item1.title}&quot; overlaps with &quot;{conflict.item2.title}&quot; by{' '}
                  {conflict.overlapMinutes} minutes
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline Items */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {timelineItems?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No timeline items yet. Add your first item to get started!
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
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            Completed
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {item.start_time}
                          {item.end_time && ` - ${item.end_time}`}
                          {item.duration_minutes && ` (${item.duration_minutes} min)`}
                        </p>
                        {item.location && <p>Location: {item.location}</p>}
                        {item.responsible_person && (
                          <p>Responsible: {item.responsible_person}</p>
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
              {editingItem ? 'Edit Timeline Item' : 'Add Timeline Item'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title *</Label>
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
                <Label htmlFor="startTime">Start Time *</Label>
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
                <Label htmlFor="endTime">End Time</Label>
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
                <Label htmlFor="durationMinutes">Duration (minutes)</Label>
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
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="responsiblePerson">Responsible Person</Label>
                <Input
                  id="responsiblePerson"
                  value={formData.responsiblePerson}
                  onChange={(e) =>
                    setFormData({ ...formData, responsiblePerson: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="sortOrder">Sort Order</Label>
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
              <Label htmlFor="description">Description</Label>
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
              <Label htmlFor="notes">Notes</Label>
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
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingItem ? 'Update' : 'Add'} Item
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
