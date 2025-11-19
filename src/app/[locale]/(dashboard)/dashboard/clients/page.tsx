'use client'

import { useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Edit, Eye, MessageSquare, Users, Calendar, TrendingUp } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function ClientsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<any>(null)
  const [formData, setFormData] = useState({
    bride_name: '',
    groom_name: '',
    wedding_date: '',
    venue: '',
    email: '',
    phone: '',
    notes: '',
  })

  const utils = trpc.useUtils()

  // Queries
  const { data: clients, isLoading } = trpc.clients.list.useQuery({})

  // Calculate stats
  const stats = {
    total: clients?.length || 0,
    upcoming: clients?.filter(c => {
      if (!c.wedding_date) return false
      const weddingDate = new Date(c.wedding_date)
      return weddingDate > new Date()
    }).length || 0,
    activeThisMonth: clients?.filter(c => {
      if (!c.wedding_date) return false
      const weddingDate = new Date(c.wedding_date)
      const now = new Date()
      const thisMonth = now.getMonth()
      const thisYear = now.getFullYear()
      return weddingDate.getMonth() === thisMonth && weddingDate.getFullYear() === thisYear
    }).length || 0,
  }

  // Mutations
  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Client added successfully' })
      utils.clients.list.invalidate()
      resetForm()
      setIsAddDialogOpen(false)
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Client updated successfully' })
      utils.clients.list.invalidate()
      setEditingClient(null)
      resetForm()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Client deleted successfully' })
      utils.clients.list.invalidate()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const resetForm = () => {
    setFormData({
      bride_name: '',
      groom_name: '',
      wedding_date: '',
      venue: '',
      email: '',
      phone: '',
      notes: '',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Map form data to database schema (partner1/partner2 structure)
    const [bride_first, bride_last] = formData.bride_name.split(' ')
    const [groom_first, groom_last] = formData.groom_name.split(' ')

    const mappedData = {
      partner1_first_name: bride_first || formData.bride_name,
      partner1_last_name: bride_last || '',
      partner1_email: formData.email,
      partner1_phone: formData.phone,
      partner2_first_name: groom_first || formData.groom_name,
      partner2_last_name: groom_last || '',
      wedding_date: formData.wedding_date,
      venue: formData.venue,
      notes: formData.notes,
    }

    if (editingClient) {
      updateMutation.mutate({
        id: editingClient.id,
        ...mappedData,
      })
    } else {
      createMutation.mutate(mappedData)
    }
  }

  const handleEdit = (client: any) => {
    setEditingClient(client)
    setFormData({
      bride_name: client.bride_name || '',
      groom_name: client.groom_name || '',
      wedding_date: client.wedding_date || '',
      venue: client.venue || '',
      email: client.email || '',
      phone: client.phone || '',
      notes: client.notes || '',
    })
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this client? This will also delete all associated data (guests, vendors, budget, etc.).')) {
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
        <p>Loading clients...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground">Manage your wedding clients</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Clients"
          value={stats.total}
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          title="Upcoming Weddings"
          value={stats.upcoming}
          icon={<Calendar className="w-4 h-4" />}
          color="text-blue-600"
        />
        <StatCard
          title="Active This Month"
          value={stats.activeThisMonth}
          icon={<TrendingUp className="w-4 h-4" />}
          color="text-green-600"
        />
      </div>

      {/* Client Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4">All Clients</h2>
        {clients?.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                No clients yet. Add your first client to get started!
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients?.map((client) => (
              <Card key={client.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {client.partner1_first_name} {client.partner1_last_name} & {client.partner2_first_name} {client.partner2_last_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {client.wedding_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {new Date(client.wedding_date).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                    {client.venue && (
                      <p className="text-sm text-muted-foreground">
                        📍 {client.venue}
                      </p>
                    )}
                    {client.partner1_email && (
                      <p className="text-sm text-muted-foreground">
                        ✉️ {client.partner1_email}
                      </p>
                    )}
                    {client.partner1_phone && (
                      <p className="text-sm text-muted-foreground">
                        📞 {client.partner1_phone}
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
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleChat(client.id)}
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Chat
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
                      Edit
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? 'Edit Client' : 'Add New Client'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bride_name">Bride Name *</Label>
                <Input
                  id="bride_name"
                  value={formData.bride_name}
                  onChange={(e) =>
                    setFormData({ ...formData, bride_name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="groom_name">Groom Name *</Label>
                <Input
                  id="groom_name"
                  value={formData.groom_name}
                  onChange={(e) =>
                    setFormData({ ...formData, groom_name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="wedding_date">Wedding Date *</Label>
                <Input
                  id="wedding_date"
                  type="date"
                  value={formData.wedding_date}
                  onChange={(e) =>
                    setFormData({ ...formData, wedding_date: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  value={formData.venue}
                  onChange={(e) =>
                    setFormData({ ...formData, venue: e.target.value })
                  }
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
                  setEditingClient(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingClient ? 'Update' : 'Add'} Client
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
