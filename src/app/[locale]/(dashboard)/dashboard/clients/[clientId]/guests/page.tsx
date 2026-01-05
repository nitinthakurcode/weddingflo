'use client'

import { useState, useMemo } from 'react'
import { trpc } from '@/lib/trpc/client'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
import { Plus, Trash2, Edit, UserCheck, Users, Hotel, Car, Utensils, Filter, Calendar, Share2, Copy, Check, Link, Mail, MessageCircle, QrCode, Download, Plane } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { ImportDialog } from '@/components/import/ImportDialog'
import { ExportButton } from '@/components/export/export-button'
import { DietaryMatrixView } from '@/components/guests/dietary-matrix-view'
import { GroupManagementView } from '@/components/guests/group-management-view'
import { ClientModuleHeader } from '@/components/dashboard/ClientModuleHeader'

export default function GuestsPage() {
  const params = useParams()
  const clientId = params?.clientId as string
  const { toast } = useToast()
  const t = useTranslations('guests')
  const tc = useTranslations('common')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingGuest, setEditingGuest] = useState<any>(null)
  const [eventFilter, setEventFilter] = useState<string>('all')
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [formQRCode, setFormQRCode] = useState<string | null>(null)
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)
  const [qrZoomed, setQrZoomed] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    groupName: '',
    dietaryRestrictions: '',
    mealPreference: '',
    plusOne: false,
    rsvpStatus: 'pending' as 'pending' | 'accepted' | 'declined',
    notes: '',
    // Party info
    partySize: 1,
    additionalGuestNames: '',
    // Travel info
    arrivalDatetime: '',
    arrivalMode: '',
    departureDatetime: '',
    departureMode: '',
    // Relationship & Events
    relationshipToFamily: '',
    attendingEvents: '',
    giftToGive: '',
    // Hotel requirements
    hotelRequired: false,
    hotelName: '',
    hotelCheckIn: '',
    hotelCheckOut: '',
    hotelRoomType: '',
    // Transport requirements
    transportRequired: false,
    transportType: '',
    transportPickupLocation: '',
    transportPickupTime: '',
    transportNotes: '',
  })

  const utils = trpc.useUtils()

  // Queries
  const { data: client } = trpc.clients.getById.useQuery({
    id: clientId,
  })

  const { data: guests, isLoading } = trpc.guests.getAll.useQuery({
    clientId: clientId,
  })

  const { data: stats } = trpc.guests.getStats.useQuery({
    clientId: clientId,
  })

  const { data: dietaryStats, isLoading: dietaryLoading } = trpc.guests.getDietaryStats.useQuery({
    clientId: clientId,
  })

  // Get events for filtering
  const { data: events } = trpc.events.getAll.useQuery({
    clientId: clientId,
  })

  // Filter guests by event
  const filteredGuests = useMemo(() => {
    if (!guests) return []
    if (eventFilter === 'all') return guests
    if (eventFilter === 'unassigned') {
      return guests.filter(g => !g.attendingEvents || g.attendingEvents.length === 0)
    }
    return guests.filter(g => g.attendingEvents?.includes(eventFilter))
  }, [guests, eventFilter])

  // Generate client name for export filename
  const partner1Name = client?.partner1FirstName
  const partner2Name = client?.partner2FirstName
  const clientName = partner1Name && partner2Name
    ? `${partner1Name}-${partner2Name}`
    : partner1Name || partner2Name || 'Wedding'

  // Mutations - all use async/await for proper cache invalidation
  const createMutation = trpc.guests.create.useMutation({
    onSuccess: async () => {
      toast({ title: t('guestAdded') })
      resetForm()
      setIsAddDialogOpen(false)
      await Promise.all([
        utils.guests.getAll.invalidate({ clientId }),
        utils.guests.getStats.invalidate({ clientId }),
        utils.guests.getDietaryStats.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: t('error'), description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = trpc.guests.update.useMutation({
    onSuccess: async () => {
      toast({ title: t('guestUpdated') })
      setEditingGuest(null)
      resetForm()
      await Promise.all([
        utils.guests.getAll.invalidate({ clientId }),
        utils.guests.getStats.invalidate({ clientId }),
        utils.guests.getDietaryStats.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: t('error'), description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = trpc.guests.delete.useMutation({
    onSuccess: async () => {
      toast({ title: t('guestDeleted') })
      await Promise.all([
        utils.guests.getAll.invalidate({ clientId }),
        utils.guests.getStats.invalidate({ clientId }),
        utils.guests.getDietaryStats.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: t('error'), description: error.message, variant: 'destructive' })
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      groupName: '',
      dietaryRestrictions: '',
      mealPreference: '',
      plusOne: false,
      rsvpStatus: 'pending',
      notes: '',
      // Party info
      partySize: 1,
      additionalGuestNames: '',
      // Travel info
      arrivalDatetime: '',
      arrivalMode: '',
      departureDatetime: '',
      departureMode: '',
      // Relationship & Events
      relationshipToFamily: '',
      attendingEvents: '',
      giftToGive: '',
      // Hotel requirements
      hotelRequired: false,
      hotelName: '',
      hotelCheckIn: '',
      hotelCheckOut: '',
      hotelRoomType: '',
      // Transport requirements
      transportRequired: false,
      transportType: '',
      transportPickupLocation: '',
      transportPickupTime: '',
      transportNotes: '',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Parse comma-separated strings to arrays
    const additionalGuestNamesArray = formData.additionalGuestNames
      ? formData.additionalGuestNames.split(',').map(s => s.trim()).filter(Boolean)
      : []
    const attendingEventsArray = formData.attendingEvents
      ? formData.attendingEvents.split(',').map(s => s.trim()).filter(Boolean)
      : []

    const submitData = {
      name: formData.name,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      groupName: formData.groupName || undefined,
      dietaryRestrictions: formData.dietaryRestrictions || undefined,
      mealPreference: formData.mealPreference || undefined,
      plusOne: formData.plusOne,
      rsvpStatus: formData.rsvpStatus,
      notes: formData.notes || undefined,
      // Party info
      partySize: formData.partySize,
      additionalGuestNames: additionalGuestNamesArray,
      // Travel info
      arrivalDatetime: formData.arrivalDatetime || undefined,
      arrivalMode: formData.arrivalMode || undefined,
      departureDatetime: formData.departureDatetime || undefined,
      departureMode: formData.departureMode || undefined,
      // Relationship & Events
      relationshipToFamily: formData.relationshipToFamily || undefined,
      attendingEvents: attendingEventsArray,
      giftToGive: formData.giftToGive || undefined,
      // Hotel requirements
      hotelRequired: formData.hotelRequired,
      hotelName: formData.hotelName || undefined,
      hotelCheckIn: formData.hotelCheckIn || undefined,
      hotelCheckOut: formData.hotelCheckOut || undefined,
      hotelRoomType: formData.hotelRoomType || undefined,
      // Transport requirements
      transportRequired: formData.transportRequired,
      transportType: formData.transportType || undefined,
      transportPickupLocation: formData.transportPickupLocation || undefined,
      transportPickupTime: formData.transportPickupTime || undefined,
      transportNotes: formData.transportNotes || undefined,
    }

    if (editingGuest) {
      updateMutation.mutate({
        id: editingGuest.id,
        data: submitData,
      })
    } else {
      createMutation.mutate({
        clientId: clientId,
        ...submitData,
      })
    }
  }

  const handleEdit = (guest: any) => {
    setEditingGuest(guest)
    // Format datetime for input fields
    const formatDatetimeForInput = (val: string | Date | null | undefined): string => {
      if (!val) return ''
      if (val instanceof Date) {
        return val.toISOString().slice(0, 16)
      }
      if (typeof val === 'string' && val.includes('T')) {
        return val.slice(0, 16)
      }
      return val
    }
    setFormData({
      name: `${guest.firstName} ${guest.lastName}`.trim() || '',
      email: guest.email || '',
      phone: guest.phone || '',
      groupName: guest.groupName || '',
      dietaryRestrictions: guest.dietaryRestrictions || '',
      mealPreference: guest.mealPreference || '',
      plusOne: guest.plusOneAllowed || false,
      rsvpStatus: guest.rsvpStatus || 'pending',
      notes: guest.notes || '',
      // Party info
      partySize: guest.partySize || 1,
      additionalGuestNames: (guest.additionalGuestNames || []).join(', '),
      // Travel info
      arrivalDatetime: formatDatetimeForInput(guest.arrivalDatetime),
      arrivalMode: guest.arrivalMode || '',
      departureDatetime: formatDatetimeForInput(guest.departureDatetime),
      departureMode: guest.departureMode || '',
      // Relationship & Events
      relationshipToFamily: guest.relationshipToFamily || '',
      attendingEvents: (guest.attendingEvents || []).join(', '),
      giftToGive: guest.giftToGive || '',
      // Hotel requirements
      hotelRequired: guest.hotelRequired || false,
      hotelName: guest.hotelName || '',
      hotelCheckIn: guest.hotelCheckIn || '',
      hotelCheckOut: guest.hotelCheckOut || '',
      hotelRoomType: guest.hotelRoomType || '',
      // Transport requirements
      transportRequired: guest.transportRequired || false,
      transportType: guest.transportType || '',
      transportPickupLocation: guest.transportPickupLocation || '',
      transportPickupTime: guest.transportPickupTime || '',
      transportNotes: guest.transportNotes || '',
    })
  }

  const handleDelete = (id: string) => {
    if (confirm(t('deleteConfirm'))) {
      deleteMutation.mutate({ id })
    }
  }

  // Generate shareable guest registration link
  const getGuestFormLink = () => {
    if (typeof window === 'undefined') return ''
    const baseUrl = window.location.origin
    return `${baseUrl}/en/guest-register/${clientId}`
  }

  const copyLinkToClipboard = async () => {
    const link = getGuestFormLink()
    try {
      await navigator.clipboard.writeText(link)
      setLinkCopied(true)
      toast({ title: t('linkCopied') || 'Link copied to clipboard!' })
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      toast({ title: 'Failed to copy link', variant: 'destructive' })
    }
  }

  // Generate QR code for the form
  const generateFormQRMutation = trpc.qr.generateClientFormQR.useMutation({
    onSuccess: (data) => {
      setFormQRCode(data.qrCode)
      setIsGeneratingQR(false)
    },
    onError: () => {
      toast({ title: 'Failed to generate QR code', variant: 'destructive' })
      setIsGeneratingQR(false)
    },
  })

  const handleGenerateQR = () => {
    setIsGeneratingQR(true)
    generateFormQRMutation.mutate({ clientId })
  }

  // Download QR code as image
  const downloadQRCode = () => {
    if (!formQRCode) return
    const link = document.createElement('a')
    link.download = `guest-registration-qr-${clientId.substring(0, 8)}.png`
    link.href = formQRCode
    link.click()
  }

  // Share via Email
  const shareViaEmail = () => {
    const link = getGuestFormLink()
    const weddingName = client?.weddingName || `${client?.partner1FirstName || ''} & ${client?.partner2FirstName || ''}`
    const subject = encodeURIComponent(`You're Invited! RSVP for ${weddingName}`)
    const body = encodeURIComponent(
      `Dear Guest,\n\nYou are cordially invited to celebrate with us!\n\nPlease fill out your details using the link below:\n${link}\n\nWe look forward to seeing you!\n\nWarm regards`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
  }

  // Share via WhatsApp
  const shareViaWhatsApp = () => {
    const link = getGuestFormLink()
    const weddingName = client?.weddingName || `${client?.partner1FirstName || ''} & ${client?.partner2FirstName || ''}`
    const message = encodeURIComponent(
      `You're invited to ${weddingName}! Please fill out your details here: ${link}`
    )
    window.open(`https://wa.me/?text=${message}`, '_blank')
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
        title={t('guestList')}
        description={t('manageGuests')}
      >
        <Button
          variant="outline"
          onClick={() => setIsShareDialogOpen(true)}
          className="gap-2"
        >
          <Share2 className="w-4 h-4" />
          {t('shareFormLink') || 'Share Form'}
        </Button>
        <ExportButton
          data={guests || []}
          dataType="guests"
          clientName={clientName}
          onExportComplete={(format) => {
            toast({ title: t('exportedAs', { format: format.toUpperCase() }) })
          }}
        />
        <ImportDialog
          module="guests"
          clientId={clientId}
          onImportComplete={() => {
            utils.guests.getAll.invalidate()
            utils.guests.getStats.invalidate()
            toast({ title: t('importComplete') })
          }}
        />
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('addGuest')}
        </Button>
      </ClientModuleHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          title={t('totalGuests')}
          value={stats?.total || 0}
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          title={t('attending')}
          value={stats?.attending || 0}
          icon={<UserCheck className="w-4 h-4" />}
          color="text-sage-600"
        />
        <StatCard
          title={t('declined')}
          value={stats?.declined || 0}
          color="text-rose-600"
        />
        <StatCard
          title={t('pending')}
          value={stats?.pending || 0}
          color="text-gold-600"
        />
        <StatCard
          title={t('checkedIn')}
          value={stats?.checkedIn || 0}
          color="text-cobalt-600"
        />
      </div>

      {/* Event Filter */}
      {events && events.length > 0 && (
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder={t('filterByEvent')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allEvents')}</SelectItem>
              <SelectItem value="unassigned">{t('unassignedGuests')}</SelectItem>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  <span className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {event.title} {event.eventDate && `(${event.eventDate})`}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {eventFilter !== 'all' && (
            <Button variant="ghost" size="sm" onClick={() => setEventFilter('all')}>
              {tc('clearFilter')}
            </Button>
          )}
          {eventFilter !== 'all' && (
            <Badge variant="secondary">
              {filteredGuests.length} {t('guestsFiltered')}
            </Badge>
          )}
        </div>
      )}

      {/* Tabs for Guest List and Dietary Matrix */}
      <Tabs defaultValue="guests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="guests" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            {t('guestList')}
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            {t('groups')}
          </TabsTrigger>
          <TabsTrigger value="dietary" className="flex items-center gap-2">
            <Utensils className="w-4 h-4" />
            {t('dietaryOverview')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guests">
          {/* Guest List */}
          <Card>
            <CardHeader>
              <CardTitle>{t('allGuests')}</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredGuests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {eventFilter === 'all' ? t('noGuestsDescription') : t('noGuestsForEvent')}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredGuests.map((guest) => (
                    <div
                      key={guest.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        {/* Header Row: Name + Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-base">{`${guest.firstName} ${guest.lastName}`}</h3>
                          {(guest.partySize ?? 1) > 1 && (
                            <Badge variant="outline" className="text-xs bg-rose-50 text-rose-700 border-rose-200">
                              {t('partyOf') || 'Party of'} {guest.partySize}
                            </Badge>
                          )}
                          {guest.hotelRequired && (
                            <Badge variant="outline" className="text-xs bg-teal-50 text-teal-700 border-teal-200 flex items-center gap-1">
                              <Hotel className="w-3 h-3" />
                              {t('hotelAlloted') || 'Hotel'}
                            </Badge>
                          )}
                          {guest.transportRequired && (
                            <Badge variant="outline" className="text-xs bg-gold-50 text-gold-700 border-gold-200 flex items-center gap-1">
                              <Car className="w-3 h-3" />
                              {t('transportAlloted') || 'Transport'}
                            </Badge>
                          )}
                          {guest.plusOneAllowed && (
                            <Badge variant="outline" className="text-xs bg-cobalt-50 text-cobalt-700 border-cobalt-200">
                              +1
                            </Badge>
                          )}
                          <Badge
                            variant={guest.rsvpStatus === 'accepted' ? 'success' : guest.rsvpStatus === 'declined' ? 'destructive' : 'warning'}
                            className="text-xs"
                          >
                            {guest.rsvpStatus === 'accepted' ? t('accepted') :
                             guest.rsvpStatus === 'declined' ? t('declined') : t('pending')}
                          </Badge>
                        </div>
                        {/* Additional Guest Names Row */}
                        {guest.additionalGuestNames && guest.additionalGuestNames.length > 0 && (
                          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="w-3 h-3" />
                            <span className="font-medium">{t('partyMembers') || 'Party'}:</span>
                            {guest.additionalGuestNames.join(', ')}
                          </div>
                        )}
                        {/* Contact & Details Row */}
                        <div className="text-sm text-muted-foreground mt-2 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1">
                          {guest.phone && (
                            <p className="flex items-center gap-1">
                              <span className="text-muted-foreground/70">{t('phone') || 'Phone'}:</span> {guest.phone}
                            </p>
                          )}
                          {guest.email && (
                            <p className="flex items-center gap-1">
                              <span className="text-muted-foreground/70">{t('email')}:</span> {guest.email}
                            </p>
                          )}
                          {guest.groupName && (
                            <p className="flex items-center gap-1">
                              <span className="text-muted-foreground/70">{t('group')}:</span> {guest.groupName}
                            </p>
                          )}
                          {guest.relationshipToFamily && (
                            <p className="flex items-center gap-1">
                              <span className="text-muted-foreground/70">{t('relationship') || 'Relation'}:</span> {guest.relationshipToFamily}
                            </p>
                          )}
                        </div>
                        {/* Travel & Events Row */}
                        {(guest.arrivalDatetime || guest.arrivalMode || (guest.attendingEvents?.length ?? 0) > 0 || guest.dietaryRestrictions) && (
                          <div className="text-sm text-muted-foreground mt-2 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1">
                            {guest.arrivalDatetime && (
                              <p className="flex items-center gap-1">
                                <Plane className="w-3 h-3 text-teal-600" />
                                <span className="text-muted-foreground/70">{t('arrival') || 'Arrival'}:</span>
                                {new Date(guest.arrivalDatetime).toLocaleDateString()}
                                {guest.arrivalMode && <span className="ml-1">({guest.arrivalMode})</span>}
                              </p>
                            )}
                            {guest.departureDatetime && (
                              <p className="flex items-center gap-1">
                                <Plane className="w-3 h-3 rotate-45 text-gold-600" />
                                <span className="text-muted-foreground/70">{t('departure') || 'Departure'}:</span>
                                {new Date(guest.departureDatetime).toLocaleDateString()}
                                {guest.departureMode && <span className="ml-1">({guest.departureMode})</span>}
                              </p>
                            )}
                            {guest.attendingEvents && guest.attendingEvents.length > 0 && (
                              <p className="flex items-center gap-1 col-span-2">
                                <Calendar className="w-3 h-3 text-cobalt-600" />
                                <span className="text-muted-foreground/70">{t('events') || 'Events'}:</span> {guest.attendingEvents.join(', ')}
                              </p>
                            )}
                            {guest.dietaryRestrictions && (
                              <p className="flex items-center gap-1">
                                <Utensils className="w-3 h-3 text-rose-600" />
                                {guest.dietaryRestrictions}
                              </p>
                            )}
                            {guest.mealPreference && guest.mealPreference !== 'standard' && (
                              <p className="flex items-center gap-1">
                                <span className="text-muted-foreground/70">{t('meal') || 'Meal'}:</span> {guest.mealPreference}
                              </p>
                            )}
                          </div>
                        )}
                        {/* Planner Services - Per-Member Hotel & Transport Toggles */}
                        <div className="mt-3 pt-3 border-t space-y-2">
                          <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                            <Hotel className="w-3 h-3" />
                            <span>{t('provideHotel')}</span>
                            <span className="mx-2">|</span>
                            <Car className="w-3 h-3" />
                            <span>{t('provideTransport')}</span>
                          </div>
                          {/* Primary Guest Row */}
                          <div className="flex items-center gap-4 py-1 px-2 rounded bg-muted/30">
                            <span className="text-sm font-medium min-w-[100px] truncate">{`${guest.firstName} ${guest.lastName}`}</span>
                            <div className="flex items-center gap-1">
                              <Switch
                                checked={guest.hotelRequired || false}
                                onCheckedChange={(checked) => {
                                  updateMutation.mutate({
                                    id: guest.id,
                                    data: {
                                      name: `${guest.firstName} ${guest.lastName}`,
                                      hotelRequired: checked,
                                      hotelCheckIn: guest.arrivalDatetime ? new Date(guest.arrivalDatetime).toISOString().split('T')[0] : undefined,
                                      hotelCheckOut: guest.departureDatetime ? new Date(guest.departureDatetime).toISOString().split('T')[0] : undefined,
                                    },
                                  })
                                }}
                                className="data-[state=checked]:bg-teal-600 scale-75"
                              />
                              <Hotel className="w-3 h-3 text-teal-600" />
                            </div>
                            <div className="flex items-center gap-1">
                              <Switch
                                checked={guest.transportRequired || false}
                                onCheckedChange={(checked) => {
                                  updateMutation.mutate({
                                    id: guest.id,
                                    data: {
                                      name: `${guest.firstName} ${guest.lastName}`,
                                      transportRequired: checked,
                                      arrivalDatetime: guest.arrivalDatetime ? new Date(guest.arrivalDatetime).toISOString() : undefined,
                                      arrivalMode: guest.arrivalMode || undefined,
                                    },
                                  })
                                }}
                                className="data-[state=checked]:bg-gold-600 scale-75"
                              />
                              <Car className="w-3 h-3 text-gold-600" />
                            </div>
                          </div>
                          {/* Additional Party Members */}
                          {guest.additionalGuestNames && guest.additionalGuestNames.length > 0 && (
                            guest.additionalGuestNames.map((memberName, idx) => {
                              const metadata = (guest.metadata as Record<string, any>) || {}
                              const memberReqs = metadata.partyMemberRequirements?.[memberName] || {}
                              return (
                                <div key={idx} className="flex items-center gap-4 py-1 px-2 rounded bg-muted/20">
                                  <span className="text-sm min-w-[100px] truncate text-muted-foreground">{memberName}</span>
                                  <div className="flex items-center gap-1">
                                    <Switch
                                      checked={memberReqs.hotelRequired || false}
                                      onCheckedChange={(checked) => {
                                        const updatedMetadata = {
                                          ...metadata,
                                          partyMemberRequirements: {
                                            ...metadata.partyMemberRequirements,
                                            [memberName]: {
                                              ...memberReqs,
                                              hotelRequired: checked,
                                            },
                                          },
                                        }
                                        updateMutation.mutate({
                                          id: guest.id,
                                          data: {
                                            name: `${guest.firstName} ${guest.lastName}`,
                                            metadata: updatedMetadata,
                                            // Pass party member info for hotel creation
                                            partyMemberHotel: checked ? {
                                              memberName,
                                              checkIn: guest.arrivalDatetime ? new Date(guest.arrivalDatetime).toISOString().split('T')[0] : undefined,
                                              checkOut: guest.departureDatetime ? new Date(guest.departureDatetime).toISOString().split('T')[0] : undefined,
                                            } : { memberName, remove: true },
                                          },
                                        })
                                      }}
                                      className="data-[state=checked]:bg-teal-600 scale-75"
                                    />
                                    <Hotel className="w-3 h-3 text-teal-600" />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Switch
                                      checked={memberReqs.transportRequired || false}
                                      onCheckedChange={(checked) => {
                                        const updatedMetadata = {
                                          ...metadata,
                                          partyMemberRequirements: {
                                            ...metadata.partyMemberRequirements,
                                            [memberName]: {
                                              ...memberReqs,
                                              transportRequired: checked,
                                            },
                                          },
                                        }
                                        updateMutation.mutate({
                                          id: guest.id,
                                          data: {
                                            name: `${guest.firstName} ${guest.lastName}`,
                                            metadata: updatedMetadata,
                                            // Pass party member info for transport creation
                                            partyMemberTransport: checked ? {
                                              memberName,
                                              arrivalDatetime: guest.arrivalDatetime ? new Date(guest.arrivalDatetime).toISOString() : undefined,
                                              arrivalMode: guest.arrivalMode || undefined,
                                            } : { memberName, remove: true },
                                          },
                                        })
                                      }}
                                      className="data-[state=checked]:bg-gold-600 scale-75"
                                    />
                                    <Car className="w-3 h-3 text-gold-600" />
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(guest)}
                          className="h-8 w-8 hover:bg-muted"
                        >
                          <Edit className="w-4 h-4" />
                          <span className="sr-only">{tc('edit')}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(guest.id)}
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="sr-only">{tc('delete')}</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups">
          <GroupManagementView
            guests={guests || []}
            onUpdateGuest={(id, data) => {
              updateMutation.mutate({
                id,
                data: {
                  name: guests?.find(g => g.id === id)
                    ? `${guests.find(g => g.id === id)?.firstName} ${guests.find(g => g.id === id)?.lastName}`
                    : '',
                  groupName: data.groupName,
                },
              })
            }}
            isUpdating={updateMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="dietary">
          <DietaryMatrixView data={dietaryStats} isLoading={dietaryLoading} />
        </TabsContent>
      </Tabs>

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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGuest ? t('editGuest') : t('addNewGuest')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">{t('name')} *</Label>
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
                <Label htmlFor="email">{t('email')}</Label>
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
                <Label htmlFor="phone">{t('phone')}</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="groupName">{t('group')}</Label>
                <Input
                  id="groupName"
                  value={formData.groupName}
                  onChange={(e) =>
                    setFormData({ ...formData, groupName: e.target.value })
                  }
                  placeholder={t('groupPlaceholder')}
                />
              </div>
            </div>
            {/* Party Info Section */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                {t('partyInfo') || 'Party Information'}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="partySize">{t('partySize') || 'Party Size'}</Label>
                  <Input
                    id="partySize"
                    type="number"
                    min={1}
                    value={formData.partySize}
                    onChange={(e) =>
                      setFormData({ ...formData, partySize: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="relationshipToFamily">{t('relationshipToFamily') || 'Relationship to Family'}</Label>
                  <Input
                    id="relationshipToFamily"
                    value={formData.relationshipToFamily}
                    onChange={(e) =>
                      setFormData({ ...formData, relationshipToFamily: e.target.value })
                    }
                    placeholder={t('relationshipPlaceholder') || 'e.g., Friend of bride, Uncle'}
                  />
                </div>
              </div>
              <div className="mt-3">
                <Label htmlFor="additionalGuestNames">{t('additionalGuestNames') || 'Additional Guest Names'}</Label>
                <Input
                  id="additionalGuestNames"
                  value={formData.additionalGuestNames}
                  onChange={(e) =>
                    setFormData({ ...formData, additionalGuestNames: e.target.value })
                  }
                  placeholder={t('additionalGuestsPlaceholder') || 'Comma separated: John Doe, Jane Doe'}
                />
              </div>
            </div>

            {/* Travel Info Section */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t('travelInfo') || 'Travel Information'}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="arrivalDatetime">{t('arrivalDatetime') || 'Arrival Date/Time'}</Label>
                  <Input
                    id="arrivalDatetime"
                    type="datetime-local"
                    value={formData.arrivalDatetime}
                    onChange={(e) =>
                      setFormData({ ...formData, arrivalDatetime: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="arrivalMode">{t('arrivalMode') || 'Mode of Arrival'}</Label>
                  <Input
                    id="arrivalMode"
                    value={formData.arrivalMode}
                    onChange={(e) =>
                      setFormData({ ...formData, arrivalMode: e.target.value })
                    }
                    placeholder={t('arrivalModePlaceholder') || 'e.g., Flight, Car, Train'}
                  />
                </div>
                <div>
                  <Label htmlFor="departureDatetime">{t('departureDatetime') || 'Departure Date/Time'}</Label>
                  <Input
                    id="departureDatetime"
                    type="datetime-local"
                    value={formData.departureDatetime}
                    onChange={(e) =>
                      setFormData({ ...formData, departureDatetime: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="departureMode">{t('departureMode') || 'Mode of Departure'}</Label>
                  <Input
                    id="departureMode"
                    value={formData.departureMode}
                    onChange={(e) =>
                      setFormData({ ...formData, departureMode: e.target.value })
                    }
                    placeholder={t('departureModePlaceholder') || 'e.g., Flight, Car, Train'}
                  />
                </div>
              </div>
            </div>

            {/* Events & Preferences Section */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Utensils className="w-4 h-4" />
                {t('eventsAndPreferences') || 'Events & Preferences'}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="attendingEvents">{t('attendingEvents') || 'Events Attending'}</Label>
                  <Input
                    id="attendingEvents"
                    value={formData.attendingEvents}
                    onChange={(e) =>
                      setFormData({ ...formData, attendingEvents: e.target.value })
                    }
                    placeholder={t('attendingEventsPlaceholder') || 'e.g., Mehendi, Sangeet, Wedding'}
                  />
                </div>
                <div>
                  <Label htmlFor="mealPreference">{t('mealPreference') || 'Meal Preference'}</Label>
                  <Select
                    value={formData.mealPreference || 'standard'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, mealPreference: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectMealPreference') || 'Select preference'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">{t('standard') || 'Standard'}</SelectItem>
                      <SelectItem value="veg">{t('vegetarian') || 'Vegetarian'}</SelectItem>
                      <SelectItem value="non_veg">{t('nonVegetarian') || 'Non-Vegetarian'}</SelectItem>
                      <SelectItem value="vegan">{t('vegan') || 'Vegan'}</SelectItem>
                      <SelectItem value="jain">{t('jain') || 'Jain'}</SelectItem>
                      <SelectItem value="custom">{t('custom') || 'Custom'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-3">
                <Label htmlFor="dietaryRestrictions">{t('dietaryRestrictions')}</Label>
                <Input
                  id="dietaryRestrictions"
                  value={formData.dietaryRestrictions}
                  onChange={(e) =>
                    setFormData({ ...formData, dietaryRestrictions: e.target.value })
                  }
                  placeholder={t('dietaryRestrictionsPlaceholder') || 'e.g., No nuts, Gluten-free'}
                />
              </div>
            </div>

            {/* RSVP & Status Section */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold mb-3">{t('rsvpAndStatus') || 'RSVP & Status'}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rsvpStatus">{t('rsvpStatus')}</Label>
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
                      <SelectItem value="pending">{t('pending')}</SelectItem>
                      <SelectItem value="accepted">{t('accepted')}</SelectItem>
                      <SelectItem value="declined">{t('declined')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="plusOne"
                    checked={formData.plusOne}
                    onChange={(e) =>
                      setFormData({ ...formData, plusOne: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                  <Label htmlFor="plusOne">{t('plusOne')}</Label>
                </div>
              </div>
            </div>

            {/* Gift (Planner Only) */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold mb-3">{t('plannerNotes') || 'Planner Notes'}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="giftToGive">{t('giftToGive') || 'Gift to Give'}</Label>
                  <Input
                    id="giftToGive"
                    value={formData.giftToGive}
                    onChange={(e) =>
                      setFormData({ ...formData, giftToGive: e.target.value })
                    }
                    placeholder={t('giftPlaceholder') || 'e.g., Welcome hamper, Souvenir'}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">{t('notes')}</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder={t('notesPlaceholder') || 'Internal notes...'}
                  />
                </div>
              </div>
            </div>

            {/* Hotel Requirements Section */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold mb-3">{t('hotelRequirements')}</h4>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="hotelRequired"
                  checked={formData.hotelRequired}
                  onChange={(e) =>
                    setFormData({ ...formData, hotelRequired: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor="hotelRequired">{t('hotelRequired')}</Label>
              </div>
              {formData.hotelRequired && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hotelName">{t('hotelName')}</Label>
                    <Input
                      id="hotelName"
                      value={formData.hotelName}
                      onChange={(e) =>
                        setFormData({ ...formData, hotelName: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="hotelRoomType">{t('roomType')}</Label>
                    <Input
                      id="hotelRoomType"
                      value={formData.hotelRoomType}
                      onChange={(e) =>
                        setFormData({ ...formData, hotelRoomType: e.target.value })
                      }
                      placeholder={t('roomTypePlaceholder')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hotelCheckIn">{t('checkInDate')}</Label>
                    <Input
                      id="hotelCheckIn"
                      type="date"
                      value={formData.hotelCheckIn}
                      onChange={(e) =>
                        setFormData({ ...formData, hotelCheckIn: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="hotelCheckOut">{t('checkOutDate')}</Label>
                    <Input
                      id="hotelCheckOut"
                      type="date"
                      value={formData.hotelCheckOut}
                      onChange={(e) =>
                        setFormData({ ...formData, hotelCheckOut: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Transport Requirements Section */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold mb-3">{t('transportRequirements')}</h4>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="transportRequired"
                  checked={formData.transportRequired}
                  onChange={(e) =>
                    setFormData({ ...formData, transportRequired: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor="transportRequired">{t('transportRequired')}</Label>
              </div>
              {formData.transportRequired && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="transportType">{t('transportType')}</Label>
                    <Input
                      id="transportType"
                      value={formData.transportType}
                      onChange={(e) =>
                        setFormData({ ...formData, transportType: e.target.value })
                      }
                      placeholder={t('transportTypePlaceholder')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="transportPickupTime">{t('pickupTime')}</Label>
                    <Input
                      id="transportPickupTime"
                      type="time"
                      value={formData.transportPickupTime}
                      onChange={(e) =>
                        setFormData({ ...formData, transportPickupTime: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="transportPickupLocation">{t('pickupLocation')}</Label>
                    <Input
                      id="transportPickupLocation"
                      value={formData.transportPickupLocation}
                      onChange={(e) =>
                        setFormData({ ...formData, transportPickupLocation: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="transportNotes">{t('transportNotes')}</Label>
                    <Textarea
                      id="transportNotes"
                      value={formData.transportNotes}
                      onChange={(e) =>
                        setFormData({ ...formData, transportNotes: e.target.value })
                      }
                      rows={2}
                    />
                  </div>
                </div>
              )}
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
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingGuest ? tc('update') : tc('add')} {t('guestsLower')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Share Form Link Dialog - Professional Design */}
      <Dialog open={isShareDialogOpen} onOpenChange={(open) => {
        setIsShareDialogOpen(open)
        if (!open) {
          setFormQRCode(null)
          setQrZoomed(false)
        }
      }}>
        <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
          {/* Header - Uses theme primary color */}
          <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-5 text-primary-foreground">
            <DialogHeader className="space-y-1">
              <DialogTitle className="flex items-center gap-3 text-primary-foreground text-xl">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Share2 className="w-5 h-5" />
                </div>
                {t('shareGuestForm') || 'Share Guest Registration Form'}
              </DialogTitle>
              <p className="text-primary-foreground/80 text-sm">
                {t('shareFormDescription') || 'Share this form with your guests via link, email, WhatsApp, or QR code.'}
              </p>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-6">
            {/* Registration Link */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-foreground">Registration Link</Label>
                <Button
                  variant={linkCopied ? "default" : "outline"}
                  size="sm"
                  onClick={copyLinkToClipboard}
                  className={`gap-2 transition-all ${linkCopied ? 'bg-sage-600 hover:bg-sage-700' : ''}`}
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </>
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl border-2 border-dashed">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Link className="w-4 h-4 text-primary" />
                </div>
                <code className="text-sm text-muted-foreground break-all flex-1">
                  {getGuestFormLink()}
                </code>
              </div>
            </div>

            {/* Share Options - Grid Layout */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">Share Via</Label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={shareViaEmail}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 hover:border-cobalt-300 hover:bg-cobalt-50 transition-all group"
                >
                  <div className="p-3 bg-cobalt-100 rounded-full group-hover:bg-cobalt-200 transition-colors">
                    <Mail className="w-5 h-5 text-cobalt-600" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-cobalt-600">Email</span>
                </button>
                <button
                  onClick={shareViaWhatsApp}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 hover:border-sage-300 hover:bg-sage-50 transition-all group"
                >
                  <div className="p-3 bg-sage-100 rounded-full group-hover:bg-sage-200 transition-colors">
                    <MessageCircle className="w-5 h-5 text-sage-600" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-sage-600">WhatsApp</span>
                </button>
                <button
                  onClick={handleGenerateQR}
                  disabled={isGeneratingQR}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 hover:border-teal-300 hover:bg-teal-50 transition-all group disabled:opacity-50"
                >
                  <div className="p-3 bg-teal-100 rounded-full group-hover:bg-teal-200 transition-colors">
                    <QrCode className="w-5 h-5 text-teal-600" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-teal-600">
                    {isGeneratingQR ? 'Loading...' : 'QR Code'}
                  </span>
                </button>
              </div>
            </div>

            {/* QR Code Display with Zoom */}
            {formQRCode && (
              <div className={`p-4 bg-gradient-to-r from-teal-50 to-primary/5 rounded-xl border transition-all ${qrZoomed ? 'fixed inset-4 z-50 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center' : ''}`}>
                {qrZoomed && (
                  <p className="text-xs text-muted-foreground mb-4">Click QR code to zoom out</p>
                )}
                <div className={`flex ${qrZoomed ? 'flex-col items-center gap-6' : 'items-center gap-4'}`}>
                  <div
                    className={`p-2 bg-white rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${qrZoomed ? 'p-4' : ''}`}
                    onClick={() => setQrZoomed(!qrZoomed)}
                    title={qrZoomed ? 'Click to zoom out' : 'Click to zoom in'}
                  >
                    <img
                      src={formQRCode}
                      alt="Guest Registration QR Code"
                      className={`transition-all ${qrZoomed ? 'w-64 h-64 sm:w-80 sm:h-80' : 'w-24 h-24'}`}
                    />
                  </div>
                  <div className={`space-y-2 ${qrZoomed ? 'text-center' : 'flex-1'}`}>
                    <p className="text-sm font-medium text-foreground">QR Code Ready!</p>
                    <p className="text-xs text-muted-foreground">
                      {qrZoomed ? 'Scan with any camera app' : 'Click QR to zoom in. Guests scan to open form.'}
                    </p>
                    <div className={`flex gap-2 ${qrZoomed ? 'justify-center mt-4' : ''}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadQRCode}
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download PNG
                      </Button>
                      {qrZoomed && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setQrZoomed(false)}
                        >
                          Close
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Fields Info - Collapsible Style */}
            <div className="rounded-xl border overflow-hidden">
              <div className="bg-muted/30 px-4 py-3 border-b">
                <p className="text-sm font-semibold text-foreground">
                  {t('guestFormFeatures') || 'Guests Can Fill Out'}
                </p>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    'Name', 'Phone', 'Email',
                    'Party Size', 'Additional Guests', 'Arrival Date',
                    'Arrival Mode', 'Departure Date', 'Departure Mode',
                    'Relationship', 'Events', 'Dietary Needs'
                  ].map((field, i) => (
                    <div key={field} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">
                        {i + 1}
                      </div>
                      {field}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                  <span className="font-medium">Note:</span> Events are shown as checkboxes with dates. Accommodation, Transport & Gift preferences are managed by the planner.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-muted/30 border-t flex justify-end">
            <Button
              variant="outline"
              onClick={() => setIsShareDialogOpen(false)}
            >
              {tc('close')}
            </Button>
          </div>
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
