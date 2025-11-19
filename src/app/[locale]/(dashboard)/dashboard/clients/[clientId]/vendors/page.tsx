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
import { Plus, Trash2, Edit, Briefcase, DollarSign, FileText, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ImportDialog } from '@/components/import/ImportDialog'

export default function VendorsPage() {
  const params = useParams()
  const clientId = params?.clientId as string
  const { toast } = useToast()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<any>(null)
  const [formData, setFormData] = useState({
    vendorName: '',
    category: '',
    contactName: '',
    email: '',
    phone: '',
    website: '',
    contractSigned: false,
    contractDate: '',
    cost: '',
    depositAmount: '',
    depositPaid: false,
    paymentStatus: 'pending' as 'pending' | 'paid' | 'overdue',
    serviceDate: '',
    notes: '',
  })

  const utils = trpc.useUtils()

  // Queries
  const { data: vendors, isLoading } = trpc.vendors.getAll.useQuery({
    clientId: clientId,
  })

  const { data: stats } = trpc.vendors.getStats.useQuery({
    clientId: clientId,
  })

  // Mutations
  const createMutation = trpc.vendors.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Vendor added successfully' })
      utils.vendors.getAll.invalidate()
      utils.vendors.getStats.invalidate()
      resetForm()
      setIsAddDialogOpen(false)
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = trpc.vendors.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Vendor updated successfully' })
      utils.vendors.getAll.invalidate()
      utils.vendors.getStats.invalidate()
      setEditingVendor(null)
      resetForm()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = trpc.vendors.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Vendor deleted successfully' })
      utils.vendors.getAll.invalidate()
      utils.vendors.getStats.invalidate()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const resetForm = () => {
    setFormData({
      vendorName: '',
      category: '',
      contactName: '',
      email: '',
      phone: '',
      website: '',
      contractSigned: false,
      contractDate: '',
      cost: '',
      depositAmount: '',
      depositPaid: false,
      paymentStatus: 'pending',
      serviceDate: '',
      notes: '',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const submitData = {
      ...formData,
      cost: formData.cost ? parseFloat(formData.cost) : undefined,
      depositAmount: formData.depositAmount ? parseFloat(formData.depositAmount) : undefined,
    }

    if (editingVendor) {
      updateMutation.mutate({
        id: editingVendor.id,
        data: submitData,
      })
    } else {
      createMutation.mutate({
        clientId: clientId,
        ...submitData,
      })
    }
  }

  const handleEdit = (vendor: any) => {
    setEditingVendor(vendor)
    setFormData({
      vendorName: vendor.name || '',
      category: vendor.category || '',
      contactName: vendor.contact_name || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      website: vendor.website || '',
      contractSigned: vendor.contract_signed || false,
      contractDate: vendor.contract_date || '',
      cost: vendor.contract_amount?.toString() || '',
      depositAmount: vendor.deposit_amount?.toString() || '',
      depositPaid: vendor.deposit_paid || false,
      paymentStatus: vendor.payment_status || 'pending',
      serviceDate: vendor.service_date || '',
      notes: vendor.notes || '',
    })
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this vendor?')) {
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
        <p>Loading vendors...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Vendors</h1>
          <p className="text-muted-foreground">Manage your wedding vendors</p>
        </div>
        <div className="flex gap-2">
          <ImportDialog
            module="vendors"
            clientId={clientId}
            onImportComplete={() => {
              utils.vendors.getAll.invalidate()
              utils.vendors.getStats.invalidate()
              toast({ title: 'Import completed successfully!' })
            }}
          />
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Vendor
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          title="Total Vendors"
          value={stats?.total || 0}
          icon={<Briefcase className="w-4 h-4" />}
        />
        <StatCard
          title="Total Cost"
          value={`$${stats?.totalCost.toLocaleString() || 0}`}
          icon={<DollarSign className="w-4 h-4" />}
          color="text-blue-600"
        />
        <StatCard
          title="Paid"
          value={`$${stats?.paidAmount.toLocaleString() || 0}`}
          color="text-green-600"
        />
        <StatCard
          title="Contracts Signed"
          value={stats?.contractsSigned || 0}
          icon={<FileText className="w-4 h-4" />}
          color="text-purple-600"
        />
        <StatCard
          title="Overdue"
          value={stats?.paymentOverdue || 0}
          icon={<AlertCircle className="w-4 h-4" />}
          color="text-red-600"
        />
      </div>

      {/* Vendor List */}
      <Card>
        <CardHeader>
          <CardTitle>All Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          {vendors?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No vendors yet. Add your first vendor to get started!
            </div>
          ) : (
            <div className="space-y-2">
              {vendors?.map((vendor) => (
                <div
                  key={vendor.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{vendor.name}</h3>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {vendor.category}
                      </span>
                      {vendor.contract_signed && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          Contract Signed
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {vendor.contact_name && <p>Contact: {vendor.contact_name}</p>}
                      {vendor.email && <p>Email: {vendor.email}</p>}
                      {vendor.phone && <p>Phone: {vendor.phone}</p>}
                      {/* TODO: cost and service_date are in client_vendors junction table */}
                      <p>
                        Payment:{' '}
                        <span
                          className={
                            vendor.payment_status === 'paid'
                              ? 'text-green-600'
                              : vendor.payment_status === 'overdue'
                              ? 'text-red-600'
                              : 'text-yellow-600'
                          }
                        >
                          {vendor.payment_status || 'pending'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(vendor)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(vendor.id)}
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
        open={isAddDialogOpen || !!editingVendor}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false)
            setEditingVendor(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vendorName">Vendor Name *</Label>
                <Input
                  id="vendorName"
                  value={formData.vendorName}
                  onChange={(e) =>
                    setFormData({ ...formData, vendorName: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="category">Category *</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  placeholder="e.g., Catering, Photography"
                  required
                />
              </div>
              <div>
                <Label htmlFor="contactName">Contact Name</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) =>
                    setFormData({ ...formData, contactName: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
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
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="cost">Cost ($)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData({ ...formData, cost: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="depositAmount">Deposit Amount ($)</Label>
                <Input
                  id="depositAmount"
                  type="number"
                  step="0.01"
                  value={formData.depositAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, depositAmount: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="serviceDate">Service Date</Label>
                <Input
                  id="serviceDate"
                  type="date"
                  value={formData.serviceDate}
                  onChange={(e) =>
                    setFormData({ ...formData, serviceDate: e.target.value })
                  }
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
                <Label htmlFor="contractDate">Contract Date</Label>
                <Input
                  id="contractDate"
                  type="date"
                  value={formData.contractDate}
                  onChange={(e) =>
                    setFormData({ ...formData, contractDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="contractSigned"
                  checked={formData.contractSigned}
                  onChange={(e) =>
                    setFormData({ ...formData, contractSigned: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor="contractSigned">Contract Signed</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="depositPaid"
                  checked={formData.depositPaid}
                  onChange={(e) =>
                    setFormData({ ...formData, depositPaid: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor="depositPaid">Deposit Paid</Label>
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
                  setEditingVendor(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingVendor ? 'Update' : 'Add'} Vendor
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
  value: number | string
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
