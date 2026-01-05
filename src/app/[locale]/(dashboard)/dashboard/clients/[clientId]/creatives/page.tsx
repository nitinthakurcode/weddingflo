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
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2, Edit, Palette, CheckCircle, Clock, AlertTriangle, Eye, MessageSquare, Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ExportButton } from '@/components/export/export-button'
import { ClientModuleHeader } from '@/components/dashboard/ClientModuleHeader'

type CreativeJob = {
  id: string
  client_id: string
  job_type: string
  title: string
  description: string | null
  quantity: number | null
  job_start_date: string | null
  job_end_date: string | null
  due_date: string | null
  status: string
  assigned_to: string | null
  priority: string
  notes: string | null
  file_url: string | null
  client_visible: boolean | null
  approval_status: string | null
  approval_comments: string | null
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  revision_count: number | null
  versions: unknown
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export default function CreativesPage() {
  const params = useParams()
  const clientId = params?.clientId as string
  const { toast } = useToast()
  const t = useTranslations('creatives')
  const tc = useTranslations('common')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingCreative, setEditingCreative] = useState<CreativeJob | null>(null)
  const [viewingCreative, setViewingCreative] = useState<CreativeJob | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    jobType: 'graphic' as 'video' | 'photo' | 'graphic' | 'invitation' | 'other',
    quantity: 1,
    jobStartDate: '',
    dueDate: '',
    status: 'requested' as 'requested' | 'in_progress' | 'review' | 'approved' | 'completed',
    description: '',
    assignedTo: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    notes: '',
    fileUrl: '',
    clientVisible: true,
  })

  const utils = trpc.useUtils()

  // Queries
  const { data: creatives, isLoading } = trpc.creatives.getAll.useQuery({
    clientId: clientId,
  })

  const { data: stats } = trpc.creatives.getStats.useQuery({
    clientId: clientId,
  })

  // Mutations
  const createMutation = trpc.creatives.create.useMutation({
    onSuccess: async () => {
      toast({ title: t('creativeAdded') })
      resetForm()
      setIsAddDialogOpen(false)
      await Promise.all([
        utils.creatives.getAll.invalidate({ clientId }),
        utils.creatives.getStats.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = trpc.creatives.update.useMutation({
    onSuccess: async () => {
      toast({ title: t('creativeUpdated') })
      setEditingCreative(null)
      resetForm()
      await Promise.all([
        utils.creatives.getAll.invalidate({ clientId }),
        utils.creatives.getStats.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = trpc.creatives.delete.useMutation({
    onSuccess: async () => {
      toast({ title: t('creativeDeleted') })
      await Promise.all([
        utils.creatives.getAll.invalidate({ clientId }),
        utils.creatives.getStats.invalidate({ clientId }),
      ])
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const resetForm = () => {
    setFormData({
      title: '',
      jobType: 'graphic',
      quantity: 1,
      jobStartDate: '',
      dueDate: '',
      status: 'requested',
      description: '',
      assignedTo: '',
      priority: 'medium',
      notes: '',
      fileUrl: '',
      clientVisible: true,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingCreative) {
      updateMutation.mutate({
        id: editingCreative.id,
        data: {
          title: formData.title,
          jobType: formData.jobType,
          quantity: formData.quantity,
          jobStartDate: formData.jobStartDate || undefined,
          dueDate: formData.dueDate || undefined,
          status: formData.status,
          description: formData.description || undefined,
          assignedTo: formData.assignedTo || undefined,
          priority: formData.priority,
          notes: formData.notes || undefined,
          fileUrl: formData.fileUrl || undefined,
          clientVisible: formData.clientVisible,
        },
      })
    } else {
      createMutation.mutate({
        clientId: clientId,
        title: formData.title,
        jobType: formData.jobType,
        quantity: formData.quantity,
        jobStartDate: formData.jobStartDate || undefined,
        dueDate: formData.dueDate || undefined,
        status: formData.status,
        description: formData.description || undefined,
        assignedTo: formData.assignedTo || undefined,
        priority: formData.priority,
        notes: formData.notes || undefined,
        fileUrl: formData.fileUrl || undefined,
        clientVisible: formData.clientVisible,
      })
    }
  }

  const handleEdit = (creative: CreativeJob) => {
    setEditingCreative(creative)
    setFormData({
      title: creative.title || '',
      jobType: creative.job_type as typeof formData.jobType,
      quantity: creative.quantity || 1,
      jobStartDate: creative.job_start_date || '',
      dueDate: creative.due_date || '',
      status: creative.status as typeof formData.status,
      description: creative.description || '',
      assignedTo: creative.assigned_to || '',
      priority: creative.priority as typeof formData.priority,
      notes: creative.notes || '',
      fileUrl: creative.file_url || '',
      clientVisible: creative.client_visible ?? true,
    })
  }

  const handleDelete = (id: string) => {
    if (confirm(t('confirmDelete'))) {
      deleteMutation.mutate({ id })
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { labelKey: string; className: string }> = {
      requested: { labelKey: 'statusRequested', className: 'bg-mocha-500 dark:bg-mocha-600' },
      in_progress: { labelKey: 'statusInProgress', className: 'bg-cobalt-500 dark:bg-cobalt-600' },
      review: { labelKey: 'statusInReview', className: 'bg-gold-500 dark:bg-gold-600' },
      approved: { labelKey: 'statusApproved', className: 'bg-sage-500 dark:bg-sage-600' },
      completed: { labelKey: 'statusCompleted', className: 'bg-teal-500 dark:bg-teal-600' },
    }
    const variant = variants[status] || variants.requested
    return <Badge className={variant.className}>{t(variant.labelKey)}</Badge>
  }

  const getApprovalBadge = (status: string | null) => {
    const variants: Record<string, { labelKey: string; className: string }> = {
      pending: { labelKey: 'approvalPending', className: 'bg-mocha-400 dark:bg-mocha-500' },
      approved: { labelKey: 'approvalApproved', className: 'bg-sage-600 dark:bg-sage-700' },
      rejected: { labelKey: 'approvalRejected', className: 'bg-rose-500 dark:bg-rose-600' },
      revision_requested: { labelKey: 'approvalRevisionRequested', className: 'bg-gold-500 dark:bg-gold-600' },
    }
    const variant = variants[status ?? 'pending'] || variants.pending
    return <Badge className={variant.className}>{t(variant.labelKey)}</Badge>
  }

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      low: 'bg-mocha-400 dark:bg-mocha-500',
      medium: 'bg-cobalt-500 dark:bg-cobalt-600',
      high: 'bg-rose-500 dark:bg-rose-600',
    }
    return <Badge className={variants[priority] || variants.medium}>{t(`priority${priority.charAt(0).toUpperCase() + priority.slice(1)}`)}</Badge>
  }

  const getJobTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      video: t('typeVideo'),
      photo: t('typePhoto'),
      graphic: t('typeGraphic'),
      invitation: t('typeInvitation'),
      other: t('typeOther'),
    }
    return labels[type] || type
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
        title={t('creativesManagement')}
        description={t('manageCreativesDescription')}
      >
        <ExportButton
          data={creatives || []}
          dataType="creatives"
          variant="outline"
        />
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('addCreative')}
        </Button>
      </ClientModuleHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title={t('totalJobs')}
          value={stats?.total || 0}
          icon={<Palette className="w-4 h-4" />}
        />
        <StatCard
          title={t('inProgress')}
          value={stats?.inProgress || 0}
          color="text-cobalt-600 dark:text-cobalt-400"
        />
        <StatCard
          title={t('pendingApproval')}
          value={stats?.pendingApproval || 0}
          icon={<Clock className="w-4 h-4" />}
          color="text-gold-600 dark:text-gold-400"
        />
        <StatCard
          title={t('approved')}
          value={stats?.approved || 0}
          icon={<CheckCircle className="w-4 h-4" />}
          color="text-sage-600 dark:text-sage-400"
        />
        <StatCard
          title={t('revisionRequested')}
          value={stats?.revisionRequested || 0}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="text-gold-600 dark:text-gold-400"
        />
      </div>

      {/* Creatives List - Table View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            {t('creativeJobs', { count: creatives?.length || 0 })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {creatives?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-4">{t('noCreativesYet')}</p>
              <p className="text-sm">
                {t('clickAddCreative')}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('creativeName')}</TableHead>
                    <TableHead>{t('type')}</TableHead>
                    <TableHead>{t('quantity')}</TableHead>
                    <TableHead>{t('startDate')}</TableHead>
                    <TableHead>{t('endDate')}</TableHead>
                    <TableHead>{tc('status')}</TableHead>
                    <TableHead>{t('approval')}</TableHead>
                    <TableHead>{t('priority')}</TableHead>
                    <TableHead>{tc('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(creatives as CreativeJob[] | undefined)?.map((creative) => (
                    <TableRow key={creative.id}>
                      <TableCell>
                        <div className="font-medium">{creative.title}</div>
                        {creative.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {creative.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getJobTypeLabel(creative.job_type)}</TableCell>
                      <TableCell>{creative.quantity}</TableCell>
                      <TableCell>
                        {creative.job_start_date ? (
                          new Date(creative.job_start_date).toLocaleDateString()
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {creative.due_date ? (
                          new Date(creative.due_date).toLocaleDateString()
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(creative.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getApprovalBadge(creative.approval_status)}
                          {creative.approval_comments && (
                            <MessageSquare className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getPriorityBadge(creative.priority)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingCreative(creative)}
                            className="h-8 w-8 hover:bg-muted"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="sr-only">{tc('view')}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(creative)}
                            className="h-8 w-8 hover:bg-muted"
                          >
                            <Edit className="w-4 h-4" />
                            <span className="sr-only">{tc('edit')}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(creative.id)}
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
        open={isAddDialogOpen || !!editingCreative}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false)
            setEditingCreative(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCreative ? t('editCreativeJob') : t('addCreativeJob')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Primary Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="title">{t('creativeName')} *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder={t('creativeNamePlaceholder')}
                  required
                />
              </div>

              <div>
                <Label htmlFor="jobType">{t('creativeType')} *</Label>
                <Select
                  value={formData.jobType}
                  onValueChange={(value: typeof formData.jobType) =>
                    setFormData({ ...formData, jobType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">{t('typeVideo')}</SelectItem>
                    <SelectItem value="photo">{t('typePhoto')}</SelectItem>
                    <SelectItem value="graphic">{t('typeGraphic')}</SelectItem>
                    <SelectItem value="invitation">{t('typeInvitation')}</SelectItem>
                    <SelectItem value="other">{t('typeOther')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quantity">{t('numberOfJobs')} *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="jobStartDate">{t('jobStartDate')}</Label>
                <Input
                  id="jobStartDate"
                  type="date"
                  value={formData.jobStartDate}
                  onChange={(e) =>
                    setFormData({ ...formData, jobStartDate: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="dueDate">{t('jobEndDate')}</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="status">{tc('status')}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: typeof formData.status) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="requested">{t('statusRequested')}</SelectItem>
                    <SelectItem value="in_progress">{t('statusInProgress')}</SelectItem>
                    <SelectItem value="review">{t('statusInReview')}</SelectItem>
                    <SelectItem value="approved">{t('statusApproved')}</SelectItem>
                    <SelectItem value="completed">{t('statusCompleted')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">{t('priority')}</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: typeof formData.priority) =>
                    setFormData({ ...formData, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('priorityLow')}</SelectItem>
                    <SelectItem value="medium">{t('priorityMedium')}</SelectItem>
                    <SelectItem value="high">{t('priorityHigh')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Details */}
            <div>
              <Label htmlFor="description">{t('details')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                placeholder={t('detailsPlaceholder')}
              />
            </div>

            {/* Additional Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assignedTo">{t('assignedTo')}</Label>
                <Input
                  id="assignedTo"
                  value={formData.assignedTo}
                  onChange={(e) =>
                    setFormData({ ...formData, assignedTo: e.target.value })
                  }
                  placeholder={t('assignedToPlaceholder')}
                />
              </div>

              <div>
                <Label htmlFor="fileUrl">{t('fileUrl')}</Label>
                <Input
                  id="fileUrl"
                  type="url"
                  value={formData.fileUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, fileUrl: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">{tc('notes')}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={2}
                placeholder={t('notesPlaceholder')}
              />
            </div>

            {/* Client Visibility */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="clientVisible"
                checked={formData.clientVisible}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, clientVisible: checked as boolean })
                }
              />
              <Label htmlFor="clientVisible" className="text-sm font-medium">
                {t('visibleToClient')}
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false)
                  setEditingCreative(null)
                  resetForm()
                }}
              >
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingCreative ? tc('update') : tc('add')} {t('creative')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog
        open={!!viewingCreative}
        onOpenChange={(open) => {
          if (!open) setViewingCreative(null)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('creativeDetails')}</DialogTitle>
          </DialogHeader>
          {viewingCreative && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">{t('creativeName')}</Label>
                <p className="font-medium">{viewingCreative.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">{t('type')}</Label>
                  <p>{getJobTypeLabel(viewingCreative.job_type)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('quantity')}</Label>
                  <p>{viewingCreative.quantity}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">{t('startDate')}</Label>
                  <p>{viewingCreative.job_start_date ? new Date(viewingCreative.job_start_date).toLocaleDateString() : '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('endDate')}</Label>
                  <p>{viewingCreative.due_date ? new Date(viewingCreative.due_date).toLocaleDateString() : '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">{tc('status')}</Label>
                  <div className="mt-1">{getStatusBadge(viewingCreative.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('approval')}</Label>
                  <div className="mt-1">{getApprovalBadge(viewingCreative.approval_status)}</div>
                </div>
              </div>

              {viewingCreative.description && (
                <div>
                  <Label className="text-muted-foreground">{t('details')}</Label>
                  <p className="text-sm">{viewingCreative.description}</p>
                </div>
              )}

              {viewingCreative.approval_comments && (
                <div className="p-3 bg-muted rounded-lg">
                  <Label className="text-muted-foreground">{t('clientComments')}</Label>
                  <p className="text-sm mt-1">{viewingCreative.approval_comments}</p>
                  {viewingCreative.approved_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(viewingCreative.approved_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {(viewingCreative.revision_count ?? 0) > 0 && (
                <div>
                  <Label className="text-muted-foreground">{t('revisions')}</Label>
                  <p>{t('revisionsRequested', { count: viewingCreative.revision_count ?? 0 })}</p>
                </div>
              )}

              {viewingCreative.file_url && (
                <div>
                  <Label className="text-muted-foreground">{t('file')}</Label>
                  <a
                    href={viewingCreative.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-cobalt-600 dark:text-cobalt-400 hover:underline flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    {t('viewFile')}
                  </a>
                </div>
              )}
            </div>
          )}
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
