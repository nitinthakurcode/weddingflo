'use client'

import { useState, useMemo } from 'react'
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
  DialogFooter,
  DialogDescription
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
import { Plus, Trash2, Edit, DollarSign, TrendingUp, TrendingDown, Wallet, Eye, CreditCard, Calendar, Users, Plane, Palette, Music, Hotel, MoreHorizontal, ChevronDown, ChevronRight, LayoutGrid, List, Filter } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ImportDialog } from '@/components/import/ImportDialog'
import { ExportButton } from '@/components/export/export-button'
import { ClientModuleHeader } from '@/components/dashboard/ClientModuleHeader'

type AdvancePayment = {
  id: string
  budgetItemId: string
  amount: string
  paymentDate: string
  paidBy: string
  notes: string | null
}

type BudgetSegment = 'vendors' | 'travel' | 'creatives' | 'artists' | 'accommodation' | 'other'

type BudgetItem = {
  id: string
  clientId: string
  category: string
  segment: BudgetSegment | null
  item: string
  expenseDetails: string | null
  estimatedCost: string | null
  actualCost: string | null
  eventId: string | null
  vendorId: string | null
  transactionDate: string | null
  paymentStatus: string | null
  paymentDate: Date | null
  notes: string | null
  clientVisible: boolean | null
  isLumpSum: boolean | null
  events: { id: string; title: string } | null
  advancePayments: AdvancePayment[]
  totalAdvance: number
  balanceRemaining: number
}

// Segment icon mapping
const segmentIcons: Record<BudgetSegment, React.ReactNode> = {
  vendors: <Users className="w-5 h-5" />,
  travel: <Plane className="w-5 h-5" />,
  creatives: <Palette className="w-5 h-5" />,
  artists: <Music className="w-5 h-5" />,
  accommodation: <Hotel className="w-5 h-5" />,
  other: <MoreHorizontal className="w-5 h-5" />,
}

const segmentColors: Record<BudgetSegment, string> = {
  vendors: 'bg-cobalt-50 border-cobalt-200 text-cobalt-700',
  travel: 'bg-gold-50 border-gold-200 text-gold-700',
  creatives: 'bg-teal-50 border-teal-200 text-teal-700',
  artists: 'bg-rose-50 border-rose-200 text-rose-700',
  accommodation: 'bg-sage-50 border-sage-200 text-sage-700',
  other: 'bg-mocha-50 border-mocha-200 text-mocha-700',
}

