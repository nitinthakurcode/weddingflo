'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Hotel, Plus, Trash2, Users, GripVertical, Save, Building2 } from 'lucide-react'

interface RoomAssignment {
  roomNumber: string
  guests: string[]
}

interface RoomAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mainGuestName: string
  partyMembers: string[]
  hotelName?: string
  availableHotels?: string[] // List of existing hotel names
  onSaveAssignments: (rooms: RoomAssignment[], selectedHotel: string) => void
}

export function RoomAssignmentDialog({
  open,
  onOpenChange,
  mainGuestName,
  partyMembers,
  hotelName,
  availableHotels = [],
  onSaveAssignments,
}: RoomAssignmentDialogProps) {
  const [rooms, setRooms] = useState<RoomAssignment[]>([
    { roomNumber: '', guests: [] }
  ])
  const [unassignedGuests, setUnassignedGuests] = useState<string[]>([])
  const [selectedHotel, setSelectedHotel] = useState<string>(hotelName || '')
  const [isCreatingHotel, setIsCreatingHotel] = useState(false)
  const [newHotelName, setNewHotelName] = useState('')

  // Initialize state when dialog opens
  useEffect(() => {
    if (open) {
      const allGuests = [mainGuestName, ...partyMembers.filter(m => m !== mainGuestName)]
      const assignedGuests = rooms.flatMap(r => r.guests)
      setUnassignedGuests(allGuests.filter(g => !assignedGuests.includes(g)))

      // Auto-select hotel if only one available and no current selection
      if (!hotelName && availableHotels.length === 1) {
        setSelectedHotel(availableHotels[0])
      } else if (hotelName) {
        setSelectedHotel(hotelName)
      }
    }
  }, [open, mainGuestName, partyMembers, rooms, hotelName, availableHotels])

  const handleHotelChange = (value: string) => {
    if (value === '__create_new__') {
      setIsCreatingHotel(true)
      setSelectedHotel('')
    } else {
      setIsCreatingHotel(false)
      setSelectedHotel(value)
    }
  }

  const handleCreateHotel = () => {
    if (newHotelName.trim()) {
      setSelectedHotel(newHotelName.trim())
      setIsCreatingHotel(false)
      setNewHotelName('')
    }
  }

  const addRoom = () => {
    setRooms([...rooms, { roomNumber: '', guests: [] }])
  }

  const removeRoom = (index: number) => {
    const room = rooms[index]
    // Return guests to unassigned pool
    setUnassignedGuests([...unassignedGuests, ...room.guests])
    setRooms(rooms.filter((_, i) => i !== index))
  }

  const updateRoomNumber = (index: number, roomNumber: string) => {
    const updated = [...rooms]
    updated[index].roomNumber = roomNumber
    setRooms(updated)
  }

  const assignGuestToRoom = (guestName: string, roomIndex: number) => {
    // Remove from unassigned
    setUnassignedGuests(unassignedGuests.filter(g => g !== guestName))
    // Add to room
    const updated = [...rooms]
    updated[roomIndex].guests.push(guestName)
    setRooms(updated)
  }

  const removeGuestFromRoom = (guestName: string, roomIndex: number) => {
    // Add back to unassigned
    setUnassignedGuests([...unassignedGuests, guestName])
    // Remove from room
    const updated = [...rooms]
    updated[roomIndex].guests = updated[roomIndex].guests.filter(g => g !== guestName)
    setRooms(updated)
  }

  const handleSave = () => {
    // Filter out empty rooms
    const validRooms = rooms.filter(r => r.roomNumber && r.guests.length > 0)
    onSaveAssignments(validRooms, selectedHotel)
    onOpenChange(false)
  }

  const totalAssigned = rooms.reduce((sum, r) => sum + r.guests.length, 0)
  const totalGuests = partyMembers.length + 1 // +1 for main guest

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hotel className="w-5 h-5 text-primary" />
            Room Assignment
          </DialogTitle>
          <DialogDescription>
            {hotelName ? `Assign party members to rooms at ${hotelName}` : 'Assign party members to rooms'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Hotel Selection */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Select Hotel
              </Label>
              {isCreatingHotel ? (
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Enter new hotel name"
                    value={newHotelName}
                    onChange={(e) => setNewHotelName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateHotel()}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleCreateHotel}>
                    Add
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setIsCreatingHotel(false)
                    setNewHotelName('')
                  }}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Select value={selectedHotel} onValueChange={handleHotelChange}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Choose a hotel or create new" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableHotels.map((hotel) => (
                      <SelectItem key={hotel} value={hotel}>
                        {hotel}
                      </SelectItem>
                    ))}
                    <SelectItem value="__create_new__" className="text-primary font-medium">
                      <span className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Create New Hotel
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
              {selectedHotel && !isCreatingHotel && (
                <p className="text-xs text-muted-foreground mt-2">
                  Rooms will be assigned at: <span className="font-medium">{selectedHotel}</span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Progress indicator */}
          <div className="flex items-center justify-between text-sm bg-muted/50 p-3 rounded-lg">
            <span className="text-muted-foreground">Assignment Progress</span>
            <Badge variant={totalAssigned === totalGuests ? 'default' : 'secondary'}>
              {totalAssigned} / {totalGuests} assigned
            </Badge>
          </div>

          {/* Unassigned guests pool */}
          {unassignedGuests.length > 0 && (
            <Card className="border-dashed border-2">
              <CardContent className="p-4">
                <Label className="text-sm text-muted-foreground mb-2 block">
                  Unassigned Guests ({unassignedGuests.length})
                </Label>
                <div className="flex flex-wrap gap-2">
                  {unassignedGuests.map((guest) => (
                    <Badge
                      key={guest}
                      variant="outline"
                      className="cursor-grab hover:bg-primary/10 transition-colors"
                    >
                      <GripVertical className="w-3 h-3 mr-1 opacity-50" />
                      {guest}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Room cards */}
          <div className="space-y-3">
            {rooms.map((room, roomIndex) => (
              <Card key={roomIndex} className="border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-3">
                      {/* Room number input */}
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Room number (e.g., 101)"
                          value={room.roomNumber}
                          onChange={(e) => updateRoomNumber(roomIndex, e.target.value)}
                          className="w-40"
                        />
                        {rooms.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRoom(roomIndex)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      {/* Guests in this room */}
                      <div className="min-h-[40px] p-2 bg-muted/30 rounded-lg">
                        {room.guests.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-1">
                            Click guests above to assign them
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {room.guests.map((guest) => (
                              <Badge
                                key={guest}
                                variant="default"
                                className="cursor-pointer"
                                onClick={() => removeGuestFromRoom(guest, roomIndex)}
                              >
                                <Users className="w-3 h-3 mr-1" />
                                {guest}
                                <span className="ml-1 opacity-60">×</span>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Quick assign buttons */}
                      {unassignedGuests.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {unassignedGuests.map((guest) => (
                            <Button
                              key={guest}
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => assignGuestToRoom(guest, roomIndex)}
                            >
                              + {guest}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add room button */}
          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={addRoom}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Another Room
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={totalAssigned === 0}>
            <Save className="w-4 h-4 mr-2" />
            Save Assignments
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
