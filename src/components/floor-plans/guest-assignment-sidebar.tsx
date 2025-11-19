'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, User, Users } from 'lucide-react'

interface Guest {
  id: string
  firstName: string
  lastName: string
  email: string
  dietaryRestrictions: string[]
  plusOnes: number
  rsvpStatus: string
  tableAssignment?: {
    tableId: string
    tableName: string
  }
}

interface GuestAssignmentSidebarProps {
  guests: Guest[]
  onAssignGuest: (guestId: string, tableId: string) => void
  onUnassignGuest: (guestId: string) => void
}

export function GuestAssignmentSidebar({
  guests,
  onAssignGuest,
  onUnassignGuest,
}: GuestAssignmentSidebarProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'unassigned' | 'assigned'>('unassigned')

  const filteredGuests = guests.filter(guest => {
    const matchesSearch =
      guest.firstName.toLowerCase().includes(search.toLowerCase()) ||
      guest.lastName.toLowerCase().includes(search.toLowerCase()) ||
      guest.email.toLowerCase().includes(search.toLowerCase())

    const matchesFilter =
      filter === 'all' ||
      (filter === 'unassigned' && !guest.tableAssignment) ||
      (filter === 'assigned' && guest.tableAssignment)

    return matchesSearch && matchesFilter
  })

  const handleDragStart = (e: React.DragEvent, guestId: string) => {
    e.dataTransfer.setData('guestId', guestId)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="w-80 border-l bg-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="font-semibold text-lg mb-3">Guest List</h3>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search guests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mt-3">
          {(['all', 'unassigned', 'assigned'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md text-sm ${
                filter === f
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-3 text-sm text-gray-600">
          <span>
            <Users className="inline h-4 w-4 mr-1" />
            {guests.length} total
          </span>
          <span>
            <User className="inline h-4 w-4 mr-1" />
            {guests.filter(g => !g.tableAssignment).length} unassigned
          </span>
        </div>
      </div>

      {/* Guest List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredGuests.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No guests found
            </div>
          ) : (
            filteredGuests.map((guest) => (
              <GuestCard
                key={guest.id}
                guest={guest}
                onDragStart={handleDragStart}
                onUnassign={onUnassignGuest}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// Individual Guest Card
function GuestCard({
  guest,
  onDragStart,
  onUnassign,
}: {
  guest: Guest
  onDragStart: (e: React.DragEvent, guestId: string) => void
  onUnassign: (guestId: string) => void
}) {
  return (
    <div
      draggable={!guest.tableAssignment}
      onDragStart={(e) => onDragStart(e, guest.id)}
      className={`p-3 rounded-lg border ${
        guest.tableAssignment
          ? 'bg-gray-50 border-gray-200'
          : 'bg-white border-gray-300 cursor-move hover:border-indigo-400'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-medium text-sm">
            {guest.firstName} {guest.lastName}
          </p>
          <p className="text-xs text-gray-500">{guest.email}</p>
        </div>

        {guest.tableAssignment && (
          <button
            onClick={() => onUnassign(guest.id)}
            className="text-xs text-red-600 hover:text-red-700"
          >
            Remove
          </button>
        )}
      </div>

      {/* Dietary Restrictions */}
      {guest.dietaryRestrictions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {guest.dietaryRestrictions.map((restriction) => (
            <Badge key={restriction} variant="outline" className="text-xs">
              {restriction}
            </Badge>
          ))}
        </div>
      )}

      {/* Plus Ones */}
      {guest.plusOnes > 0 && (
        <div className="text-xs text-gray-600 mt-1">
          +{guest.plusOnes} guest{guest.plusOnes > 1 ? 's' : ''}
        </div>
      )}

      {/* Table Assignment */}
      {guest.tableAssignment && (
        <div className="mt-2 text-xs">
          <Badge className="bg-indigo-100 text-indigo-700">
            Table {guest.tableAssignment.tableName}
          </Badge>
        </div>
      )}

      {/* RSVP Status */}
      <div className="mt-2">
        <Badge
          variant={guest.rsvpStatus === 'confirmed' ? 'default' : 'secondary'}
          className="text-xs"
        >
          {guest.rsvpStatus}
        </Badge>
      </div>
    </div>
  )
}
