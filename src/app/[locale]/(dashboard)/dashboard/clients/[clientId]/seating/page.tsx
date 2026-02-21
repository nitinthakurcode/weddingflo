'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClientModuleHeader } from '@/components/dashboard/ClientModuleHeader'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, LayoutGrid, Users, Table2, Trash2, Edit, Eye } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from '@/lib/navigation'

// Type for floor plan returned from API (matches Drizzle schema)
interface FloorPlan {
  id: string
  clientId: string
  eventId: string | null
  name: string
  layout: unknown
  metadata: unknown
  width: number | null
  height: number | null
  backgroundImage: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Seating Page - Floor plans and guest seating arrangements
 *
 * Features:
 * - Multiple floor plans per wedding
 * - Drag-and-drop table placement
 * - Guest assignment to tables
 * - Seating conflict detection
 * - Version history
 */
export default function SeatingPage() {
  const params = useParams()
  const clientId = params?.clientId as string
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('seating')
  const tc = useTranslations('common')
  const tn = useTranslations('navigation')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newFloorPlanName, setNewFloorPlanName] = useState('')
  const [newVenueName, setNewVenueName] = useState('')

  const utils = trpc.useUtils()

  // Query floor plans for this client
  const { data: floorPlans, isLoading } = trpc.floorPlans.list.useQuery(
    { clientId },
    { enabled: !!clientId }
  )

  // Create floor plan mutation
  const createMutation = trpc.floorPlans.create.useMutation({
    onSuccess: (data) => {
      toast({ title: t('floorPlanCreated') || 'Floor plan created!' })
      setIsCreateDialogOpen(false)
      setNewFloorPlanName('')
      setNewVenueName('')
      utils.floorPlans.list.invalidate({ clientId })
      // Navigate to the new floor plan editor
      router.push(`/dashboard/clients/${clientId}/seating/${data.id}`)
    },
    onError: (error) => {
      toast({
        title: tc('error'),
        description: error.message,
        variant: 'destructive'
      })
    },
  })

  // Delete floor plan mutation
  const deleteMutation = trpc.floorPlans.delete.useMutation({
    onSuccess: () => {
      toast({ title: t('floorPlanDeleted') || 'Floor plan deleted' })
      utils.floorPlans.list.invalidate({ clientId })
    },
    onError: (error) => {
      toast({
        title: tc('error'),
        description: error.message,
        variant: 'destructive'
      })
    },
  })

  const handleCreate = () => {
    if (!newFloorPlanName.trim()) {
      toast({
        title: tc('error'),
        description: t('nameRequired') || 'Please enter a name for the floor plan',
        variant: 'destructive'
      })
      return
    }

    createMutation.mutate({
      clientId,
      name: newFloorPlanName.trim(),
      venueName: newVenueName.trim() || undefined,
    })
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(t('confirmDelete', { name }) || `Are you sure you want to delete "${name}"?`)) {
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
        title={tn('seating') || 'Seating'}
        description={t('description') || 'Create floor plans and manage guest seating arrangements'}
      >
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('createFloorPlan') || 'Create Floor Plan'}
        </Button>
      </ClientModuleHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('totalFloorPlans') || 'Floor Plans'}</p>
                <p className="text-2xl font-bold">{floorPlans?.length || 0}</p>
              </div>
              <LayoutGrid className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('totalTables') || 'Total Tables'}</p>
                <p className="text-2xl font-bold">-</p>
              </div>
              <Table2 className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('seatedGuests') || 'Seated Guests'}</p>
                <p className="text-2xl font-bold">-</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floor Plans List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('yourFloorPlans') || 'Your Floor Plans'}</CardTitle>
        </CardHeader>
        <CardContent>
          {!floorPlans || floorPlans.length === 0 ? (
            <div className="text-center py-12">
              <LayoutGrid className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {t('noFloorPlans') || 'No floor plans yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t('noFloorPlansDesc') || 'Create your first floor plan to start arranging seating for your wedding.'}
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('createFirstFloorPlan') || 'Create Your First Floor Plan'}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {floorPlans.map((plan: FloorPlan) => (
                <Card
                  key={plan.id}
                  className="group hover:shadow-md transition-shadow cursor-pointer"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-lg">{plan.name}</h4>
                        {(plan.metadata as any)?.venueName && (
                          <p className="text-sm text-muted-foreground">
                            {(plan.metadata as any).venueName}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/dashboard/clients/${clientId}/seating/${plan.id}`)
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(plan.id, plan.name)
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Table2 className="w-4 h-4" />
                        {/* Tables count would come from a separate query */}
                        -
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {/* Seated guests would come from a separate query */}
                        -
                      </span>
                    </div>

                    <Button
                      className="w-full mt-4"
                      variant="outline"
                      onClick={() => router.push(`/dashboard/clients/${clientId}/seating/${plan.id}`)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      {t('editFloorPlan') || 'Edit Floor Plan'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('createNewFloorPlan') || 'Create New Floor Plan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('floorPlanName') || 'Floor Plan Name'} *</Label>
              <Input
                id="name"
                placeholder={t('floorPlanNamePlaceholder') || 'e.g., Reception Hall'}
                value={newFloorPlanName}
                onChange={(e) => setNewFloorPlanName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue">{t('venueName') || 'Venue Name'}</Label>
              <Input
                id="venue"
                placeholder={t('venueNamePlaceholder') || 'e.g., Grand Ballroom'}
                value={newVenueName}
                onChange={(e) => setNewVenueName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? tc('creating') || 'Creating...' : tc('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
