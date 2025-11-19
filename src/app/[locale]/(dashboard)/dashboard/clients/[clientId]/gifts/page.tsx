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
import { Plus, Trash2, Edit, Gift, CheckCircle, Package, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ImportDialog } from '@/components/import/ImportDialog'

export default function GiftsPage() {
  const params = useParams()
  const clientId = params?.clientId as string
  const { toast } = useToast()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingGift, setEditingGift] = useState<any>(null)
  const [formData, setFormData] = useState({
    giftName: '',
    fromName: '',
    fromEmail: '',
    deliveryDate: '',
    deliveryStatus: 'pending' as 'pending' | 'received' | 'returned',
    thankYouSent: false,
    thankYouSentDate: '',
    notes: '',
  })

  const utils = trpc.useUtils()

  // Queries
  const { data: gifts, isLoading } = trpc.gifts.getAll.useQuery({
    clientId: clientId,
  })

  const { data: stats } = trpc.gifts.getStats.useQuery({
    clientId: clientId,
  })

  // Mutations
  const createMutation = trpc.gifts.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Gift added successfully' })
      utils.gifts.getAll.invalidate()
      utils.gifts.getStats.invalidate()
      resetForm()
      setIsAddDialogOpen(false)
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = trpc.gifts.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Gift updated successfully' })
      utils.gifts.getAll.invalidate()
      utils.gifts.getStats.invalidate()
      setEditingGift(null)
      resetForm()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = trpc.gifts.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Gift deleted successfully' })
      utils.gifts.getAll.invalidate()
      utils.gifts.getStats.invalidate()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const markThankYouSentMutation = trpc.gifts.markThankYouSent.useMutation({
    onSuccess: () => {
      toast({ title: 'Thank you marked as sent' })
      utils.gifts.getAll.invalidate()
      utils.gifts.getStats.invalidate()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const resetForm = () => {
    setFormData({
      giftName: '',
      fromName: '',
      fromEmail: '',
      deliveryDate: '',
      deliveryStatus: 'pending',
      thankYouSent: false,
      thankYouSentDate: '',
      notes: '',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingGift) {
      updateMutation.mutate({
        id: editingGift.id,
        data: formData,
      })
    } else {
      createMutation.mutate({
        clientId: clientId,
        ...formData,
      })
    }
  }

  const handleEdit = (gift: any) => {
    setEditingGift(gift)
    setFormData({
      giftName: gift.gift_name || '',
      fromName: gift.from_name || '',
      fromEmail: gift.from_email || '',
      deliveryDate: gift.delivery_date || '',
      deliveryStatus: gift.delivery_status || 'pending',
      thankYouSent: gift.thank_you_sent || false,
      thankYouSentDate: gift.thank_you_sent_date || '',
      notes: gift.notes || '',
    })
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this gift?')) {
      deleteMutation.mutate({ id })
    }
  }

  const handleMarkThankYouSent = (id: string) => {
    markThankYouSentMutation.mutate({ id })
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
        <p>Loading gifts...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gift Registry</h1>
          <p className="text-muted-foreground">Track gifts and thank you notes</p>
        </div>
        <div className="flex gap-2">
          <ImportDialog
            module="gifts"
            clientId={clientId}
            onImportComplete={() => {
              utils.gifts.getAll.invalidate()
              utils.gifts.getStats.invalidate()
              toast({ title: 'Import completed successfully!' })
            }}
          />
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Gift
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          title="Total Gifts"
          value={stats?.total || 0}
          icon={<Gift className="w-4 h-4" />}
        />
        <StatCard
          title="Received"
          value={stats?.received || 0}
          icon={<Package className="w-4 h-4" />}
          color="text-green-600"
        />
        <StatCard
          title="Pending"
          value={stats?.pending || 0}
          icon={<Clock className="w-4 h-4" />}
          color="text-yellow-600"
        />
        <StatCard
          title="Thank You Sent"
          value={stats?.thankYouSent || 0}
          icon={<CheckCircle className="w-4 h-4" />}
          color="text-blue-600"
        />
        <StatCard
          title="Thank You Pending"
          value={stats?.thankYouPending || 0}
          color="text-orange-600"
        />
      </div>

      {/* Gift List */}
      <Card>
        <CardHeader>
          <CardTitle>All Gifts</CardTitle>
        </CardHeader>
        <CardContent>
          {gifts?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No gifts yet. Add your first gift to get started!
            </div>
          ) : (
            <div className="space-y-2">
              {gifts?.map((gift) => (
                <div
                  key={gift.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{gift.gift_name}</h3>
                      {gift.delivery_status === 'received' && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          Received
                        </span>
                      )}
                      {gift.thank_you_sent && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          Thank You Sent
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {gift.from_name && <p>From: {gift.from_name}</p>}
                      {gift.from_email && <p>Email: {gift.from_email}</p>}
                      {gift.delivery_date && (
                        <p>Delivered: {new Date(gift.delivery_date).toLocaleDateString()}</p>
                      )}
                      <p>
                        Status:{' '}
                        <span
                          className={
                            gift.delivery_status === 'received'
                              ? 'text-green-600'
                              : gift.delivery_status === 'returned'
                              ? 'text-red-600'
                              : 'text-yellow-600'
                          }
                        >
                          {gift.delivery_status}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {gift.delivery_status === 'received' && !gift.thank_you_sent && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkThankYouSent(gift.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Mark Sent
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(gift)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(gift.id)}
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
        open={isAddDialogOpen || !!editingGift}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false)
            setEditingGift(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingGift ? 'Edit Gift' : 'Add New Gift'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="giftName">Gift Name *</Label>
                <Input
                  id="giftName"
                  value={formData.giftName}
                  onChange={(e) =>
                    setFormData({ ...formData, giftName: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="fromName">From Name</Label>
                <Input
                  id="fromName"
                  value={formData.fromName}
                  onChange={(e) =>
                    setFormData({ ...formData, fromName: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="fromEmail">From Email</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  value={formData.fromEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, fromEmail: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="deliveryDate">Delivery Date</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) =>
                    setFormData({ ...formData, deliveryDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="deliveryStatus">Delivery Status</Label>
                <Select
                  value={formData.deliveryStatus}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, deliveryStatus: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="thankYouSentDate">Thank You Sent Date</Label>
                <Input
                  id="thankYouSentDate"
                  type="date"
                  value={formData.thankYouSentDate}
                  onChange={(e) =>
                    setFormData({ ...formData, thankYouSentDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="thankYouSent"
                checked={formData.thankYouSent}
                onChange={(e) =>
                  setFormData({ ...formData, thankYouSent: e.target.checked })
                }
                className="w-4 h-4"
              />
              <Label htmlFor="thankYouSent">Thank You Sent</Label>
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
                  setEditingGift(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingGift ? 'Update' : 'Add'} Gift
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
