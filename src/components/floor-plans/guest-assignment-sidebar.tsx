'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, User, Users, UtensilsCrossed, Heart, Filter, X } from 'lucide-react'

interface Guest {
  id: string
  firstName: string
  lastName: string
  email: string
  dietaryRestrictions: string[]
  plusOnes: number
  rsvpStatus: string
  relation?: string // bride_family, groom_family, friends, colleagues, etc.
  guestSide?: string // bride, groom, both
  tableAssignment?: {
    tableId: string
    tableName: string
  }
}

interface GuestAssignmentSidebarProps {
  guests: Guest[]
  selectedGuestId?: string | null
  onGuestSelect?: (guestId: string | null) => void
  onAssignGuest: (guestId: string, tableId: string) => void
  onUnassignGuest: (guestId: string) => void
}

export function GuestAssignmentSidebar({
  guests,
  selectedGuestId,
  onGuestSelect,
  onAssignGuest,
  onUnassignGuest,
}: GuestAssignmentSidebarProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'unassigned' | 'assigned'>('unassigned')
  const [dietaryFilter, setDietaryFilter] = useState<string>('all')
  const [sideFilter, setSideFilter] = useState<string>('all')
  const [rsvpFilter, setRsvpFilter] = useState<string>('all')

  // Get unique dietary restrictions for filter dropdown
  const uniqueDietary = useMemo(() => {
    const dietary = new Set<string>()
    guests.forEach(g => g.dietaryRestrictions.forEach(d => dietary.add(d.toLowerCase())))
    return Array.from(dietary).sort()
  }, [guests])

  // Get unique sides for filter dropdown
  const uniqueSides = useMemo(() => {
    const sides = new Set<string>()
    guests.forEach(g => {
      if (g.guestSide) sides.add(g.guestSide)
    })
    return Array.from(sides).sort()
  }, [guests])

  const filteredGuests = guests.filter(guest => {
    const matchesSearch =
      guest.firstName.toLowerCase().includes(search.toLowerCase()) ||
      guest.lastName.toLowerCase().includes(search.toLowerCase()) ||
      guest.email.toLowerCase().includes(search.toLowerCase())

    const matchesFilter =
      filter === 'all' ||
      (filter === 'unassigned' && !guest.tableAssignment) ||
      (filter === 'assigned' && guest.tableAssignment)

    const matchesDietary =
      dietaryFilter === 'all' ||
      guest.dietaryRestrictions.some(d => d.toLowerCase() === dietaryFilter)

    const matchesSide =
      sideFilter === 'all' ||
      guest.guestSide === sideFilter

    const matchesRsvp =
      rsvpFilter === 'all' ||
      guest.rsvpStatus === rsvpFilter

    return matchesSearch && matchesFilter && matchesDietary && matchesSide && matchesRsvp
  })

  const handleDragStart = (e: React.DragEvent, guestId: string) => {
    e.dataTransfer.setData('guestId', guestId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleGuestClick = (guestId: string) => {
    if (onGuestSelect) {
      // Toggle selection
      onGuestSelect(selectedGuestId === guestId ? null : guestId)
    }
  }

  const clearFilters = () => {
    setDietaryFilter('all')
    setSideFilter('all')
    setRsvpFilter('all')
  }

  const hasActiveFilters = dietaryFilter !== 'all' || sideFilter !== 'all' || rsvpFilter !== 'all'

  return (
    <div className="w-80 border-l bg-white dark:bg-mocha-900 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Guest List</h3>
          {selectedGuestId && (
            <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300">
              Click table to assign
            </Badge>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-mocha-400" />
          <Input
            placeholder="Search guests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(['all', 'unassigned', 'assigned'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md text-sm ${
                filter === f
                  ? 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300'
                  : 'bg-mocha-100 text-mocha-600 hover:bg-mocha-200 dark:bg-mocha-800 dark:text-mocha-400 dark:hover:bg-mocha-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Advanced Filters */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-mocha-500 dark:text-mocha-400 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Filters
            </span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Dietary Filter */}
            {uniqueDietary.length > 0 && (
              <Select value={dietaryFilter} onValueChange={setDietaryFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <UtensilsCrossed className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Dietary" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Dietary</SelectItem>
                  {uniqueDietary.map((d) => (
                    <SelectItem key={d} value={d} className="text-xs capitalize">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Side Filter (Bride/Groom) */}
            {uniqueSides.length > 0 && (
              <Select value={sideFilter} onValueChange={setSideFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <Heart className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Side" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Sides</SelectItem>
                  {uniqueSides.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* RSVP Filter */}
            <Select value={rsvpFilter} onValueChange={setRsvpFilter}>
              <SelectTrigger className="h-8 text-xs col-span-2">
                <SelectValue placeholder="RSVP Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All RSVP</SelectItem>
                <SelectItem value="confirmed" className="text-xs">Confirmed</SelectItem>
                <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                <SelectItem value="declined" className="text-xs">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm text-mocha-600 dark:text-mocha-400">
          <span>
            <Users className="inline h-4 w-4 mr-1" />
            {filteredGuests.length} shown
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
            <div className="text-center text-mocha-500 dark:text-mocha-400 py-8">
              No guests found
            </div>
          ) : (
            filteredGuests.map((guest) => (
              <GuestCard
                key={guest.id}
                guest={guest}
                isSelected={selectedGuestId === guest.id}
                onDragStart={handleDragStart}
                onClick={() => handleGuestClick(guest.id)}
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
  isSelected,
  onDragStart,
  onClick,
  onUnassign,
}: {
  guest: Guest
  isSelected?: boolean
  onDragStart: (e: React.DragEvent, guestId: string) => void
  onClick?: () => void
  onUnassign: (guestId: string) => void
}) {
  return (
    <div
      draggable={!guest.tableAssignment}
      onDragStart={(e) => onDragStart(e, guest.id)}
      onClick={!guest.tableAssignment ? onClick : undefined}
      className={`p-3 rounded-lg border transition-all ${
        isSelected
          ? 'bg-teal-50 border-teal-400 ring-2 ring-teal-200 dark:bg-teal-900/30 dark:border-teal-500 dark:ring-teal-800'
          : guest.tableAssignment
          ? 'bg-mocha-50 border-mocha-200 dark:bg-mocha-800/50 dark:border-mocha-700'
          : 'bg-white border-mocha-300 cursor-pointer hover:border-teal-400 hover:shadow-sm dark:bg-mocha-800 dark:border-mocha-600 dark:hover:border-teal-400'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-medium text-sm">
            {guest.firstName} {guest.lastName}
            {isSelected && <span className="ml-2 text-teal-600 dark:text-teal-400">(selected)</span>}
          </p>
          {guest.email && <p className="text-xs text-mocha-500 dark:text-mocha-400">{guest.email}</p>}
          {guest.guestSide && (
            <p className="text-xs text-mocha-500 dark:text-mocha-400 capitalize flex items-center gap-1 mt-0.5">
              <Heart className="h-3 w-3" /> {guest.guestSide} side
            </p>
          )}
        </div>

        {guest.tableAssignment && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onUnassign(guest.id)
            }}
            className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
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
        <div className="text-xs text-mocha-600 dark:text-mocha-400 mt-1">
          +{guest.plusOnes} guest{guest.plusOnes > 1 ? 's' : ''}
        </div>
      )}

      {/* Table Assignment */}
      {guest.tableAssignment && (
        <div className="mt-2 text-xs">
          <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300">
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
