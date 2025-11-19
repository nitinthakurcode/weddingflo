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
import { Plus, Trash2, Edit, Hotel, CheckCircle, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function HotelsPage() {
  const params = useParams()
  const clientId = params?.clientId as string
  const { toast } = useToast()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingHotel, setEditingHotel] = useState<any>(null)
  const [formData, setFormData] = useState({
    guestName: '',
    hotelName: '',
    roomNumber: '',
    roomType: '',
    checkInDate: '',
    checkOutDate: '',
    accommodationNeeded: true,
    bookingConfirmed: false,
    checkedIn: false,
    cost: '',
    paymentStatus: 'pending' as 'pending' | 'paid' | 'overdue',
    notes: '',
  })

  const utils = trpc.useUtils()

  // Queries
  const { data: hotels, isLoading } = trpc.hotels.getAll.useQuery({
    clientId: clientId,
  })

  const { data: stats } = trpc.hotels.getStats.useQuery({
    clientId: clientId,
  })

  // Mutations
  const createMutation = trpc.hotels.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Hotel booking added successfully' })
      utils.hotels.getAll.invalidate()
      utils.hotels.getStats.invalidate()
      resetForm()
      setIsAddDialogOpen(false)
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = trpc.hotels.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Hotel booking updated successfully' })
      utils.hotels.getAll.invalidate()
      utils.hotels.getStats.invalidate()
      setEditingHotel(null)
      resetForm()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = trpc.hotels.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Hotel booking deleted successfully' })
      utils.hotels.getAll.invalidate()
      utils.hotels.getStats.invalidate()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const resetForm = () => {
    setFormData({
      guestName: '',
      hotelName: '',
      roomNumber: '',
      roomType: '',
      checkInDate: '',
      checkOutDate: '',
      accommodationNeeded: true,
      bookingConfirmed: false,
      checkedIn: false,
      cost: '',
      paymentStatus: 'pending',
      notes: '',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const submitData = {
      ...formData,
      cost: formData.cost ? parseFloat(formData.cost) : undefined,
    }

    if (editingHotel) {
      updateMutation.mutate({
        id: editingHotel.id,
        data: submitData,
      })
    } else {
      createMutation.mutate({
        clientId: clientId,
        ...submitData,
      })
    }
  }

  const handleEdit = (hotel: any) => {
    setEditingHotel(hotel)
    setFormData({
      guestName: hotel.guest_name || '',
      hotelName: hotel.hotel_name || '',
      roomNumber: hotel.room_number || '',
      roomType: hotel.room_type || '',
      checkInDate: hotel.check_in_date || '',
      checkOutDate: hotel.check_out_date || '',
      accommodationNeeded: hotel.accommodation_needed ?? true,
      bookingConfirmed: hotel.booking_confirmed || false,
      checkedIn: hotel.checked_in || false,
      cost: hotel.cost ? hotel.cost.toString() : '',
      paymentStatus: hotel.payment_status || 'pending',
      notes: hotel.notes || '',
    })
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this hotel booking?')) {
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
        <p>Loading hotel bookings...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Hotel Accommodations</h1>
          <p className="text-muted-foreground">Manage guest hotel bookings</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Booking
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          title="Total Bookings"
          value={stats?.total || 0}
          icon={<Hotel className="w-4 h-4" />}
        />
        <StatCard
          title="Needing Accommodation"
          value={stats?.needingAccommodation || 0}
          color="text-blue-600"
        />
        <StatCard
          title="Confirmed"
          value={stats?.bookingConfirmed || 0}
          icon={<CheckCircle className="w-4 h-4" />}
          color="text-green-600"
        />
        <StatCard
          title="Checked In"
          value={stats?.checkedIn || 0}
          color="text-purple-600"
        />
        <StatCard
          title="Pending"
          value={stats?.pending || 0}
          icon={<Clock className="w-4 h-4" />}
          color="text-yellow-600"
        />
      </div>

      {/* Hotel List */}
      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {hotels?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hotel bookings yet. Add your first booking to get started!
            </div>
          ) : (
            <div className="space-y-2">
              {hotels?.map((hotel) => (
                <div
                  key={hotel.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{hotel.guest_name}</h3>
                      {hotel.booking_confirmed && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          Confirmed
                        </span>
                      )}
                      {hotel.checked_in && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          Checked In
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {hotel.hotel_name && <p>Hotel: {hotel.hotel_name}</p>}
                      {hotel.room_number && <p>Room: {hotel.room_number} ({hotel.room_type})</p>}
                      {hotel.check_in_date && (
                        <p>Check-in: {new Date(hotel.check_in_date).toLocaleDateString()}</p>
                      )}
                      {hotel.check_out_date && (
                        <p>Check-out: {new Date(hotel.check_out_date).toLocaleDateString()}</p>
                      )}
                      {hotel.cost && <p>Cost: ${hotel.cost}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(hotel)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(hotel.id)}
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
        open={isAddDialogOpen || !!editingHotel}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false)
            setEditingHotel(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingHotel ? 'Edit Hotel Booking' : 'Add Hotel Booking'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="guestName">Guest Name *</Label>
                <Input
                  id="guestName"
                  value={formData.guestName}
                  onChange={(e) =>
                    setFormData({ ...formData, guestName: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="hotelName">Hotel Name</Label>
                <Input
                  id="hotelName"
                  value={formData.hotelName}
                  onChange={(e) =>
                    setFormData({ ...formData, hotelName: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="roomNumber">Room Number</Label>
                <Input
                  id="roomNumber"
                  value={formData.roomNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, roomNumber: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="roomType">Room Type</Label>
                <Input
                  id="roomType"
                  value={formData.roomType}
                  onChange={(e) =>
                    setFormData({ ...formData, roomType: e.target.value })
                  }
                  placeholder="e.g., King, Double"
                />
              </div>
              <div>
                <Label htmlFor="checkInDate">Check-in Date</Label>
                <Input
                  id="checkInDate"
                  type="date"
                  value={formData.checkInDate}
                  onChange={(e) =>
                    setFormData({ ...formData, checkInDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="checkOutDate">Check-out Date</Label>
                <Input
                  id="checkOutDate"
                  type="date"
                  value={formData.checkOutDate}
                  onChange={(e) =>
                    setFormData({ ...formData, checkOutDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="cost">Cost ($)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData({ ...formData, cost: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="paymentStatus">Payment Status</Label>
                <Select
                  value={formData.paymentStatus}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, paymentStatus: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="accommodationNeeded"
                  checked={formData.accommodationNeeded}
                  onChange={(e) =>
                    setFormData({ ...formData, accommodationNeeded: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor="accommodationNeeded">Accommodation Needed</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="bookingConfirmed"
                  checked={formData.bookingConfirmed}
                  onChange={(e) =>
                    setFormData({ ...formData, bookingConfirmed: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor="bookingConfirmed">Booking Confirmed</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="checkedIn"
                  checked={formData.checkedIn}
                  onChange={(e) =>
                    setFormData({ ...formData, checkedIn: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor="checkedIn">Checked In</Label>
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
                  setEditingHotel(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingHotel ? 'Update' : 'Add'} Booking
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
