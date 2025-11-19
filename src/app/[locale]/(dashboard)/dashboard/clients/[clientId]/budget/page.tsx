'use client'

import { useState } from 'react'
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
import { Plus, Trash2, Edit, DollarSign, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ImportDialog } from '@/components/import/ImportDialog'

export default function BudgetPage() {
  const params = useParams()
  const clientId = params?.clientId as string
  const { toast } = useToast()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [formData, setFormData] = useState({
    category: '',
    itemName: '',
    estimatedCost: '',
    actualCost: '',
    vendorId: '',
    paymentStatus: 'pending' as 'pending' | 'paid' | 'overdue',
    paymentDate: '',
    notes: '',
  })

  const utils = trpc.useUtils()

  // Queries
  const { data: budgetItems, isLoading } = trpc.budget.getAll.useQuery(
    { clientId }
  )

  const { data: summary } = trpc.budget.getSummary.useQuery(
    { clientId }
  )

  const { data: categorySummary } = trpc.budget.getCategorySummary.useQuery(
    { clientId }
  )

  // Mutations
  const createMutation = trpc.budget.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Budget item added successfully' })
      utils.budget.getAll.invalidate()
      utils.budget.getSummary.invalidate()
      utils.budget.getCategorySummary.invalidate()
      resetForm()
      setIsAddDialogOpen(false)
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = trpc.budget.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Budget item updated successfully' })
      utils.budget.getAll.invalidate()
      utils.budget.getSummary.invalidate()
      utils.budget.getCategorySummary.invalidate()
      setEditingItem(null)
      resetForm()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = trpc.budget.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Budget item deleted successfully' })
      utils.budget.getAll.invalidate()
      utils.budget.getSummary.invalidate()
      utils.budget.getCategorySummary.invalidate()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const resetForm = () => {
    setFormData({
      category: '',
      itemName: '',
      estimatedCost: '',
      actualCost: '',
      vendorId: '',
      paymentStatus: 'pending',
      paymentDate: '',
      notes: '',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const submitData = {
      ...formData,
      estimatedCost: parseFloat(formData.estimatedCost),
      actualCost: formData.actualCost ? parseFloat(formData.actualCost) : undefined,
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

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setFormData({
      category: item.category || '',
      itemName: item.item || '',
      estimatedCost: item.estimated_cost ? item.estimated_cost.toString() : '',
      actualCost: item.actual_cost ? item.actual_cost.toString() : '',
      vendorId: item.vendor_id || '',
      paymentStatus: item.payment_status || 'pending',
      paymentDate: item.payment_date || '',
      notes: item.notes || '',
    })
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this budget item?')) {
      deleteMutation.mutate({ id })
    }
  }

  if (!clientId) {
    return (
      <div className="p-6">
        <p>No client selected</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <p>Loading budget...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Budget Tracker</h1>
          <p className="text-muted-foreground">Track estimated vs actual costs</p>
        </div>
        <div className="flex gap-2">
          <ImportDialog
            module="budget"
            clientId={clientId}
            onImportComplete={() => {
              utils.budget.getAll.invalidate()
              utils.budget.getSummary.invalidate()
              utils.budget.getCategorySummary.invalidate()
              toast({ title: 'Import completed successfully!' })
            }}
          />
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Budget Item
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Estimated"
          value={`$${summary?.totalEstimated.toLocaleString() || 0}`}
          icon={<Wallet className="w-4 h-4" />}
          color="text-blue-600"
        />
        <StatCard
          title="Total Actual"
          value={`$${summary?.totalActual.toLocaleString() || 0}`}
          icon={<DollarSign className="w-4 h-4" />}
          color="text-purple-600"
        />
        <StatCard
          title="Variance"
          value={`$${Math.abs(summary?.difference || 0).toLocaleString()}`}
          icon={
            (summary?.difference || 0) >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )
          }
          color={(summary?.difference || 0) >= 0 ? 'text-red-600' : 'text-green-600'}
        />
        <StatCard
          title="% Spent"
          value={`${summary?.percentageSpent.toFixed(1) || 0}%`}
          color="text-orange-600"
        />
      </div>

      {/* Category Summary */}
      {categorySummary && categorySummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Budget by Category</CardTitle>
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
                      {cat.itemCount} items • {cat.percentageOfTotal.toFixed(1)}% of budget
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ${cat.totalEstimated.toLocaleString()} est.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ${cat.totalActual.toLocaleString()} actual
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Items */}
      <Card>
        <CardHeader>
          <CardTitle>All Budget Items</CardTitle>
        </CardHeader>
        <CardContent>
          {budgetItems?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No budget items yet. Add your first item to get started!
            </div>
          ) : (
            <div className="space-y-2">
              {budgetItems?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{item.item}</h3>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {item.category}
                      </span>
                      {item.payment_status === 'paid' && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          Paid
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Estimated: ${item.estimated_cost?.toLocaleString() || '0'}</p>
                      {item.actual_cost && <p>Actual: ${item.actual_cost.toLocaleString()}</p>}
                      {item.actual_cost && item.estimated_cost && (
                        <p>
                          Variance:{' '}
                          <span
                            className={
                              item.actual_cost - item.estimated_cost > 0
                                ? 'text-red-600'
                                : 'text-green-600'
                            }
                          >
                            ${Math.abs(item.actual_cost - item.estimated_cost).toLocaleString()}
                            {item.actual_cost - item.estimated_cost > 0 ? ' over' : ' under'}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
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
        open={isAddDialogOpen || !!editingItem}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false)
            setEditingItem(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Budget Item' : 'Add Budget Item'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  placeholder="e.g., Venue, Catering"
                  required
                />
              </div>
              <div>
                <Label htmlFor="itemName">Item Name *</Label>
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
                <Label htmlFor="estimatedCost">Estimated Cost ($) *</Label>
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
                <Label htmlFor="actualCost">Actual Cost ($)</Label>
                <Input
                  id="actualCost"
                  type="number"
                  step="0.01"
                  value={formData.actualCost}
                  onChange={(e) =>
                    setFormData({ ...formData, actualCost: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="vendorId">Vendor ID (Optional)</Label>
                <Input
                  id="vendorId"
                  value={formData.vendorId}
                  onChange={(e) =>
                    setFormData({ ...formData, vendorId: e.target.value })
                  }
                  placeholder="Link to vendor record"
                />
              </div>
              <div>
                <Label htmlFor="paymentStatus">Payment Status</Label>
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
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="paymentDate">Payment Date</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
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
                  setEditingItem(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingItem ? 'Update' : 'Add'} Item
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
