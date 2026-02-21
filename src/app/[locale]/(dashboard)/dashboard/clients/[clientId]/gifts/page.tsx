'use client'

import { useState } from 'react'
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
import { Plus, Trash2, Edit, Gift, Package, Clock, DollarSign } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ImportDialog } from '@/components/import/ImportDialog'
import { ClientModuleHeader } from '@/components/dashboard/ClientModuleHeader'
import { ExportButton } from '@/components/export/export-button'
import { formatCurrency } from '@/lib/currency'

export default function GiftsPage() {
  const params = useParams()
  const clientId = params?.clientId as string
  const { toast } = useToast()
  const t = useTranslations('gifts')
  const tc = useTranslations('common')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingGift, setEditingGift] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    status: 'received' as 'pending' | 'received' | 'returned',
  })

  const utils = trpc.useUtils()

  // Queries
  const { data: gifts, isLoading } = trpc.gifts.getAll.useQuery({
    clientId: clientId,
  })

  const { data: stats } = trpc.gifts.getStats.useQuery({
    clientId: clientId,
  })

  // Mutations
  const createMutation = trpc.gifts.create.useMutation({
    onSuccess: async () => {
      toast({ title: t('giftAdded') })
      resetForm()
      setIsAddDialogOpen(false)
      await Promise.all([
        utils.gifts.getAll.invalidate({ clientId }),
        utils.gifts.getStats.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = trpc.gifts.update.useMutation({
    onSuccess: async () => {
      toast({ title: t('giftUpdated') })
      setEditingGift(null)
      resetForm()
      await Promise.all([
        utils.gifts.getAll.invalidate({ clientId }),
        utils.gifts.getStats.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = trpc.gifts.delete.useMutation({
    onSuccess: async () => {
      toast({ title: t('giftDeleted') })
      await Promise.all([
        utils.gifts.getAll.invalidate({ clientId }),
        utils.gifts.getStats.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      value: '',
      status: 'received',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingGift) {
      updateMutation.mutate({
        id: editingGift.id,
        name: formData.name,
        value: formData.value ? parseFloat(formData.value) : undefined,
        status: formData.status,
      })
    } else {
      createMutation.mutate({
        clientId: clientId,
        name: formData.name,
        value: formData.value ? parseFloat(formData.value) : undefined,
        status: formData.status,
      })
    }
  }

  const handleEdit = (gift: any) => {
    setEditingGift(gift)
    setFormData({
      name: gift.name || '',
      value: gift.value?.toString() || '',
      status: gift.status || 'received',
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
        title={t('giftRegistry')}
        description={t('trackGiftsAndNotes')}
      >
        <ExportButton
          data={gifts || []}
          dataType="gifts"
          variant="outline"
        />
        <ImportDialog
          module="gifts"
          clientId={clientId}
          onImportComplete={() => {
            utils.gifts.getAll.invalidate()
            utils.gifts.getStats.invalidate()
            toast({ title: t('importCompleted') })
          }}
        />
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('addGift')}
        </Button>
      </ClientModuleHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title={t('totalGifts')}
          value={stats?.total || 0}
          icon={<Gift className="w-4 h-4" />}
        />
        <StatCard
          title={t('received')}
          value={stats?.received || 0}
          icon={<Package className="w-4 h-4" />}
          color="text-sage-600"
        />
        <StatCard
          title={tc('pending')}
          value={stats?.pending || 0}
          icon={<Clock className="w-4 h-4" />}
          color="text-gold-600"
        />
        <StatCard
          title={t('totalValue')}
          value={formatCurrency(stats?.totalValue || 0)}
          icon={<DollarSign className="w-4 h-4" />}
          color="text-cobalt-600"
          isText
        />
      </div>

      {/* Gift List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('allGifts')}</CardTitle>
        </CardHeader>
        <CardContent>
          {gifts?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('noGiftsYet')}
            </div>
          ) : (
            <div className="space-y-2">
              {gifts?.map((gift) => (
                <div
                  key={gift.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{gift.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${
                        gift.status === 'received' ? 'bg-sage-100 text-sage-700' :
                        gift.status === 'returned' ? 'bg-rose-100 text-rose-700' :
                        'bg-gold-100 text-gold-700'
                      }`}>
                        {t(`status${(gift.status || 'pending').charAt(0).toUpperCase() + (gift.status || 'pending').slice(1)}`)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {gift.guest && (
                        <p>{t('from')}: {gift.guest.firstName} {gift.guest.lastName}</p>
                      )}
                      {gift.value && (
                        <p>{t('value')}: {formatCurrency(gift.value)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(gift)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(gift.id)}
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
        open={isAddDialogOpen || !!editingGift}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false)
            setEditingGift(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingGift ? t('editGift') : t('addNewGift')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">{t('giftName')} *</Label>
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
              <Label htmlFor="value">{t('value')}</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) =>
                  setFormData({ ...formData, value: e.target.value })
                }
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="status">{tc('status')}</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t('statusPending')}</SelectItem>
                  <SelectItem value="received">{t('statusReceived')}</SelectItem>
                  <SelectItem value="returned">{t('statusReturned')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false)
                  setEditingGift(null)
                  resetForm()
                }}
              >
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingGift ? tc('update') : tc('add')} {t('gift')}
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
  isText = false,
}: {
  title: string
  value: number | string
  icon?: React.ReactNode
  color?: string
  isText?: boolean
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>
              {isText ? value : value}
            </p>
          </div>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  )
}