export default function BudgetPage() {
  const params = useParams()
  const clientId = params?.clientId as string
  const { toast } = useToast()
  const t = useTranslations('budget')
  const tc = useTranslations('common')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null)
  const [viewingItem, setViewingItem] = useState<BudgetItem | null>(null)
  const [isAdvanceDialogOpen, setIsAdvanceDialogOpen] = useState(false)
  const [advanceForItem, setAdvanceForItem] = useState<BudgetItem | null>(null)
  const [viewMode, setViewMode] = useState<'segment' | 'list'>('segment')
  const [expandedSegments, setExpandedSegments] = useState<Set<BudgetSegment>>(new Set(['vendors', 'travel', 'creatives', 'artists', 'accommodation', 'other']))
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const [formData, setFormData] = useState({
    category: '',
    segment: 'vendors' as BudgetSegment,
    itemName: '',
    expenseDetails: '',
    estimatedCost: '',
    actualCost: '',
    eventId: '',
    vendorId: '',
    transactionDate: '',
    paymentStatus: 'pending' as 'pending' | 'paid' | 'overdue',
    paymentDate: '',
    notes: '',
    clientVisible: true,
    isLumpSum: false,
  })

  const [advanceFormData, setAdvanceFormData] = useState({
    amount: '',
    paymentDate: '',
    paidBy: '',
    notes: '',
  })

  const utils = trpc.useUtils()

  // Queries
  const { data: budgetItems, isLoading } = trpc.budget.getAll.useQuery({ clientId })
  const { data: summary } = trpc.budget.getSummary.useQuery({ clientId })
  const { data: categorySummary } = trpc.budget.getCategorySummary.useQuery({ clientId })
  const { data: segmentSummary } = trpc.budget.getSegmentSummary.useQuery({ clientId })
  const { data: events } = trpc.events.getAll.useQuery({ clientId })

  // Get unique categories from budget items
  const uniqueCategories = useMemo((): string[] => {
    if (!budgetItems) return []
    const categories = new Set(
      budgetItems.map(item => item.category).filter((c): c is string => c !== null && c !== undefined && c !== '')
    )
    return Array.from(categories).sort()
  }, [budgetItems])

  // Filter budget items by category
  const filteredBudgetItems = useMemo(() => {
    if (!budgetItems) return []
    if (categoryFilter === 'all') return budgetItems
    return budgetItems.filter(item => item.category === categoryFilter)
  }, [budgetItems, categoryFilter])

  // Calculate filtered summary when category filter is active
  const filteredSummary = useMemo(() => {
    if (categoryFilter === 'all' || !filteredBudgetItems.length) return null
    return {
      totalEstimated: filteredBudgetItems.reduce((sum, item) => sum + Number(item.estimatedCost || 0), 0),
      totalAdvances: filteredBudgetItems.reduce((sum, item) => sum + (item.totalAdvance || 0), 0),
      balanceRemaining: filteredBudgetItems.reduce((sum, item) => sum + (item.balanceRemaining || 0), 0),
      totalItems: filteredBudgetItems.length,
    }
  }, [categoryFilter, filteredBudgetItems])

  // Mutations
  const createMutation = trpc.budget.create.useMutation({
    onSuccess: async () => {
      toast({ title: t('itemAdded') })
      resetForm()
      setIsAddDialogOpen(false)
      await invalidateAll()
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = trpc.budget.update.useMutation({
    onSuccess: async () => {
      toast({ title: t('itemUpdated') })
      setEditingItem(null)
      resetForm()
      await invalidateAll()
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = trpc.budget.delete.useMutation({
    onSuccess: async () => {
      toast({ title: t('itemDeleted') })
      await invalidateAll()
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const addAdvanceMutation = trpc.budget.addAdvancePayment.useMutation({
    onSuccess: async () => {
      toast({ title: t('advanceAdded') })
      resetAdvanceForm()
      setIsAdvanceDialogOpen(false)
      setAdvanceForItem(null)
      await invalidateAll()
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const deleteAdvanceMutation = trpc.budget.deleteAdvancePayment.useMutation({
    onSuccess: async () => {
      toast({ title: t('advanceDeleted') })
      await invalidateAll()
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const invalidateAll = async () => {
    await Promise.all([
      utils.budget.getAll.invalidate({ clientId }),
      utils.budget.getSummary.invalidate({ clientId }),
      utils.budget.getCategorySummary.invalidate({ clientId }),
      utils.budget.getSegmentSummary.invalidate({ clientId }),
    ])
  }

  const toggleSegment = (segment: BudgetSegment) => {
    const newExpanded = new Set(expandedSegments)
    if (newExpanded.has(segment)) {
      newExpanded.delete(segment)
    } else {
      newExpanded.add(segment)
    }
    setExpandedSegments(newExpanded)
  }

  const getItemsBySegment = (segment: BudgetSegment) => {
    return filteredBudgetItems.filter(item => (item.segment || 'vendors') === segment)
  }

  const resetForm = () => {
    setFormData({
      category: '',
      segment: 'vendors',
      itemName: '',
      expenseDetails: '',
      estimatedCost: '',
      actualCost: '',
      eventId: '',
      vendorId: '',
      transactionDate: '',
      paymentStatus: 'pending',
      paymentDate: '',
      notes: '',
      clientVisible: true,
      isLumpSum: false,
    })
  }

  const resetAdvanceForm = () => {
    setAdvanceFormData({
      amount: '',
      paymentDate: '',
      paidBy: '',
      notes: '',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const submitData = {
      category: formData.category,
      segment: formData.segment,
      itemName: formData.itemName,
      expenseDetails: formData.expenseDetails || undefined,
      estimatedCost: parseFloat(formData.estimatedCost),
      actualCost: formData.actualCost ? parseFloat(formData.actualCost) : undefined,
      eventId: formData.eventId || undefined,
      transactionDate: formData.transactionDate || undefined,
      paymentStatus: formData.paymentStatus,
      paymentDate: formData.paymentDate || undefined,
      notes: formData.notes || undefined,
      clientVisible: formData.clientVisible,
      isLumpSum: formData.isLumpSum,
    }

    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        data: submitData,
      })
    } else {
      createMutation.mutate({
        clientId: clientId,
        ...submitData,
      })
    }
  }

  const handleAddAdvance = (e: React.FormEvent) => {
    e.preventDefault()
    if (!advanceForItem) return

    addAdvanceMutation.mutate({
      budgetItemId: advanceForItem.id,
      amount: parseFloat(advanceFormData.amount),
      paymentDate: advanceFormData.paymentDate,
      paidBy: advanceFormData.paidBy,
      notes: advanceFormData.notes || undefined,
    })
  }

  const handleEdit = (item: BudgetItem) => {
    setEditingItem(item)
    setFormData({
      category: item.category || '',
      segment: (item.segment as BudgetSegment) || 'vendors',
      itemName: item.item || '',
      expenseDetails: item.expenseDetails || '',
      estimatedCost: item.estimatedCost ? item.estimatedCost.toString() : '',
      actualCost: item.actualCost ? item.actualCost.toString() : '',
      eventId: item.eventId || '',
      vendorId: item.vendorId || '',
      transactionDate: item.transactionDate || '',
      paymentStatus: (item.paymentStatus as any) || 'pending',
      paymentDate: item.paymentDate ? new Date(item.paymentDate).toISOString().split('T')[0] : '',
      notes: item.notes || '',
      clientVisible: item.clientVisible ?? true,
      isLumpSum: item.isLumpSum ?? false,
    })
  }

  const handleDelete = (id: string) => {
    if (confirm(t('confirmDeleteItem'))) {
      deleteMutation.mutate({ id })
    }
  }

  const handleDeleteAdvance = (id: string) => {
    if (confirm(t('confirmDeleteAdvance'))) {
      deleteAdvanceMutation.mutate({ id })
    }
  }

  const openAdvanceDialog = (item: BudgetItem) => {
    setAdvanceForItem(item)
    setIsAdvanceDialogOpen(true)
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
        title={t('eventBudget')}
        description={t('trackExpenses')}
      >
        {/* View Toggle */}
        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === 'segment' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('segment')}
            className="h-8"
          >
            <LayoutGrid className="w-4 h-4 mr-1" />
            Segments
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="h-8"
          >
            <List className="w-4 h-4 mr-1" />
            List
          </Button>
        </div>

        {/* Category Filter */}
        {uniqueCategories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder={t('filterByCategory') || 'Filter by category'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allCategories') || 'All Categories'}</SelectItem>
              {uniqueCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <ExportButton
          data={budgetItems || []}
          dataType="budget"
          onExportComplete={(format) => {
            toast({ title: t('budgetExported', { format: format.toUpperCase() }) })
          }}
        />
        <ImportDialog
          module="budget"
          clientId={clientId}
          onImportComplete={() => {
            invalidateAll()
            toast({ title: tc('importCompleted') })
          }}
        />
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('addBudgetItem')}
        </Button>
      </ClientModuleHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title={t('totalBudget')}
          value={`$${summary?.totalEstimated.toLocaleString() || 0}`}
          icon={<Wallet className="w-4 h-4" />}
          color="text-cobalt-600"
        />
        <StatCard
          title={t('totalAdvances')}
          value={`$${summary?.totalAdvances?.toLocaleString() || 0}`}
          icon={<CreditCard className="w-4 h-4" />}
          color="text-teal-600"
        />
        <StatCard
          title={t('balanceRemaining')}
          value={`$${summary?.balanceRemaining?.toLocaleString() || 0}`}
          icon={<DollarSign className="w-4 h-4" />}
          color="text-sage-600"
        />
        <StatCard
          title={t('actualSpent')}
          value={`$${summary?.totalActual.toLocaleString() || 0}`}
          icon={
            (summary?.difference || 0) >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )
          }
          color={(summary?.difference || 0) >= 0 ? 'text-rose-600' : 'text-gold-600'}
        />
        <StatCard
          title={t('items')}
          value={summary?.totalItems || 0}
          color="text-mocha-600"
        />
      </div>

      {/* Segment View */}
      {viewMode === 'segment' && segmentSummary && (
        <div className="space-y-4">
          {segmentSummary.segments.map((seg) => {
            const segmentItems = getItemsBySegment(seg.segment as BudgetSegment)
            const isExpanded = expandedSegments.has(seg.segment as BudgetSegment)

            return (
              <Card key={seg.segment} className={`border-2 ${segmentColors[seg.segment as BudgetSegment]}`}>
                <CardHeader className="pb-3">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleSegment(seg.segment as BudgetSegment)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white/50">
                        {segmentIcons[seg.segment as BudgetSegment]}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{seg.label}</CardTitle>
                        <p className="text-sm opacity-75">
                          {seg.itemCount} {t('items')} • {seg.categoryCount} {seg.categoryCount === 1 ? 'category' : 'categories'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold">${seg.totalEstimated.toLocaleString()}</p>
                        <p className="text-sm opacity-75">
                          {seg.percentageOfTotal.toFixed(1)}% of total
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setFormData(prev => ({ ...prev, segment: seg.segment as BudgetSegment }))
                            setIsAddDialogOpen(true)
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Segment Quick Stats */}
                  <div className="flex gap-4 mt-3 pt-3 border-t border-white/50">
                    <div className="text-sm">
                      <span className="opacity-75">Paid:</span>{' '}
                      <span className="font-medium">${seg.totalPaid.toLocaleString()}</span>
                    </div>
                    <div className="text-sm">
                      <span className="opacity-75">Balance:</span>{' '}
                      <span className="font-medium">${seg.balance.toLocaleString()}</span>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && segmentItems.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="bg-white/80 rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('expenseDetails')}</TableHead>
                            <TableHead>{t('category')}</TableHead>
                            <TableHead className="text-right">{t('budget')}</TableHead>
                            <TableHead className="text-right">{t('totalAdvance')}</TableHead>
                            <TableHead className="text-right">{t('balance')}</TableHead>
                            <TableHead>{tc('actions')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {segmentItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div className="font-medium">{item.item}</div>
                                {item.expenseDetails && (
                                  <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {item.expenseDetails}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{item.category}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                ${Number(item.estimatedCost || 0).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="text-teal-600 font-medium">
                                  ${item.totalAdvance.toLocaleString()}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={item.balanceRemaining >= 0 ? 'text-sage-600' : 'text-rose-600'}>
                                  ${item.balanceRemaining.toLocaleString()}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => setViewingItem(item)} className="h-8 w-8">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => openAdvanceDialog(item)} className="h-8 w-8">
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="h-8 w-8">
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8 hover:text-destructive">
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
                )}

                {isExpanded && segmentItems.length === 0 && (
                  <CardContent className="pt-0">
                    <div className="text-center py-4 text-muted-foreground bg-white/80 rounded-lg">
                      No items in this segment yet.{' '}
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, segment: seg.segment as BudgetSegment }))
                          setIsAddDialogOpen(true)
                        }}
                      >
                        Add one
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}

          {/* Grand Total Card */}
          <Card className="border-2 border-primary bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Wallet className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Grand Total</h3>
                    <p className="text-sm text-muted-foreground">
                      {segmentSummary.grandTotal.itemCount} items across all segments
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">
                    ${segmentSummary.grandTotal.estimated.toLocaleString()}
                  </p>
                  <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                    <span>Paid: ${segmentSummary.grandTotal.paid.toLocaleString()}</span>
                    <span>Balance: ${segmentSummary.grandTotal.balance.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtered Summary Banner (when category filter is active) */}
      {filteredSummary && (
        <Card className="border-2 border-teal-200 bg-teal-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-100">
                  <Filter className="w-5 h-5 text-teal-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-teal-900">
                    {t('filteredBy') || 'Filtered by'}: {categoryFilter}
                  </h3>
                  <p className="text-sm text-teal-700">
                    {filteredSummary.totalItems} {t('items')} {t('inThisCategory') || 'in this category'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6 text-right">
                <div>
                  <p className="text-xs text-teal-600">{t('totalBudget')}</p>
                  <p className="text-lg font-bold text-teal-900">${filteredSummary.totalEstimated.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-teal-600">{t('totalAdvances')}</p>
                  <p className="text-lg font-bold text-teal-900">${filteredSummary.totalAdvances.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-teal-600">{t('balanceRemaining')}</p>
                  <p className={`text-lg font-bold ${filteredSummary.balanceRemaining >= 0 ? 'text-sage-700' : 'text-rose-700'}`}>
                    ${filteredSummary.balanceRemaining.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Items Table (List View) */}
      {viewMode === 'list' && (
      <Card>
        <CardHeader>
          <CardTitle>
            {categoryFilter !== 'all'
              ? `${t('budgetItems')} - ${categoryFilter}`
              : t('budgetItems')
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBudgetItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {categoryFilter !== 'all'
                ? (t('noItemsInCategory') || `No items in "${categoryFilter}" category`)
                : t('noBudgetItems')
              }
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('expenseDetails')}</TableHead>
                    <TableHead>{t('category')}</TableHead>
                    <TableHead>{t('event')}</TableHead>
                    <TableHead className="text-right">{t('budget')}</TableHead>
                    <TableHead className="text-right">{t('totalAdvance')}</TableHead>
                    <TableHead className="text-right">{t('balance')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{tc('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBudgetItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.item}</div>
                        {item.expenseDetails && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {item.expenseDetails}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.events?.title || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${Number(item.estimatedCost || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-teal-600 font-medium">
                          ${item.totalAdvance.toLocaleString()}
                        </span>
                        {item.advancePayments.length > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({item.advancePayments.length})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={item.balanceRemaining >= 0 ? 'text-sage-600' : 'text-rose-600'}>
                          ${item.balanceRemaining.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.paymentStatus === 'paid' ? 'default' : item.paymentStatus === 'overdue' ? 'destructive' : 'secondary'}>
                          {item.paymentStatus || 'pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingItem(item)}
                            className="h-8 w-8 hover:bg-muted"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="sr-only">{tc('view')}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openAdvanceDialog(item)}
                            title={t('addAdvancePayment')}
                            className="h-8 w-8 hover:bg-muted"
                          >
                            <Plus className="w-4 h-4" />
                            <span className="sr-only">{t('addAdvancePayment')}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(item)}
                            className="h-8 w-8 hover:bg-muted"
                          >
                            <Edit className="w-4 h-4" />
                            <span className="sr-only">{tc('edit')}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item.id)}
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
      )}

      {/* Category Summary - shown in list view only */}
      {viewMode === 'list' && categorySummary && categorySummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('budgetByCategory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categorySummary.map((cat) => (
                <div
                  key={cat.category}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold">{cat.category}</h4>
                    <p className="text-sm text-muted-foreground">
                      {cat.itemCount} {t('items')} • {cat.percentageOfTotal.toFixed(1)}% {t('ofBudget')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ${cat.totalEstimated.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Budget Item Dialog */}
      <Dialog
        open={isAddDialogOpen || !!editingItem}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false)
            setEditingItem(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? t('editBudgetItem') : t('addBudgetItem')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="itemName">{t('expenseName')} *</Label>
                <Input
                  id="itemName"
                  value={formData.itemName}
                  onChange={(e) =>
                    setFormData({ ...formData, itemName: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="segment">Segment *</Label>
                <Select
                  value={formData.segment}
                  onValueChange={(value: BudgetSegment) =>
                    setFormData({ ...formData, segment: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select segment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendors">Vendors</SelectItem>
                    <SelectItem value="travel">Travel & Logistics</SelectItem>
                    <SelectItem value="creatives">Creatives & Design</SelectItem>
                    <SelectItem value="artists">Artists & Entertainment</SelectItem>
                    <SelectItem value="accommodation">Accommodation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="category">{t('category')} *</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  placeholder={t('categoryPlaceholder')}
                  required
                />
              </div>
              <div>
                <Label htmlFor="eventId">{t('event')}</Label>
                <Select
                  value={formData.eventId || '_none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, eventId: value === '_none' ? '' : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectEvent')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">{t('noEvent')}</SelectItem>
                    {events?.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="estimatedCost">{t('budgetAmount')} *</Label>
                <Input
                  id="estimatedCost"
                  type="number"
                  step="0.01"
                  value={formData.estimatedCost}
                  onChange={(e) =>
                    setFormData({ ...formData, estimatedCost: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="paymentStatus">{t('paymentStatus')}</Label>
                <Select
                  value={formData.paymentStatus}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, paymentStatus: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{tc('pending')}</SelectItem>
                    <SelectItem value="paid">{t('paid')}</SelectItem>
                    <SelectItem value="overdue">{t('overdue')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="expenseDetails">{t('expenseDetails')}</Label>
              <Textarea
                id="expenseDetails"
                value={formData.expenseDetails}
                onChange={(e) =>
                  setFormData({ ...formData, expenseDetails: e.target.value })
                }
                rows={2}
                placeholder={t('expenseDetailsPlaceholder')}
              />
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
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="clientVisible"
                checked={formData.clientVisible}
                onChange={(e) =>
                  setFormData({ ...formData, clientVisible: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="clientVisible">{t('visibleToClient')}</Label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false)
                  setEditingItem(null)
                  resetForm()
                }}
              >
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingItem ? tc('update') : tc('add')} {t('item')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Item Details Dialog */}
      <Dialog open={!!viewingItem} onOpenChange={(open) => !open && setViewingItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('budgetItemDetails')}</DialogTitle>
          </DialogHeader>
          {viewingItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">{t('expenseName')}</Label>
                  <p className="font-medium">{viewingItem.item}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('category')}</Label>
                  <p>{viewingItem.category}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('event')}</Label>
                  <p>{viewingItem.events?.title || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('budgetAmount')}</Label>
                  <p className="font-semibold text-lg">${Number(viewingItem.estimatedCost || 0).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('paymentStatus')}</Label>
                  <Badge variant={viewingItem.paymentStatus === 'paid' ? 'default' : viewingItem.paymentStatus === 'overdue' ? 'destructive' : 'secondary'}>
                    {viewingItem.paymentStatus || 'pending'}
                  </Badge>
                </div>
              </div>

              {viewingItem.expenseDetails && (
                <div>
                  <Label className="text-muted-foreground">{t('details')}</Label>
                  <p className="text-sm">{viewingItem.expenseDetails}</p>
                </div>
              )}

              {/* Advance Payments Section */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-lg font-semibold">{t('advancePayments')}</Label>
                  <Button size="sm" onClick={() => openAdvanceDialog(viewingItem)}>
                    <Plus className="w-4 h-4 mr-1" />
                    {t('addAdvance')}
                  </Button>
                </div>

                {viewingItem.advancePayments.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t('noAdvancePayments')}</p>
                ) : (
                  <div className="space-y-2">
                    {viewingItem.advancePayments.map((advance) => (
                      <div key={advance.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">${Number(advance.amount).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(advance.paymentDate).toLocaleDateString()} • {t('paidBy')}: {advance.paidBy}
                          </p>
                          {advance.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{advance.notes}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAdvance(advance.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Totals */}
                <div className="mt-4 pt-3 border-t space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('totalAdvanceGiven')}:</span>
                    <span className="font-semibold text-teal-600">
                      ${viewingItem.totalAdvance.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('balanceRemaining')}:</span>
                    <span className={`font-semibold ${viewingItem.balanceRemaining >= 0 ? 'text-sage-600' : 'text-rose-600'}`}>
                      ${viewingItem.balanceRemaining.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Advance Payment Dialog */}
      <Dialog open={isAdvanceDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAdvanceDialogOpen(false)
          setAdvanceForItem(null)
          resetAdvanceForm()
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addAdvancePayment')}</DialogTitle>
            <DialogDescription>
              {advanceForItem && t('addingAdvanceFor', { item: advanceForItem.item })}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAdvance} className="space-y-4">
            <div>
              <Label htmlFor="advanceAmount">{t('amount')} *</Label>
              <Input
                id="advanceAmount"
                type="number"
                step="0.01"
                value={advanceFormData.amount}
                onChange={(e) =>
                  setAdvanceFormData({ ...advanceFormData, amount: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="advanceDate">{t('paymentDate')} *</Label>
              <Input
                id="advanceDate"
                type="date"
                value={advanceFormData.paymentDate}
                onChange={(e) =>
                  setAdvanceFormData({ ...advanceFormData, paymentDate: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="paidBy">{t('paidBy')} *</Label>
              <Input
                id="paidBy"
                value={advanceFormData.paidBy}
                onChange={(e) =>
                  setAdvanceFormData({ ...advanceFormData, paidBy: e.target.value })
                }
                placeholder={t('paidByPlaceholder')}
                required
              />
            </div>
            <div>
              <Label htmlFor="advanceNotes">{tc('notes')}</Label>
              <Textarea
                id="advanceNotes"
                value={advanceFormData.notes}
                onChange={(e) =>
                  setAdvanceFormData({ ...advanceFormData, notes: e.target.value })
                }
                rows={2}
                placeholder={t('advanceNotesPlaceholder')}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAdvanceDialogOpen(false)
                  setAdvanceForItem(null)
                  resetAdvanceForm()
                }}
              >
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={addAdvanceMutation.isPending}>
                {t('addPayment')}
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
  value: string | number
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
