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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Edit, Calendar, CheckCircle, Clock, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function EventsPage() {
  const params = useParams()
  const clientId = params?.clientId as string
  const { toast } = useToast()
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
    status: 'planned' as 'planned' | 'confirmed' | 'completed' | 'cancelled',
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

  // Mutations
  const createMutation = trpc.events.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Event added successfully' })
      utils.events.getAll.invalidate()
      utils.events.getStats.invalidate()
      resetForm()
      setIsAddDialogOpen(false)
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = trpc.events.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Event updated successfully' })
      utils.events.getAll.invalidate()
      utils.events.getStats.invalidate()
      setEditingEvent(null)
      resetForm()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = trpc.events.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Event deleted successfully' })
      utils.events.getAll.invalidate()
      utils.events.getStats.invalidate()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
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
      status: 'planned',
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
      eventType: event.event_type || '',
      eventDate: event.event_date || '',
      startTime: event.start_time || '',
      endTime: event.end_time || '',
      location: event.location || '',
      venueName: event.venue_name || '',
      address: event.address || '',
      guestCount: event.guest_count ? event.guest_count.toString() : '',
      status: event.status || 'planned',
      notes: event.notes || '',
    })
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      deleteMutation.mutate({ id })
    }
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
        <p>Loading events...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-muted-foreground">Manage your wedding events</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Event
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          title="Total Events"
          value={stats?.total || 0}
          icon={<Calendar className="w-4 h-4" />}
        />
        <StatCard
          title="Planned"
          value={stats?.planned || 0}
          icon={<Clock className="w-4 h-4" />}
          color="text-yellow-600"
        />
        <StatCard
          title="Confirmed"
          value={stats?.confirmed || 0}
          icon={<CheckCircle className="w-4 h-4" />}
          color="text-green-600"
        />
        <StatCard
          title="Completed"
          value={stats?.completed || 0}
          color="text-blue-600"
        />
        <StatCard
          title="Cancelled"
          value={stats?.cancelled || 0}
          color="text-red-600"
        />
      </div>

      {/* Event List */}
      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
        </CardHeader>
        <CardContent>
          {events?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No events yet. Add your first event to get started!
            </div>
          ) : (
            <div className="space-y-2">
              {events?.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{event.title}</h3>
                      {event.event_type && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {event.event_type}
                        </span>
                      )}
                      {event.status && (
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            event.status === 'confirmed'
                              ? 'bg-green-100 text-green-700'
                              : event.status === 'completed'
                              ? 'bg-blue-100 text-blue-700'
                              : event.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {event.status}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {event.event_date && (
                        <p>Date: {new Date(event.event_date).toLocaleDateString()}</p>
                      )}
                      {event.start_time && <p>Time: {event.start_time} {event.end_time && `- ${event.end_time}`}</p>}
                      {event.venue_name && <p>Venue: {event.venue_name}</p>}
                      {event.location && <p>Location: {event.location}</p>}
                      {event.guest_count && (
                        <p className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {event.guest_count} guests
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(event)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(event.id)}
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
              {editingEvent ? 'Edit Event' : 'Add New Event'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Event Title *</Label>
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
                <Label htmlFor="eventType">Event Type</Label>
                <Input
                  id="eventType"
                  value={formData.eventType}
                  onChange={(e) =>
                    setFormData({ ...formData, eventType: e.target.value })
                  }
                  placeholder="e.g., Ceremony, Reception"
                />
              </div>
              <div>
                <Label htmlFor="eventDate">Event Date *</Label>
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
                <Label htmlFor="startTime">Start Time</Label>
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
                <Label htmlFor="guestCount">Guest Count</Label>
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
                <Label htmlFor="status">Status</Label>
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
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="venueName">Venue Name</Label>
                <Input
                  id="venueName"
                  value={formData.venueName}
                  onChange={(e) =>
                    setFormData({ ...formData, venueName: e.target.value })
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
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
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
                  setEditingEvent(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingEvent ? 'Update' : 'Add'} Event
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
