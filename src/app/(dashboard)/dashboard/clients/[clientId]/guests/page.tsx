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
import { Plus, Trash2, Edit, UserCheck, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function GuestsPage() {
  const params = useParams()
  const clientId = params?.clientId as string
  const { toast } = useToast()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingGuest, setEditingGuest] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    groupName: '',
    dietaryRestrictions: '',
    accessibilityNeeds: '',
    plusOne: false,
    rsvpStatus: 'pending' as 'pending' | 'accepted' | 'declined',
    notes: '',
  })

  const utils = trpc.useUtils()

  // Queries
  const { data: guests, isLoading } = trpc.guests.getAll.useQuery({
    clientId: clientId,
  })

  const { data: stats } = trpc.guests.getStats.useQuery({
    clientId: clientId,
  })

  // Mutations
  const createMutation = trpc.guests.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Guest added successfully' })
      utils.guests.getAll.invalidate()
      utils.guests.getStats.invalidate()
      resetForm()
      setIsAddDialogOpen(false)
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = trpc.guests.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Guest updated successfully' })
      utils.guests.getAll.invalidate()
      utils.guests.getStats.invalidate()
      setEditingGuest(null)
      resetForm()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = trpc.guests.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Guest deleted successfully' })
      utils.guests.getAll.invalidate()
      utils.guests.getStats.invalidate()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      groupName: '',
      dietaryRestrictions: '',
      accessibilityNeeds: '',
      plusOne: false,
      rsvpStatus: 'pending',
      notes: '',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingGuest) {
      updateMutation.mutate({
        id: editingGuest.id,
        data: formData,
      })
    } else {
      createMutation.mutate({
        clientId: clientId,
        ...formData,
      })
    }
  }

  const handleEdit = (guest: any) => {
    setEditingGuest(guest)
    setFormData({
      name: guest.name || '',
      email: guest.email || '',
      phone: guest.phone || '',
      groupName: guest.group_name || '',
      dietaryRestrictions: guest.dietary_restrictions || '',
      accessibilityNeeds: guest.accessibility_needs || '',
      plusOne: guest.plus_one_allowed || false,
      rsvpStatus: guest.rsvp_status || 'pending',
      notes: guest.notes || '',
    })
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this guest?')) {
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
        <p>Loading guests...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Guest List</h1>
          <p className="text-muted-foreground">Manage your wedding guests</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Guest
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          title="Total Guests"
          value={stats?.total || 0}
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          title="Attending"
          value={stats?.attending || 0}
          icon={<UserCheck className="w-4 h-4" />}
          color="text-green-600"
        />
        <StatCard
          title="Declined"
          value={stats?.declined || 0}
          color="text-red-600"
        />
        <StatCard
          title="Pending"
          value={stats?.pending || 0}
          color="text-yellow-600"
        />
        <StatCard
          title="Checked In"
          value={stats?.checkedIn || 0}
          color="text-blue-600"
        />
      </div>

      {/* Guest List */}
      <Card>
        <CardHeader>
          <CardTitle>All Guests</CardTitle>
        </CardHeader>
        <CardContent>
          {guests?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No guests yet. Add your first guest to get started!
            </div>
          ) : (
            <div className="space-y-2">
              {guests?.map((guest) => (
                <div
                  key={guest.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{`${guest.first_name} ${guest.last_name}`}</h3>
                      {guest.plus_one_allowed && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          +1
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {guest.email && <p>Email: {guest.email}</p>}
                      {guest.group_name && <p>Group: {guest.group_name}</p>}
                      {guest.dietary_restrictions && (
                        <p>Dietary: {guest.dietary_restrictions}</p>
                      )}
                      <p>
                        RSVP:{' '}
                        <span
                          className={
                            guest.rsvp_status === 'accepted'
                              ? 'text-green-600'
                              : guest.rsvp_status === 'declined'
                              ? 'text-red-600'
                              : 'text-yellow-600'
                          }
                        >
                          {guest.rsvp_status || 'Pending'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(guest)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(guest.id)}
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
        open={isAddDialogOpen || !!editingGuest}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false)
            setEditingGuest(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingGuest ? 'Edit Guest' : 'Add New Guest'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="groupName">Group</Label>
                <Input
                  id="groupName"
                  value={formData.groupName}
                  onChange={(e) =>
                    setFormData({ ...formData, groupName: e.target.value })
                  }
                  placeholder="e.g., Family, Friends"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="dietaryRestrictions">Dietary Restrictions</Label>
              <Input
                id="dietaryRestrictions"
                value={formData.dietaryRestrictions}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dietaryRestrictions: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="accessibilityNeeds">Accessibility Needs</Label>
              <Input
                id="accessibilityNeeds"
                value={formData.accessibilityNeeds}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    accessibilityNeeds: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="plusOne"
                checked={formData.plusOne}
                onChange={(e) =>
                  setFormData({ ...formData, plusOne: e.target.checked })
                }
                className="w-4 h-4"
              />
              <Label htmlFor="plusOne">Plus One</Label>
            </div>
            <div>
              <Label htmlFor="rsvpStatus">RSVP Status</Label>
              <Select
                value={formData.rsvpStatus}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, rsvpStatus: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
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
                  setEditingGuest(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingGuest ? 'Update' : 'Add'} Guest
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
