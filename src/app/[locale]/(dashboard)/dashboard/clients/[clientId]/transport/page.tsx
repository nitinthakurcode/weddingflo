'use client'

import { useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { trpc } from '@/lib/trpc/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ClientModuleHeader } from '@/components/dashboard/ClientModuleHeader'
import { ExportButton } from '@/components/export/export-button'
import { ImportDialog } from '@/components/import/ImportDialog'
import { useToast } from '@/hooks/use-toast'
import {
  Car,
  Plane,
  Bus,
  Train,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  MapPin,
  Calendar,
  ArrowRight,
  Phone,
  User,
  Truck,
  Circle,
  Check,
  ChevronsUpDown,
  UserPlus,
  Users,
} from 'lucide-react'

/**
 * Guest Transport Page - Travel coordination for wedding guests
 *
 * Manages transportation logistics:
 * - Airport pickups/dropoffs
 * - Shuttle services
 * - Guest travel itineraries
 * - Transportation schedules
 */
export default function TransportPage() {
  const params = useParams()
  const clientId = params?.clientId as string
  const { toast } = useToast()
  const t = useTranslations('transport')
  const tc = useTranslations('common')
  const tn = useTranslations('navigation')

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingTransport, setEditingTransport] = useState<any>(null)
  const [guestComboboxOpen, setGuestComboboxOpen] = useState(false)
  const [guestSearchValue, setGuestSearchValue] = useState('')
  const [formData, setFormData] = useState({
    guestName: '',
    pickupDate: '',
    pickupTime: '',
    pickupFrom: '',
    dropTo: '',
    vehicleInfo: '',
    vehicleType: '' as string,
    vehicleNumber: '',
    driverPhone: '',
    coordinatorPhone: '',
    legType: 'arrival' as 'arrival' | 'departure' | 'inter_event',
    transportStatus: 'scheduled' as 'scheduled' | 'in_progress' | 'completed' | 'cancelled',
    notes: '',
  })

  const utils = trpc.useUtils()

  // Queries - use getAllWithGuests to get party information
  const { data: transportList, isLoading } = trpc.guestTransport.getAllWithGuests.useQuery({
    clientId,
  })

  const { data: stats } = trpc.guestTransport.getStats.useQuery({
    clientId,
  })

  // Query for fleet vehicles with availability status
  const { data: vehiclesList } = trpc.guestTransport.getVehicles.useQuery({
    clientId,
  })

  // Query for guests list (for dropdown selection)
  const { data: guestsList } = trpc.guests.getAll.useQuery({
    clientId,
  })

  // Compute available party members (excluding those with transport for current legType)
  const availablePartyMembers = useMemo(() => {
    if (!guestsList) return []

    // Get names already assigned transport for the current leg type (arrival/departure)
    const namesWithTransport = new Set<string>()
    transportList?.forEach((transport: any) => {
      if (transport.legType === formData.legType && transport.guestName) {
        namesWithTransport.add(transport.guestName.toLowerCase())
      }
    })

    // Build party groups with all members
    const partyGroups: Array<{
      partyId: string
      partyLeadName: string
      relationshipToFamily: string | null
      members: Array<{
        name: string
        isLead: boolean
        hasTransport: boolean
      }>
    }> = []

    guestsList.forEach((guest: any) => {
      const leadName = `${guest.firstName}${guest.lastName ? ' ' + guest.lastName : ''}`.trim()
      const partyId = guest.id

      const members: Array<{ name: string; isLead: boolean; hasTransport: boolean }> = []

      // Add lead guest
      members.push({
        name: leadName,
        isLead: true,
        hasTransport: namesWithTransport.has(leadName.toLowerCase())
      })

      // Add additional party members
      if (guest.additionalGuestNames && Array.isArray(guest.additionalGuestNames)) {
        guest.additionalGuestNames.forEach((memberName: string) => {
          if (memberName && memberName.trim()) {
            members.push({
              name: memberName.trim(),
              isLead: false,
              hasTransport: namesWithTransport.has(memberName.trim().toLowerCase())
            })
          }
        })
      }

      // Only include party if it has at least one member without transport
      const availableMembers = members.filter(m => !m.hasTransport)
      if (availableMembers.length > 0 || members.length > 0) {
        partyGroups.push({
          partyId,
          partyLeadName: leadName,
          relationshipToFamily: guest.relationshipToFamily,
          members
        })
      }
    })

    return partyGroups
  }, [guestsList, transportList, formData.legType])

  // Mutations
  const syncMutation = trpc.guestTransport.syncWithGuests.useMutation({
    onSuccess: async (result) => {
      if (result.synced > 0) {
        toast({
          title: 'Transport Synced',
          description: `Created ${result.arrivals} arrival(s) and ${result.departures} departure(s)`
        })
      } else {
        toast({
          title: t('alreadySynced') || 'Already Synced',
          description: result.message
        })
      }
      await Promise.all([
        utils.guestTransport.getAllWithGuests.invalidate({ clientId }),
        utils.guestTransport.getStats.invalidate({ clientId }),
        utils.guestTransport.getVehicles.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: t('errorSyncing') || 'Error syncing', description: error.message, variant: 'destructive' })
    },
  })

  const createMutation = trpc.guestTransport.create.useMutation({
    onSuccess: async () => {
      toast({ title: t('transportAdded') || 'Transport added' })
      resetForm()
      setIsAddDialogOpen(false)
      await Promise.all([
        utils.guestTransport.getAllWithGuests.invalidate({ clientId }),
        utils.guestTransport.getStats.invalidate({ clientId }),
        utils.guestTransport.getVehicles.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = trpc.guestTransport.update.useMutation({
    onSuccess: async () => {
      toast({ title: t('transportUpdated') || 'Transport updated' })
      setEditingTransport(null)
      resetForm()
      await Promise.all([
        utils.guestTransport.getAllWithGuests.invalidate({ clientId }),
        utils.guestTransport.getStats.invalidate({ clientId }),
        utils.guestTransport.getVehicles.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = trpc.guestTransport.delete.useMutation({
    onSuccess: async () => {
      toast({ title: t('transportDeleted') || 'Transport deleted' })
      await Promise.all([
        utils.guestTransport.getAllWithGuests.invalidate({ clientId }),
        utils.guestTransport.getStats.invalidate({ clientId }),
        utils.guestTransport.getVehicles.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const handleSync = () => {
    syncMutation.mutate({ clientId })
  }

  const resetForm = () => {
    setFormData({
      guestName: '',
      pickupDate: '',
      pickupTime: '',
      pickupFrom: '',
      dropTo: '',
      vehicleInfo: '',
      vehicleType: '',
      vehicleNumber: '',
      driverPhone: '',
      coordinatorPhone: '',
      legType: 'arrival',
      transportStatus: 'scheduled',
      notes: '',
    })
    setGuestSearchValue('')
    setGuestComboboxOpen(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingTransport) {
      updateMutation.mutate({
        id: editingTransport.id,
        data: {
          guestName: formData.guestName,
          pickupDate: formData.pickupDate || null,
          pickupTime: formData.pickupTime || null,
          pickupFrom: formData.pickupFrom || null,
          dropTo: formData.dropTo || null,
          vehicleInfo: formData.vehicleInfo || null,
          vehicleType: formData.vehicleType || null,
          vehicleNumber: formData.vehicleNumber || null,
          driverPhone: formData.driverPhone || null,
          coordinatorPhone: formData.coordinatorPhone || null,
          legType: formData.legType,
          transportStatus: formData.transportStatus,
          notes: formData.notes || null,
        },
      })
    } else {
      createMutation.mutate({
        clientId,
        guestName: formData.guestName,
        pickupDate: formData.pickupDate || undefined,
        pickupTime: formData.pickupTime || undefined,
        pickupFrom: formData.pickupFrom || undefined,
        dropTo: formData.dropTo || undefined,
        vehicleInfo: formData.vehicleInfo || undefined,
        vehicleType: formData.vehicleType || undefined,
        vehicleNumber: formData.vehicleNumber || undefined,
        driverPhone: formData.driverPhone || undefined,
        coordinatorPhone: formData.coordinatorPhone || undefined,
        legType: formData.legType,
        notes: formData.notes || undefined,
      })
    }
  }

  const handleEdit = (transport: any) => {
    setEditingTransport(transport)
    setFormData({
      guestName: transport.guestName || '',
      pickupDate: transport.pickupDate || '',
      pickupTime: transport.pickupTime || '',
      pickupFrom: transport.pickupFrom || '',
      dropTo: transport.dropTo || '',
      vehicleInfo: transport.vehicleInfo || '',
      vehicleType: transport.vehicleType || '',
      vehicleNumber: transport.vehicleNumber || '',
      driverPhone: transport.driverPhone || '',
      coordinatorPhone: transport.coordinatorPhone || '',
      legType: transport.legType || 'arrival',
      transportStatus: transport.transportStatus || 'scheduled',
      notes: transport.notes || '',
    })
  }

  const handleDelete = (id: string) => {
    if (confirm(t('confirmDelete') || 'Are you sure you want to delete this transport entry?')) {
      deleteMutation.mutate({ id })
    }
  }

  // Get icon based on travel mode (flight, train, bus, car)
  const getTravelModeIcon = (travelMode: string | null | undefined, legType: string) => {
    const mode = travelMode?.toLowerCase()
    const isArrival = legType === 'arrival'
    const isDeparture = legType === 'departure'

    switch (mode) {
      case 'flight':
        return <Plane className={`w-4 h-4 ${isDeparture ? 'text-rose-500 rotate-45' : 'text-cobalt-500'}`} />
      case 'train':
        return <Train className={`w-4 h-4 ${isDeparture ? 'text-rose-500' : 'text-cobalt-500'}`} />
      case 'bus':
        return <Bus className={`w-4 h-4 ${isDeparture ? 'text-rose-500' : 'text-teal-500'}`} />
      case 'car':
        return <Car className={`w-4 h-4 ${isDeparture ? 'text-rose-500' : 'text-sage-600'}`} />
      default:
        // Fallback to leg type based icons if no travel mode
        if (legType === 'inter_event') {
          return <Bus className="w-4 h-4 text-teal-500" />
        }
        return <Car className="w-4 h-4 text-muted-foreground" />
    }
  }

  // Extract travel mode from vehicleInfo string like "(train)" or "(flight)"
  const extractTravelMode = (vehicleInfo: string | null | undefined): string | null => {
    if (!vehicleInfo) return null
    const match = vehicleInfo.match(/\((flight|train|bus|car)\)/i)
    return match ? match[1].toLowerCase() : null
  }

  // Combined function that gets icon from guest arrivalMode or vehicleInfo
  const getLegTypeIcon = (legType: string, guest?: any, vehicleInfo?: string | null) => {
    // Priority: 1. Guest's arrivalMode, 2. Extract from vehicleInfo, 3. Default
    const travelMode = guest?.arrivalMode || extractTravelMode(vehicleInfo)
    return getTravelModeIcon(travelMode, legType)
  }

  const getLegTypeLabel = (legType: string) => {
    switch (legType) {
      case 'arrival':
        return t('arrival') || 'Arrival'
      case 'departure':
        return t('departure') || 'Departure'
      case 'inter_event':
        return t('interEvent') || 'Inter-Event'
      default:
        return legType
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline" className="bg-cobalt-50 text-cobalt-700 border-cobalt-200"><Clock className="w-3 h-3 mr-1" />{tc('scheduled') || 'Scheduled'}</Badge>
      case 'in_progress':
        return <Badge className="bg-gold-500"><Car className="w-3 h-3 mr-1" />{t('inProgress') || 'In Progress'}</Badge>
      case 'completed':
        return <Badge className="bg-sage-600"><CheckCircle className="w-3 h-3 mr-1" />{tc('completed') || 'Completed'}</Badge>
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{tc('cancelled') || 'Cancelled'}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
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
        title={tn('travel') || 'Travel'}
        description={t('description') || 'Coordinate guest transportation and travel logistics'}
      >
        <ImportDialog
          module="transport"
          clientId={clientId}
          onImportComplete={() => {
            utils.guestTransport.getAll.invalidate({ clientId })
            utils.guestTransport.getStats.invalidate({ clientId })
          }}
        />
        <ExportButton
          data={transportList || []}
          dataType="transport"
          variant="outline"
        />
        <Button
          variant="outline"
          onClick={handleSync}
          disabled={syncMutation.isPending}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
          {syncMutation.isPending ? (t('syncing') || 'Syncing...') : (t('syncFromGuests') || 'Sync from Guests')}
        </Button>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('addTransport') || 'Add Transport'}
        </Button>
      </ClientModuleHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          title={t('totalTransports') || 'Total Transports'}
          value={stats?.total || 0}
          icon={<Car className="w-4 h-4" />}
        />
        <StatCard
          title={tc('scheduled') || 'Scheduled'}
          value={stats?.scheduled || 0}
          icon={<Clock className="w-4 h-4" />}
          color="text-cobalt-600"
        />
        <StatCard
          title={t('inProgress') || 'In Progress'}
          value={stats?.inProgress || 0}
          icon={<Car className="w-4 h-4" />}
          color="text-gold-600"
        />
        <StatCard
          title={tc('completed') || 'Completed'}
          value={stats?.completed || 0}
          icon={<CheckCircle className="w-4 h-4" />}
          color="text-sage-600"
        />
        <StatCard
          title={tc('cancelled') || 'Cancelled'}
          value={stats?.cancelled || 0}
          icon={<XCircle className="w-4 h-4" />}
          color="text-rose-600"
        />
      </div>

      {/* Arrivals Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-cobalt-500" />
            Arrivals ({transportList?.filter((t: any) => t.legType === 'arrival').length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const arrivals = transportList?.filter((t: any) => t.legType === 'arrival') || []
            if (arrivals.length === 0) {
              return (
                <div className="text-center py-6 text-muted-foreground">
                  <Plane className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm">No arrival transports yet</p>
                </div>
              )
            }
            return (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('guestName') || 'Guest'}</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>{t('pickupDate') || 'Date'}</TableHead>
                      <TableHead>{t('route') || 'Route'}</TableHead>
                      <TableHead>{t('vehicle') || 'Vehicle'}</TableHead>
                      <TableHead>{tc('status') || 'Status'}</TableHead>
                      <TableHead>{tc('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {arrivals.map((transport: any) => (
                      <TableRow key={transport.id}>
                        <TableCell>
                          <div className="font-medium">{transport.guestName}</div>
                          {transport.guest && transport.guest.partySize > 1 && (
                            <div className="text-xs text-muted-foreground">
                              Party of {transport.guest.partySize} • {transport.guest.relationshipToFamily || 'Guest'}
                            </div>
                          )}
                          {transport.guest && transport.guest.partySize === 1 && transport.guest.relationshipToFamily && (
                            <div className="text-xs text-muted-foreground">
                              {transport.guest.relationshipToFamily}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getLegTypeIcon(transport.legType, transport.guest, transport.vehicleInfo)}
                            <span className="text-sm">{transport.vehicleInfo || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {transport.pickupDate ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              <span>{new Date(transport.pickupDate).toLocaleDateString()}</span>
                              {transport.pickupTime && (
                                <span className="text-muted-foreground ml-1">
                                  {transport.pickupTime}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {transport.pickupFrom || transport.dropTo ? (
                            <div className="flex items-center gap-1 text-sm max-w-[200px]">
                              <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="truncate">{transport.pickupFrom || '?'}</span>
                              <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="truncate">{transport.dropTo || '?'}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {transport.vehicleType && (
                              <div className="flex items-center gap-1 text-xs">
                                <Truck className="w-3 h-3 text-cobalt-500" />
                                <span className="capitalize">{transport.vehicleType}</span>
                              </div>
                            )}
                            {transport.vehicleNumber && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Car className="w-3 h-3" />
                                <span>{transport.vehicleNumber}</span>
                                {(() => {
                                  const vehicle = vehiclesList?.find(v => v.vehicleNumber === transport.vehicleNumber)
                                  if (vehicle) {
                                    return (
                                      <span className={`ml-1 flex items-center gap-1 ${
                                        vehicle.status === 'available' ? 'text-sage-600' :
                                        vehicle.status === 'in_use' ? 'text-gold-600' :
                                        'text-rose-600'
                                      }`}>
                                        <Circle className={`w-2 h-2 ${
                                          vehicle.status === 'available' ? 'fill-sage-500' :
                                          vehicle.status === 'in_use' ? 'fill-gold-500' :
                                          'fill-rose-500'
                                        }`} />
                                        <span className="text-[10px]">{vehicle.availabilityMessage}</span>
                                      </span>
                                    )
                                  }
                                  return null
                                })()}
                              </div>
                            )}
                            {transport.driverPhone && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="w-3 h-3" />
                                <span>{transport.driverPhone}</span>
                              </div>
                            )}
                            {!transport.vehicleType && !transport.vehicleNumber && !transport.driverPhone && (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(transport.transportStatus)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(transport)}
                              className="h-8 w-8 hover:bg-muted"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(transport.id)}
                              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          })()}
        </CardContent>
      </Card>

      {/* Departures Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-rose-500 rotate-45" />
            Departures ({transportList?.filter((t: any) => t.legType === 'departure').length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const departures = transportList?.filter((t: any) => t.legType === 'departure') || []
            if (departures.length === 0) {
              return (
                <div className="text-center py-6 text-muted-foreground">
                  <Plane className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50 rotate-45" />
                  <p className="text-sm">No departure transports yet</p>
                </div>
              )
            }
            return (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('guestName') || 'Guest'}</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>{t('pickupDate') || 'Date'}</TableHead>
                      <TableHead>{t('route') || 'Route'}</TableHead>
                      <TableHead>{t('vehicle') || 'Vehicle'}</TableHead>
                      <TableHead>{tc('status') || 'Status'}</TableHead>
                      <TableHead>{tc('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departures.map((transport: any) => (
                      <TableRow key={transport.id}>
                        <TableCell>
                          <div className="font-medium">{transport.guestName}</div>
                          {transport.guest && transport.guest.partySize > 1 && (
                            <div className="text-xs text-muted-foreground">
                              Party of {transport.guest.partySize} • {transport.guest.relationshipToFamily || 'Guest'}
                            </div>
                          )}
                          {transport.guest && transport.guest.partySize === 1 && transport.guest.relationshipToFamily && (
                            <div className="text-xs text-muted-foreground">
                              {transport.guest.relationshipToFamily}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getLegTypeIcon(transport.legType, transport.guest, transport.vehicleInfo)}
                            <span className="text-sm">{transport.vehicleInfo || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {transport.pickupDate ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              <span>{new Date(transport.pickupDate).toLocaleDateString()}</span>
                              {transport.pickupTime && (
                                <span className="text-muted-foreground ml-1">
                                  {transport.pickupTime}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {transport.pickupFrom || transport.dropTo ? (
                            <div className="flex items-center gap-1 text-sm max-w-[200px]">
                              <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="truncate">{transport.pickupFrom || '?'}</span>
                              <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="truncate">{transport.dropTo || '?'}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {transport.vehicleType && (
                              <div className="flex items-center gap-1 text-xs">
                                <Truck className="w-3 h-3 text-cobalt-500" />
                                <span className="capitalize">{transport.vehicleType}</span>
                              </div>
                            )}
                            {transport.vehicleNumber && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Car className="w-3 h-3" />
                                <span>{transport.vehicleNumber}</span>
                                {(() => {
                                  const vehicle = vehiclesList?.find(v => v.vehicleNumber === transport.vehicleNumber)
                                  if (vehicle) {
                                    return (
                                      <span className={`ml-1 flex items-center gap-1 ${
                                        vehicle.status === 'available' ? 'text-sage-600' :
                                        vehicle.status === 'in_use' ? 'text-gold-600' :
                                        'text-rose-600'
                                      }`}>
                                        <Circle className={`w-2 h-2 ${
                                          vehicle.status === 'available' ? 'fill-sage-500' :
                                          vehicle.status === 'in_use' ? 'fill-gold-500' :
                                          'fill-rose-500'
                                        }`} />
                                        <span className="text-[10px]">{vehicle.availabilityMessage}</span>
                                      </span>
                                    )
                                  }
                                  return null
                                })()}
                              </div>
                            )}
                            {transport.driverPhone && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="w-3 h-3" />
                                <span>{transport.driverPhone}</span>
                              </div>
                            )}
                            {!transport.vehicleType && !transport.vehicleNumber && !transport.driverPhone && (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(transport.transportStatus)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(transport)}
                              className="h-8 w-8 hover:bg-muted"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(transport.id)}
                              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          })()}
        </CardContent>
      </Card>

      {/* Inter-Event Transfers Section */}
      {(transportList?.filter((t: any) => t.legType === 'inter_event').length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bus className="w-5 h-5 text-teal-500" />
              Inter-Event Transfers ({transportList?.filter((t: any) => t.legType === 'inter_event').length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('guestName') || 'Guest'}</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>{t('pickupDate') || 'Date'}</TableHead>
                    <TableHead>{t('route') || 'Route'}</TableHead>
                    <TableHead>{t('vehicle') || 'Vehicle'}</TableHead>
                    <TableHead>{tc('status') || 'Status'}</TableHead>
                    <TableHead>{tc('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transportList?.filter((t: any) => t.legType === 'inter_event').map((transport: any) => (
                    <TableRow key={transport.id}>
                      <TableCell>
                        <div className="font-medium">{transport.guestName}</div>
                        {transport.guest && transport.guest.partySize > 1 && (
                          <div className="text-xs text-muted-foreground">
                            Party of {transport.guest.partySize}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Bus className="w-4 h-4 text-teal-500" />
                          <span className="text-sm">{transport.vehicleInfo || 'Transfer'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {transport.pickupDate ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <span>{new Date(transport.pickupDate).toLocaleDateString()}</span>
                            {transport.pickupTime && (
                              <span className="text-muted-foreground ml-1">{transport.pickupTime}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {transport.pickupFrom || transport.dropTo ? (
                          <div className="flex items-center gap-1 text-sm max-w-[200px]">
                            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{transport.pickupFrom || '?'}</span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{transport.dropTo || '?'}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {transport.vehicleNumber && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Car className="w-3 h-3" />
                              <span>{transport.vehicleNumber}</span>
                            </div>
                          )}
                          {!transport.vehicleNumber && <span className="text-muted-foreground">-</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(transport.transportStatus)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(transport)} className="h-8 w-8 hover:bg-muted">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(transport.id)} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={isAddDialogOpen || !!editingTransport}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false)
            setEditingTransport(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTransport ? (t('editTransport') || 'Edit Transport') : (t('addTransport') || 'Add Transport')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Guest Name - Combobox with existing guests + new entry option */}
            <div>
              <Label htmlFor="guestName">{t('guestName') || 'Guest Name'} *</Label>
              {editingTransport ? (
                <Input
                  id="guestName"
                  value={formData.guestName}
                  disabled
                />
              ) : (
                <Popover open={guestComboboxOpen} onOpenChange={setGuestComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={guestComboboxOpen}
                      className="w-full justify-between font-normal"
                    >
                      {formData.guestName || "Select guest or type new name..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search guests or type new name..."
                        value={guestSearchValue}
                        onValueChange={setGuestSearchValue}
                      />
                      <CommandList className="max-h-[300px]">
                        <CommandEmpty>
                          {guestSearchValue ? (
                            <div
                              className="flex items-center gap-2 p-2 cursor-pointer hover:bg-accent rounded-sm mx-1"
                              onClick={() => {
                                setFormData({ ...formData, guestName: guestSearchValue })
                                setGuestComboboxOpen(false)
                                setGuestSearchValue('')
                              }}
                            >
                              <UserPlus className="h-4 w-4 text-muted-foreground" />
                              <span>Add &quot;{guestSearchValue}&quot; as new entry</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No guests found. Type to add new.</span>
                          )}
                        </CommandEmpty>

                        {/* Party-grouped guest members */}
                        {availablePartyMembers.map((party, partyIndex) => {
                          const availableMembers = party.members.filter(m => !m.hasTransport)
                          const assignedMembers = party.members.filter(m => m.hasTransport)

                          // Skip parties with no available members (unless searching)
                          if (availableMembers.length === 0 && !guestSearchValue) return null

                          return (
                            <div key={party.partyId}>
                              {partyIndex > 0 && <CommandSeparator />}
                              <CommandGroup
                                heading={
                                  <div className="flex items-center gap-2">
                                    <Users className="h-3 w-3" />
                                    <span>{party.partyLeadName}&apos;s Party</span>
                                    {party.relationshipToFamily && (
                                      <Badge variant="outline" className="text-[10px] py-0 px-1">
                                        {party.relationshipToFamily}
                                      </Badge>
                                    )}
                                    <span className="text-[10px] text-muted-foreground ml-auto">
                                      {availableMembers.length}/{party.members.length} need {formData.legType}
                                    </span>
                                  </div>
                                }
                              >
                                {/* Available members first */}
                                {availableMembers.map((member) => (
                                  <CommandItem
                                    key={`${party.partyId}-${member.name}`}
                                    value={member.name}
                                    onSelect={() => {
                                      setFormData({ ...formData, guestName: member.name })
                                      setGuestComboboxOpen(false)
                                      setGuestSearchValue('')
                                    }}
                                    className="ml-2"
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        formData.guestName === member.name ? 'opacity-100' : 'opacity-0'
                                      }`}
                                    />
                                    <div className="flex items-center gap-2 flex-1">
                                      <span>{member.name}</span>
                                      {member.isLead && (
                                        <Badge variant="secondary" className="text-[10px] py-0 px-1">Lead</Badge>
                                      )}
                                    </div>
                                    <Badge variant="outline" className="text-[10px] py-0 px-1 text-amber-600 border-amber-300">
                                      Needs {formData.legType}
                                    </Badge>
                                  </CommandItem>
                                ))}

                                {/* Assigned members (greyed out) */}
                                {assignedMembers.length > 0 && (
                                  <div className="ml-2 mt-1 border-t pt-1">
                                    <div className="text-[10px] text-muted-foreground px-2 py-1">
                                      Already assigned {formData.legType}:
                                    </div>
                                    {assignedMembers.map((member) => (
                                      <div
                                        key={`${party.partyId}-${member.name}-assigned`}
                                        className="flex items-center gap-2 px-2 py-1.5 text-muted-foreground opacity-50"
                                      >
                                        <CheckCircle className="h-4 w-4 text-sage-500" />
                                        <span className="text-sm">{member.name}</span>
                                        {member.isLead && (
                                          <Badge variant="secondary" className="text-[10px] py-0 px-1">Lead</Badge>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </CommandGroup>
                            </div>
                          )
                        })}

                        {/* Add new option when searching */}
                        {guestSearchValue && (
                          <>
                            <CommandSeparator />
                            <CommandGroup heading="Add New Guest">
                              <CommandItem
                                value={`add-new-${guestSearchValue}`}
                                onSelect={() => {
                                  setFormData({ ...formData, guestName: guestSearchValue })
                                  setGuestComboboxOpen(false)
                                  setGuestSearchValue('')
                                }}
                              >
                                <UserPlus className="mr-2 h-4 w-4" />
                                Add &quot;{guestSearchValue}&quot; as new entry
                              </CommandItem>
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Leg Type and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="legType">{t('legType') || 'Transport Type'}</Label>
                <Select
                  value={formData.legType}
                  onValueChange={(value: 'arrival' | 'departure' | 'inter_event') =>
                    setFormData({ ...formData, legType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arrival">{t('arrival') || 'Arrival'}</SelectItem>
                    <SelectItem value="departure">{t('departure') || 'Departure'}</SelectItem>
                    <SelectItem value="inter_event">{t('interEvent') || 'Inter-Event'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="transportStatus">{tc('status') || 'Status'}</Label>
                <Select
                  value={formData.transportStatus}
                  onValueChange={(value: 'scheduled' | 'in_progress' | 'completed' | 'cancelled') =>
                    setFormData({ ...formData, transportStatus: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">{tc('scheduled') || 'Scheduled'}</SelectItem>
                    <SelectItem value="in_progress">{t('inProgress') || 'In Progress'}</SelectItem>
                    <SelectItem value="completed">{tc('completed') || 'Completed'}</SelectItem>
                    <SelectItem value="cancelled">{tc('cancelled') || 'Cancelled'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pickupDate">{t('pickupDate') || 'Pickup Date'}</Label>
                <Input
                  id="pickupDate"
                  type="date"
                  value={formData.pickupDate}
                  onChange={(e) => setFormData({ ...formData, pickupDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="pickupTime">{t('pickupTime') || 'Pickup Time'}</Label>
                <Input
                  id="pickupTime"
                  type="time"
                  value={formData.pickupTime}
                  onChange={(e) => setFormData({ ...formData, pickupTime: e.target.value })}
                />
              </div>
            </div>

            {/* Route */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pickupFrom">{t('pickupFrom') || 'Pickup From'}</Label>
                <Input
                  id="pickupFrom"
                  value={formData.pickupFrom}
                  onChange={(e) => setFormData({ ...formData, pickupFrom: e.target.value })}
                  placeholder={t('pickupFromPlaceholder') || 'e.g., Airport Terminal 1'}
                />
              </div>
              <div>
                <Label htmlFor="dropTo">{t('dropTo') || 'Drop To'}</Label>
                <Input
                  id="dropTo"
                  value={formData.dropTo}
                  onChange={(e) => setFormData({ ...formData, dropTo: e.target.value })}
                  placeholder={t('dropToPlaceholder') || 'e.g., Hilton Hotel'}
                />
              </div>
            </div>

            {/* Transport Info */}
            <div>
              <Label htmlFor="vehicleInfo">Transport Info</Label>
              <Input
                id="vehicleInfo"
                value={formData.vehicleInfo}
                onChange={(e) => setFormData({ ...formData, vehicleInfo: e.target.value })}
                placeholder="e.g., Flight AI-302, Train 12345, Bus from Delhi"
              />
            </div>

            {/* Vehicle Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vehicleType">Vehicle Type</Label>
                <Select
                  value={formData.vehicleType}
                  onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedan">Sedan</SelectItem>
                    <SelectItem value="suv">SUV</SelectItem>
                    <SelectItem value="bus">Bus</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                    <SelectItem value="tempo">Tempo</SelectItem>
                    <SelectItem value="minibus">Mini Bus</SelectItem>
                    <SelectItem value="luxury">Luxury</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                <Input
                  id="vehicleNumber"
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                  placeholder="e.g., MH-12-AB-1234"
                />
              </div>
            </div>

            {/* Driver & Coordinator */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="driverPhone">Driver Phone</Label>
                <Input
                  id="driverPhone"
                  value={formData.driverPhone}
                  onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                  placeholder="e.g., +91 98765 43210"
                />
              </div>
              <div>
                <Label htmlFor="coordinatorPhone">Coordinator Phone</Label>
                <Input
                  id="coordinatorPhone"
                  value={formData.coordinatorPhone}
                  onChange={(e) => setFormData({ ...formData, coordinatorPhone: e.target.value })}
                  placeholder="e.g., +91 98765 43210"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">{tc('notes')}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                placeholder={t('notesPlaceholder') || 'Any additional notes...'}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false)
                  setEditingTransport(null)
                  resetForm()
                }}
              >
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingTransport ? tc('update') : tc('add')}
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
