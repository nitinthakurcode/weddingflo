'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2, Edit, Hotel, CheckCircle, Clock, RefreshCw, Users, Download, Upload } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ExportButton } from '@/components/export/export-button'
import { ImportDialog } from '@/components/import/ImportDialog'
import { ClientModuleHeader } from '@/components/dashboard/ClientModuleHeader'
import { RoomAssignmentDialog } from '@/components/hotels/RoomAssignmentDialog'

export default function HotelsPage() {
  const params = useParams()
  const clientId = params?.clientId as string
  const { toast } = useToast()
  const t = useTranslations('hotels')
  const tc = useTranslations('common')
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
    partySize: 1,
    guestNamesInRoom: '', // For assigning specific guests to this room
  })

  // Room assignment dialog state
  const [showRoomAssignment, setShowRoomAssignment] = useState(false)
  const [partyMembers, setPartyMembers] = useState<string[]>([])

  const utils = trpc.useUtils()

  // Queries - use getAllWithGuests to get guest info
  const { data: hotels, isLoading } = trpc.hotels.getAllWithGuests.useQuery({
    clientId: clientId,
  })

  const { data: stats } = trpc.hotels.getStats.useQuery({
    clientId: clientId,
  })

  // Mutations
  const syncMutation = trpc.hotels.syncWithGuests.useMutation({
    onSuccess: async (result) => {
      if (result.synced > 0) {
        toast({
          title: t('guestsSynced'),
          description: t('syncedDescription', { synced: result.synced, total: result.total ?? 0 })
        })
      } else {
        toast({
          title: t('alreadySynced'),
          description: t('alreadySyncedDescription')
        })
      }
      await Promise.all([
        utils.hotels.getAllWithGuests.invalidate({ clientId }),
        utils.hotels.getStats.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: t('errorSyncing'), description: error.message, variant: 'destructive' })
    },
  })

  const createMutation = trpc.hotels.create.useMutation({
    onSuccess: async () => {
      toast({ title: t('bookingAdded') })
      resetForm()
      setIsAddDialogOpen(false)
      await Promise.all([
        utils.hotels.getAllWithGuests.invalidate({ clientId }),
        utils.hotels.getStats.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = trpc.hotels.update.useMutation({
    onSuccess: async () => {
      toast({ title: t('bookingUpdated') })
      setEditingHotel(null)
      resetForm()
      await Promise.all([
        utils.hotels.getAllWithGuests.invalidate({ clientId }),
        utils.hotels.getStats.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = trpc.hotels.delete.useMutation({
    onSuccess: async () => {
      toast({ title: t('bookingDeleted') })
      await Promise.all([
        utils.hotels.getAllWithGuests.invalidate({ clientId }),
        utils.hotels.getStats.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  // Handle sync on initial load
  const handleSync = () => {
    syncMutation.mutate({ clientId })
  }

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
      partySize: 1,
      guestNamesInRoom: '',
    })
    setPartyMembers([])
  }

  // Batch save all room assignments as a SINGLE record with multi-room structure
  const handleBatchRoomAssignments = async (
    rooms: Array<{ roomNumber: string; guests: string[] }>
  ) => {
    try {
      // Build room assignments object: {"143": {"guests": ["first", "ape"], "roomType": "deluxe"}, ...}
      const roomAssignments = rooms.reduce((acc, room) => {
        acc[room.roomNumber] = {
          guests: room.guests,
          roomType: formData.roomType || '',
        }
        return acc
      }, {} as Record<string, { guests: string[]; roomType: string }>)

      // Calculate total party size
      const totalPartySize = rooms.reduce((sum, room) => sum + room.guests.length, 0)

      // Get all room numbers as comma-separated string for display
      const roomNumbers = rooms.map(r => r.roomNumber).join(', ')

      const hotelData = {
        guestId: editingHotel?.guestId,
        guestName: formData.guestName,
        partySize: totalPartySize,
        roomAssignments,
        hotelName: formData.hotelName,
        roomNumber: rooms[0]?.roomNumber || '', // Legacy field - first room
        roomType: formData.roomType,
        checkInDate: formData.checkInDate,
        checkOutDate: formData.checkOutDate,
        accommodationNeeded: true,
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
      }

      if (editingHotel) {
        // Update existing hotel record
        await updateMutation.mutateAsync({
          id: editingHotel.id,
          data: hotelData,
        })
      } else {
        // Create new hotel record
        await createMutation.mutateAsync({
          clientId: clientId,
          ...hotelData,
        })
      }

      // Refresh data
      await Promise.all([
        utils.hotels.getAllWithGuests.invalidate({ clientId }),
        utils.hotels.getStats.invalidate({ clientId }),
      ])
    } catch (error) {
      throw error // Re-throw to let dialog handle it
    }
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

    // Auto-populate check-in/check-out from guest arrival/departure if not already set
    let checkInDate = hotel.checkInDate || ''
    let checkOutDate = hotel.checkOutDate || ''

    // If dates not set but guest has arrival/departure times, use those
    if (!checkInDate && hotel.guests?.arrivalDatetime) {
      checkInDate = new Date(hotel.guests.arrivalDatetime).toISOString().split('T')[0]
    }
    if (!checkOutDate && hotel.guests?.departureDatetime) {
      checkOutDate = new Date(hotel.guests.departureDatetime).toISOString().split('T')[0]
    }

    // Build list of party members (main guest + additional guests)
    const guests: string[] = []
    const mainGuestName = hotel.guestName || hotel.guest_name || ''
    if (mainGuestName) {
      guests.push(mainGuestName)
    }
    if (hotel.guests?.additionalGuestNames && Array.isArray(hotel.guests.additionalGuestNames)) {
      guests.push(...hotel.guests.additionalGuestNames.filter(Boolean))
    }

    // Set party members for room assignment dialog
    setPartyMembers([...guests])

    // Auto-populate party size from guest list
    const autoPartySize = hotel.guests?.partySize || guests.length || 1

    setFormData({
      guestName: mainGuestName,
      hotelName: hotel.hotelName || '',
      roomNumber: hotel.roomNumber || '',
      roomType: hotel.roomType || '',
      checkInDate,
      checkOutDate,
      accommodationNeeded: hotel.accommodationNeeded ?? true,
      bookingConfirmed: hotel.bookingConfirmed || false,
      checkedIn: hotel.checkedIn || false,
      cost: hotel.cost ? hotel.cost.toString() : '',
      paymentStatus: hotel.paymentStatus || 'pending',
      notes: hotel.notes || '',
      partySize: autoPartySize,
      guestNamesInRoom: guests.join(', '),
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <ClientModuleHeader
        title={t('hotelAccommodations')}
        description={t('manageHotelBookings')}
      >
        <ImportDialog
          module="hotels"
          clientId={clientId}
          onImportComplete={() => {
            utils.hotels.getAllWithGuests.invalidate({ clientId })
            utils.hotels.getStats.invalidate({ clientId })
          }}
        />
        <ExportButton
          data={hotels || []}
          dataType="hotels"
          variant="outline"
        />
        <Button
          variant="outline"
          onClick={handleSync}
          disabled={syncMutation.isPending}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
          {syncMutation.isPending ? t('syncing') : t('syncFromGuests')}
        </Button>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('addBooking')}
        </Button>
      </ClientModuleHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          title={t('totalBookings')}
          value={stats?.total || 0}
          icon={<Hotel className="w-4 h-4" />}
        />
        <StatCard
          title={t('needingAccommodation')}
          value={stats?.needingAccommodation || 0}
          color="text-cobalt-600"
        />
        <StatCard
          title={t('confirmed')}
          value={stats?.bookingConfirmed || 0}
          icon={<CheckCircle className="w-4 h-4" />}
          color="text-sage-600"
        />
        <StatCard
          title={t('checkedIn')}
          value={stats?.checkedIn || 0}
          color="text-teal-600"
        />
        <StatCard
          title={tc('pending')}
          value={stats?.pending || 0}
          icon={<Clock className="w-4 h-4" />}
          color="text-gold-600"
        />
      </div>

      {/* Hotel List - Table View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t('guestAccommodations')} ({hotels?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hotels?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-4">{t('noBookingsYet')}</p>
              <p className="text-sm">
                {t('noBookingsDescription')}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('guestName')}</TableHead>
                    <TableHead>{t('contact')}</TableHead>
                    <TableHead>Guests in Room</TableHead>
                    <TableHead>{t('accommodation')}</TableHead>
                    <TableHead>{t('hotelName')}</TableHead>
                    <TableHead>{t('roomNumber')}</TableHead>
                    <TableHead>{t('partySize')}</TableHead>
                    <TableHead>{t('checkedIn')}</TableHead>
                    <TableHead>{tc('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hotels?.map((hotel: any) => (
                    <TableRow key={hotel.id}>
                      <TableCell>
                        <div className="font-medium">{hotel.guestName}</div>
                        {hotel.guests && (
                          <div className="text-xs text-muted-foreground">
                            {t('partyOf', { size: hotel.guests.partySize || 1 })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {hotel.guests ? (
                          <div className="text-sm">
                            {hotel.guests.email && (
                              <div className="truncate max-w-[150px]">{hotel.guests.email}</div>
                            )}
                            {hotel.guests.phone && (
                              <div className="text-muted-foreground">{hotel.guests.phone}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {hotel.roomAssignments && typeof hotel.roomAssignments === 'object' && Object.keys(hotel.roomAssignments).length > 0 ? (
                          <div className="text-sm max-w-[250px] space-y-1">
                            {Object.entries(hotel.roomAssignments as Record<string, { guests: string[], roomType?: string }>).map(([roomNum, details]) => (
                              <div key={roomNum} className="text-xs">
                                <span className="font-medium text-cobalt-600 dark:text-cobalt-400">
                                  {roomNum}:
                                </span>{' '}
                                <span className="text-muted-foreground">
                                  {details.guests.join(', ')}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : hotel.guestNamesInRoom ? (
                          <div className="text-sm max-w-[200px]">
                            <span className="font-medium text-cobalt-600 dark:text-cobalt-400">
                              {hotel.guestNamesInRoom}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">Not specified</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {hotel.accommodationNeeded ? (
                          <Badge className="bg-sage-600">{tc('yes')}</Badge>
                        ) : (
                          <Badge variant="outline">{tc('no')}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {hotel.hotelName ? (
                          <span>{hotel.hotelName}</span>
                        ) : (
                          <span className="text-muted-foreground">{t('notAssigned')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {hotel.roomAssignments && typeof hotel.roomAssignments === 'object' && Object.keys(hotel.roomAssignments).length > 0 ? (
                          <div className="space-y-1">
                            {Object.entries(hotel.roomAssignments as Record<string, { guests: string[], roomType?: string }>).map(([roomNum, details]) => (
                              <div key={roomNum}>
                                <span className="font-medium">{roomNum}</span>
                                {details.roomType && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({details.roomType})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : hotel.roomNumber ? (
                          <div>
                            <span className="font-medium">{hotel.roomNumber}</span>
                            {hotel.roomType && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({hotel.roomType})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{hotel.partySize || 1}</span>
                          <span className="text-xs text-muted-foreground">
                            {hotel.partySize === 1 ? 'person' : 'people'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {hotel.checkedIn ? (
                          <div className="flex items-center gap-1 text-sage-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">{tc('yes')}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{tc('no')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(hotel)}
                            className="h-8 w-8 hover:bg-muted"
                          >
                            <Edit className="w-4 h-4" />
                            <span className="sr-only">{tc('edit')}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(hotel.id)}
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="sr-only">{tc('delete')}</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
              {editingHotel ? t('editBooking') : t('addBooking')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Guest Name - only shown for manual add */}
            {!editingHotel && (
              <div>
                <Label htmlFor="guestName">{t('guestName')} *</Label>
                <Input
                  id="guestName"
                  value={formData.guestName}
                  onChange={(e) =>
                    setFormData({ ...formData, guestName: e.target.value })
                  }
                  required
                />
              </div>
            )}

            {/* Show guest name when editing */}
            {editingHotel && (
              <div className="p-3 bg-muted rounded-lg">
                <Label className="text-muted-foreground">{t('guest')}</Label>
                <p className="font-medium">{formData.guestName}</p>
              </div>
            )}

            {/* Primary Fields - The 4 key fields */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h4 className="font-medium text-sm text-muted-foreground">{t('keyInformation')}</h4>

              {/* Accommodation Status */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="accommodationNeeded"
                  checked={formData.accommodationNeeded}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, accommodationNeeded: checked as boolean })
                  }
                />
                <Label htmlFor="accommodationNeeded" className="text-sm font-medium">
                  {t('accommodationNeeded')}
                </Label>
              </div>

              {formData.accommodationNeeded && (
                <>
                  {/* Hotel Name */}
                  <div>
                    <Label htmlFor="hotelName">{t('hotelName')}</Label>
                    <Input
                      id="hotelName"
                      value={formData.hotelName}
                      onChange={(e) =>
                        setFormData({ ...formData, hotelName: e.target.value })
                      }
                      placeholder={t('enterHotelName')}
                    />
                  </div>

                  {/* Room Number */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="roomNumber">{t('roomNumber')}</Label>
                      <Input
                        id="roomNumber"
                        value={formData.roomNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, roomNumber: e.target.value })
                        }
                        placeholder={t('roomNumberPlaceholder')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="roomType">{t('roomType')}</Label>
                      <Input
                        id="roomType"
                        value={formData.roomType}
                        onChange={(e) =>
                          setFormData({ ...formData, roomType: e.target.value })
                        }
                        placeholder={t('roomTypePlaceholder')}
                      />
                    </div>
                  </div>

                  {/* Room Assignment Button - Opens Visual Dialog */}
                  {partyMembers.length > 1 && (
                    <div className="p-4 bg-gradient-to-br from-primary/5 to-gold-50 dark:from-primary/10 dark:to-gold-950/20 rounded-lg border border-primary/20 dark:border-primary/30">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <Label className="text-sm font-semibold text-primary dark:text-primary">
                            Party of {partyMembers.length}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Assign guests to different rooms
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary">
                          <Users className="w-3 h-3 mr-1" />
                          {partyMembers.length} guests
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-2 border-primary/30 dark:border-primary/40 text-primary dark:text-primary hover:bg-primary/5 dark:hover:bg-primary/10"
                        onClick={() => setShowRoomAssignment(true)}
                      >
                        <Hotel className="w-4 h-4 mr-2" />
                        Assign Rooms to Party Members
                      </Button>
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        Visual drag-and-drop interface
                      </p>
                    </div>
                  )}

                  {/* Checked In */}
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="checkedIn"
                      checked={formData.checkedIn}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, checkedIn: checked as boolean })
                      }
                    />
                    <Label htmlFor="checkedIn" className="text-sm font-medium">
                      {t('checkedIn')}
                    </Label>
                  </div>
                </>
              )}
            </div>

            {/* Additional Details - Collapsible or secondary */}
            {formData.accommodationNeeded && (
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">{t('additionalDetails')}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="checkInDate">{t('checkInDate')}</Label>
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
                    <Label htmlFor="checkOutDate">{t('checkOutDate')}</Label>
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
                    <Label htmlFor="cost">{t('cost')}</Label>
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
                    <Label htmlFor="paymentStatus">{t('paymentStatus')}</Label>
                    <Select
                      value={formData.paymentStatus}
                      onValueChange={(value: 'pending' | 'paid' | 'overdue') =>
                        setFormData({ ...formData, paymentStatus: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">{tc('pending')}</SelectItem>
                        <SelectItem value="paid">{t('paid')}</SelectItem>
                        <SelectItem value="overdue">{t('overdue')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="bookingConfirmed"
                    checked={formData.bookingConfirmed}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, bookingConfirmed: checked as boolean })
                    }
                  />
                  <Label htmlFor="bookingConfirmed" className="text-sm font-medium">
                    {t('bookingConfirmed')}
                  </Label>
                </div>
                <div>
                  <Label htmlFor="notes">{tc('notes')}</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={2}
                  />
                </div>
              </div>
            )}
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
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingHotel ? tc('update') : tc('add')} {t('booking')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Room Assignment Dialog - Visual drag-and-drop interface */}
      <RoomAssignmentDialog
        open={showRoomAssignment}
        onOpenChange={setShowRoomAssignment}
        mainGuestName={formData.guestName}
        partyMembers={partyMembers}
        hotelName={formData.hotelName}
        onSaveAssignments={handleBatchRoomAssignments}
      />
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
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{title}</p>
            <p className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</p>
          </div>
          {icon && (
            <div className="shrink-0 p-2 rounded-lg bg-muted/50 text-muted-foreground">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
