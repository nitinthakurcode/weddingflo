'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, DollarSign, Calendar, CreditCard, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AdvancePaymentsSectionProps {
  vendorId: string
  clientId: string
  contractAmount: number
}

export function AdvancePaymentsSection({ vendorId, clientId, contractAmount }: AdvancePaymentsSectionProps) {
  const t = useTranslations('vendors')
  const tc = useTranslations('common')
  const { toast } = useToast()
  const [isAddingPayment, setIsAddingPayment] = useState(false)
  const [newPayment, setNewPayment] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer',
    reference: '',
    notes: '',
  })

  const utils = trpc.useUtils()

  // Query advance payments for this vendor
  const { data: paymentsData, isLoading } = trpc.vendors.getVendorAdvances.useQuery(
    { vendorId },
    { enabled: !!vendorId }
  )

  // Create advance payment
  const createPaymentMutation = trpc.vendors.addVendorAdvance.useMutation({
    onSuccess: async () => {
      toast({ title: t('paymentAdded') || 'Payment added successfully' })
      setIsAddingPayment(false)
      setNewPayment({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'bank_transfer',
        reference: '',
        notes: '',
      })
      await utils.vendors.getVendorAdvances.invalidate({ vendorId })
      await utils.vendors.getAll.invalidate({ clientId })
      await utils.vendors.getStats.invalidate({ clientId })
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  // Delete advance payment
  const deletePaymentMutation = trpc.vendors.deleteVendorAdvance.useMutation({
    onSuccess: async () => {
      toast({ title: t('paymentDeleted') || 'Payment deleted' })
      await utils.vendors.getVendorAdvances.invalidate({ vendorId })
      await utils.vendors.getAll.invalidate({ clientId })
      await utils.vendors.getStats.invalidate({ clientId })
    },
    onError: (error) => {
      toast({ title: tc('error'), description: error.message, variant: 'destructive' })
    },
  })

  const handleAddPayment = () => {
    if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) {
      toast({ title: t('invalidAmount') || 'Please enter a valid amount', variant: 'destructive' })
      return
    }

    createPaymentMutation.mutate({
      vendorId,
      amount: parseFloat(newPayment.amount),
      paymentDate: newPayment.paymentDate,
      paymentMode: newPayment.paymentMethod === 'bank_transfer' ? 'Bank Transfer' :
                   newPayment.paymentMethod === 'cash' ? 'Cash' :
                   newPayment.paymentMethod === 'card' ? 'Credit Card' :
                   newPayment.paymentMethod === 'cheque' ? 'Check' :
                   newPayment.paymentMethod === 'upi' ? 'UPI' : 'Other',
      paidBy: 'Planner', // Default paidBy
      notes: newPayment.notes || undefined,
    })
  }

  const handleDeletePayment = (paymentId: string) => {
    if (confirm(t('confirmDeletePayment') || 'Are you sure you want to delete this payment?')) {
      deletePaymentMutation.mutate({ id: paymentId })
    }
  }

  // Extract payments from response
  const payments = paymentsData?.advances || []

  // Calculate totals
  const totalPaid = paymentsData?.total || 0
  const remaining = contractAmount - totalPaid
  const paidPercentage = contractAmount > 0 ? Math.round((totalPaid / contractAmount) * 100) : 0

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      bank_transfer: t('bankTransfer') || 'Bank Transfer',
      cash: t('cash') || 'Cash',
      card: t('card') || 'Card',
      cheque: t('cheque') || 'Cheque',
      upi: t('upi') || 'UPI',
      other: tc('other') || 'Other',
    }
    return labels[method] || method
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-4 bg-sage-50/50 dark:bg-sage-900/20 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-sage-600" />
          {t('advancePayments') || 'Advance Payments'}
        </h4>
        <div className="flex items-center gap-2">
          <Badge variant={remaining <= 0 ? 'success' : 'secondary'} className="text-xs">
            {paidPercentage}% {t('paid') || 'paid'}
          </Badge>
          {!isAddingPayment && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddingPayment(true)}
              className="gap-1"
            >
              <Plus className="w-3 h-3" />
              {t('addPayment') || 'Add Payment'}
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="bg-white dark:bg-gray-800 p-2 rounded">
          <p className="text-muted-foreground text-xs">{t('contractAmount') || 'Contract'}</p>
          <p className="font-semibold">${contractAmount.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-2 rounded">
          <p className="text-muted-foreground text-xs">{t('totalPaid') || 'Paid'}</p>
          <p className="font-semibold text-sage-600">${totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-2 rounded">
          <p className="text-muted-foreground text-xs">{t('remaining') || 'Balance'}</p>
          <p className={`font-semibold ${remaining <= 0 ? 'text-sage-600' : remaining < 0 ? 'text-rose-600' : 'text-gold-600'}`}>
            ${remaining.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${paidPercentage >= 100 ? 'bg-sage-500' : 'bg-teal-500'}`}
          style={{ width: `${Math.min(paidPercentage, 100)}%` }}
        />
      </div>

      {/* Payment list */}
      {payments && payments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{t('paymentHistory') || 'Payment History'}</p>
          {payments.map((payment: any) => (
            <div
              key={payment.id}
              className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded text-sm group"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-sage-100 dark:bg-sage-800 rounded">
                  <CreditCard className="w-3 h-3 text-sage-600" />
                </div>
                <div>
                  <p className="font-medium">${Number(payment.amount).toLocaleString()}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{new Date(payment.paymentDate).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{payment.paymentMode || 'Other'}</span>
                    {payment.paidBy && (
                      <>
                        <span>•</span>
                        <span>By: {payment.paidBy}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDeletePayment(payment.id)}
                disabled={deletePaymentMutation.isPending}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add payment form */}
      {isAddingPayment && (
        <div className="border-t pt-4 space-y-3">
          <p className="text-sm font-medium">{t('newPayment') || 'New Payment'}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{t('amount') || 'Amount'} *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newPayment.amount}
                onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                placeholder="0.00"
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">{t('paymentDate') || 'Date'}</Label>
              <Input
                type="date"
                value={newPayment.paymentDate}
                onChange={(e) => setNewPayment({ ...newPayment, paymentDate: e.target.value })}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">{t('paymentMethod') || 'Method'}</Label>
              <Select
                value={newPayment.paymentMethod}
                onValueChange={(value) => setNewPayment({ ...newPayment, paymentMethod: value })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">{t('bankTransfer') || 'Bank Transfer'}</SelectItem>
                  <SelectItem value="cash">{t('cash') || 'Cash'}</SelectItem>
                  <SelectItem value="card">{t('card') || 'Card'}</SelectItem>
                  <SelectItem value="cheque">{t('cheque') || 'Cheque'}</SelectItem>
                  <SelectItem value="upi">{t('upi') || 'UPI'}</SelectItem>
                  <SelectItem value="other">{tc('other') || 'Other'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{t('reference') || 'Reference #'}</Label>
              <Input
                value={newPayment.reference}
                onChange={(e) => setNewPayment({ ...newPayment, reference: e.target.value })}
                placeholder={t('optionalReference') || 'Optional'}
                className="h-8"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAddingPayment(false)}
            >
              {tc('cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAddPayment}
              disabled={createPaymentMutation.isPending}
            >
              {createPaymentMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t('savePayment') || 'Save Payment'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!payments || payments.length === 0) && !isAddingPayment && (
        <p className="text-center text-sm text-muted-foreground py-2">
          {t('noPaymentsYet') || 'No advance payments recorded yet'}
        </p>
      )}
    </div>
  )
}
