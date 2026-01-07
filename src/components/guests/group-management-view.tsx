'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Users, Plus, Edit2, Check, X, Loader2, UserPlus } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface Guest {
  id: string
  firstName: string
  lastName: string
  groupName?: string | null
  rsvpStatus?: string
}

interface GroupManagementViewProps {
  guests: Guest[]
  onUpdateGuest: (id: string, data: { groupName: string }) => void
  isUpdating: boolean
}

export function GroupManagementView({ guests, onUpdateGuest, isUpdating }: GroupManagementViewProps) {
  const t = useTranslations('guests')
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupInput, setNewGroupInput] = useState('')

  // Group guests by groupName
  const groupedGuests = useMemo(() => {
    const groups: Record<string, Guest[]> = {}
    const ungrouped: Guest[] = []

    guests.forEach((guest) => {
      if (guest.groupName) {
        if (!groups[guest.groupName]) {
          groups[guest.groupName] = []
        }
        groups[guest.groupName].push(guest)
      } else {
        ungrouped.push(guest)
      }
    })

    return { groups, ungrouped }
  }, [guests])

  const groupNames = Object.keys(groupedGuests.groups).sort()

  const handleSaveGroup = (guestId: string) => {
    onUpdateGuest(guestId, { groupName: newGroupName })
    setEditingGuestId(null)
    setNewGroupName('')
  }

  const handleAssignToGroup = (guestId: string, groupName: string) => {
    onUpdateGuest(guestId, { groupName })
  }

  const handleRemoveFromGroup = (guestId: string) => {
    onUpdateGuest(guestId, { groupName: '' })
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{groupNames.length}</p>
                <p className="text-xs text-muted-foreground">{t('totalGroups') || 'Groups'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sage-100">
                <Users className="w-5 h-5 text-sage-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{guests.length - groupedGuests.ungrouped.length}</p>
                <p className="text-xs text-muted-foreground">{t('groupedGuests') || 'Grouped'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gold-100">
                <UserPlus className="w-5 h-5 text-gold-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{groupedGuests.ungrouped.length}</p>
                <p className="text-xs text-muted-foreground">{t('ungrouped') || 'Ungrouped'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cobalt-100">
                <Users className="w-5 h-5 text-cobalt-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {groupNames.length > 0
                    ? Math.round(
                        (guests.length - groupedGuests.ungrouped.length) / groupNames.length
                      )
                    : 0}
                </p>
                <p className="text-xs text-muted-foreground">{t('avgPerGroup') || 'Avg/Group'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Groups List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {t('guestGroups') || 'Guest Groups'}
          </CardTitle>
          <CardDescription>
            {t('groupsDescription') || 'Organize guests into groups for seating, transport, or events'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {groupNames.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t('noGroups') || 'No groups created yet'}</p>
              <p className="text-sm">{t('assignGroupHint') || 'Edit a guest to assign them to a group'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupNames.map((groupName) => (
                <div
                  key={groupName}
                  className="border rounded-xl p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-sm font-semibold">
                        {groupName}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ({groupedGuests.groups[groupName].length} {t('members') || 'members'})
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {groupedGuests.groups[groupName].map((guest) => (
                      <div
                        key={guest.id}
                        className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 text-sm group"
                      >
                        <span>
                          {guest.firstName} {guest.lastName}
                        </span>
                        <button
                          onClick={() => handleRemoveFromGroup(guest.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          title={t('removeFromGroup') || 'Remove from group'}
                          disabled={isUpdating}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ungrouped Guests */}
      {groupedGuests.ungrouped.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="w-5 h-5 text-gold-600" />
              {t('ungroupedGuests') || 'Ungrouped Guests'}
            </CardTitle>
            <CardDescription>
              {t('ungroupedDescription') || 'Assign these guests to a group'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {groupedGuests.ungrouped.map((guest) => (
                <div
                  key={guest.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium">
                    {guest.firstName} {guest.lastName}
                  </span>
                  <div className="flex items-center gap-2">
                    {editingGuestId === guest.id ? (
                      <>
                        <Input
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          placeholder={t('groupName') || 'Group name'}
                          className="w-40 h-8"
                          list="existing-groups"
                        />
                        <datalist id="existing-groups">
                          {groupNames.map((name) => (
                            <option key={name} value={name} />
                          ))}
                        </datalist>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSaveGroup(guest.id)}
                          disabled={!newGroupName.trim() || isUpdating}
                        >
                          {isUpdating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4 text-sage-600" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingGuestId(null)
                            setNewGroupName('')
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        {groupNames.length > 0 && (
                          <select
                            className="text-sm border rounded px-2 py-1 bg-background"
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignToGroup(guest.id, e.target.value)
                              }
                            }}
                            value=""
                            disabled={isUpdating}
                          >
                            <option value="">{t('assignToGroup') || 'Assign to group...'}</option>
                            {groupNames.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingGuestId(guest.id)
                            setNewGroupName('')
                          }}
                          className="gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          {t('newGroup') || 'New Group'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
