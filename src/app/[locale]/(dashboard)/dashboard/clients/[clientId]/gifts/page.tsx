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
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Edit, Gift, CheckCircle, Package, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ImportDialog } from '@/components/import/ImportDialog'
import { ClientModuleHeader } from '@/components/dashboard/ClientModuleHeader'
import { ExportButton } from '@/components/export/export-button'

export default function GiftsPage() {
  const params = useParams()
  const clientId = params?.clientId as string
  const { toast } = useToast()
  const t = useTranslations('gifts')
  const tc = useTranslations('common')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingGift, setEditingGift] = useState<any>(null)
  const [formData, setFormData] = useState({
    giftName: '',
    fromName: '',
    fromEmail: '',
    deliveryDate: '',
    deliveryStatus: 'pending' as 'pending' | 'received' | 'returned',
    thankYouSent: false,
    thankYouSentDate: '',
    notes: '',
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

  const markThankYouSentMutation = trpc.gifts.markThankYouSent.useMutation({
    onSuccess: async () => {
      toast({ title: t('thankYouMarkedSent') })
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
      giftName: '',
      fromName: '',
      fromEmail: '',
      deliveryDate: '',
      deliveryStatus: 'pending',
      thankYouSent: false,
      thankYouSentDate: '',
      notes: '',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingGift) {
      updateMutation.mutate({
        id: editingGift.id,
        data: formData,
      })
    } else {
      createMutation.mutate({
        clientId: clientId,
        ...formData,
      })
    }
  }

  const handleEdit = (gift: any) => {
    setEditingGift(gift)
    setFormData({
      giftName: gift.gift_name || '',
      fromName: gift.from_name || '',
      fromEmail: gift.from_email || '',
      deliveryDate: gift.delivery_date || '',
      deliveryStatus: gift.delivery_status || 'pending',
      thankYouSent: gift.thank_you_sent || false,
      thankYouSentDate: gift.thank_you_sent_date || '',
      notes: gift.notes || '',
    })
  }

  const handleDelete = (id: string) => {
    if (confirm(t('confirmDelete'))) {
      deleteMutation.mutate({ id })
    }
  }

  const handleMarkThankYouSent = (id: string) => {
    markThankYouSentMutation.mutate({ id })
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
          title={t('thankYouSent')}
          value={stats?.thankYouSent || 0}
          icon={<CheckCircle className="w-4 h-4" />}
          color="text-cobalt-600"
        />
        <StatCard
          title={t('thankYouPending')}
          value={stats?.thankYouPending || 0}
          color="text-gold-600"
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
                      <h3 className="font-semibold">{gift.gift_name}</h3>
                      {gift.delivery_status === 'received' && (
                        <span className="text-xs bg-sage-100 text-sage-700 px-2 py-1 rounded">
                          {t('received')}
                        </span>
                      )}
                      {gift.thank_you_sent && (
                        <span className="text-xs bg-cobalt-100 text-cobalt-700 px-2 py-1 rounded">
                          {t('thankYouSent')}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {gift.from_name && <p>{t('from')}: {gift.from_name}</p>}
                      {gift.from_email && <p>{tc('email')}: {gift.from_email}</p>}
                      {gift.delivery_date && (
                        <p>{t('delivered')}: {new Date(gift.delivery_date).toLocaleDateString()}</p>
                      )}
                      <p>
                        {tc('status')}:{' '}
                        <span
                          className={
                            gift.delivery_status === 'received'
                              ? 'text-sage-600'
                              : gift.delivery_status === 'returned'
                              ? 'text-rose-600'
                              : 'text-gold-600'
                          }
                        >
                          {t(`status${(gift.delivery_status ?? 'pending').charAt(0).toUpperCase() + (gift.delivery_status ?? 'pending').slice(1)}`)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {gift.delivery_status === 'received' && !gift.thank_you_sent && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkThankYouSent(gift.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {t('markSent')}
                      </Button>
                    )}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingGift ? t('editGift') : t('addNewGift')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="giftName">{t('giftName')} *</Label>
                <Input
                  id="giftName"
                  value={formData.giftName}
                  onChange={(e) =>
                    setFormData({ ...formData, giftName: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="fromName">{t('fromName')}</Label>
                <Input
                  id="fromName"
                  value={formData.fromName}
                  onChange={(e) =>
                    setFormData({ ...formData, fromName: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="fromEmail">{t('fromEmail')}</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  value={formData.fromEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, fromEmail: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="deliveryDate">{t('deliveryDate')}</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) =>
                    setFormData({ ...formData, deliveryDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="deliveryStatus">{t('deliveryStatus')}</Label>
                <Select
                  value={formData.deliveryStatus}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, deliveryStatus: value })
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
              <div>
                <Label htmlFor="thankYouSentDate">{t('thankYouSentDate')}</Label>
                <Input
                  id="thankYouSentDate"
                  type="date"
                  value={formData.thankYouSentDate}
                  onChange={(e) =>
                    setFormData({ ...formData, thankYouSentDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="thankYouSent"
                checked={formData.thankYouSent}
                onChange={(e) =>
                  setFormData({ ...formData, thankYouSent: e.target.checked })
                }
                className="w-4 h-4"
              />
              <Label htmlFor="thankYouSent">{t('thankYouSent')}</Label>
            </div>
            <div>
              <Label htmlFor="notes">{tc('notes')}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
              />
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
}: {
  title: string
  value: number
  icon?: React.ReactNode
  color?: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  )
}
