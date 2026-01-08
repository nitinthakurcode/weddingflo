'use client'

import { useState } from 'react'
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
  const [formData, setFormData] = useState({
    guestName: '',
    pickupDate: '',
    pickupTime: '',
    pickupFrom: '',
    dropTo: '',
    vehicleInfo: '',
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

  // Mutations
  const syncMutation = trpc.guestTransport.syncWithGuests.useMutation({
    onSuccess: async (result) => {
      if (result.synced > 0) {
        toast({
          title: t('guestsSynced') || 'Guests Synced',
          description: result.message
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
      legType: 'arrival',
      transportStatus: 'scheduled',
      notes: '',
    })
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

  const getLegTypeIcon = (legType: string) => {
    switch (legType) {
      case 'arrival':
        return <Plane className="w-4 h-4 text-cobalt-500" />
      case 'departure':
        return <Plane className="w-4 h-4 text-rose-500 rotate-45" />
      case 'inter_event':
        return <Bus className="w-4 h-4 text-teal-500" />
      default:
        return <Car className="w-4 h-4 text-muted-foreground" />
    }
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

      {/* Transport List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            {t('guestTransports') || 'Guest Transports'} ({transportList?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transportList?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="p-4 rounded-full bg-gold-50 dark:bg-gold-950/30 w-fit mx-auto mb-4">
                <Car className="w-12 h-12 text-gold-500" />
              </div>
              <p className="mb-2">{t('noTransportsYet') || 'No transport entries yet'}</p>
              <p className="text-sm">
                {t('noTransportsDescription') || 'Click "Sync from Guests" to import guests who need transport, or add manually.'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('guestName') || 'Guest'}</TableHead>
                    <TableHead>{t('legType') || 'Type'}</TableHead>
                    <TableHead>{t('pickupDate') || 'Date'}</TableHead>
                    <TableHead>{t('route') || 'Route'}</TableHead>
                    <TableHead>{t('vehicle') || 'Vehicle'}</TableHead>
                    <TableHead>{tc('status') || 'Status'}</TableHead>
                    <TableHead>{tc('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transportList?.map((transport: any) => (
                    <TableRow key={transport.id}>
                      <TableCell>
                        <div className="font-medium">{transport.guestName}</div>
                        {transport.guest && transport.guest.partySize > 1 && (
                          <div className="text-xs text-muted-foreground">
                            {t('partyOf', { size: transport.guest.partySize })} • {transport.guest.relationshipToFamily || 'Guest'}
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
                          {getLegTypeIcon(transport.legType)}
                          <span className="text-sm">{getLegTypeLabel(transport.legType)}</span>
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
                        {transport.vehicleInfo ? (
                          <span className="text-sm">{transport.vehicleInfo}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
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
                            <span className="sr-only">{tc('edit')}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(transport.id)}
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
            {/* Guest Name */}
            <div>
              <Label htmlFor="guestName">{t('guestName') || 'Guest Name'} *</Label>
              <Input
                id="guestName"
                value={formData.guestName}
                onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                required
                disabled={!!editingTransport}
              />
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

            {/* Vehicle Info */}
            <div>
              <Label htmlFor="vehicleInfo">{t('vehicleInfo') || 'Vehicle Info'}</Label>
              <Input
                id="vehicleInfo"
                value={formData.vehicleInfo}
                onChange={(e) => setFormData({ ...formData, vehicleInfo: e.target.value })}
                placeholder={t('vehicleInfoPlaceholder') || 'e.g., Black SUV, License ABC-123'}
              />
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
