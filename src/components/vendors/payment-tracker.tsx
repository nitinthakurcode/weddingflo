'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Plus } from 'lucide-react';
import { Id } from '@/convex/_generated/dataModel';

interface Payment {
  id: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'unpaid' | 'partial' | 'paid';
  method?: string;
  notes?: string;
}

interface Vendor {
  _id: Id<'vendors'>;
  name: string;
  totalCost: number;
  balance?: number;
  payments: Payment[];
}

interface PaymentTrackerProps {
  vendor: Vendor;
  onAddPayment?: () => void;
}

export function PaymentTracker({ vendor, onAddPayment }: PaymentTrackerProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate total paid
  const totalPaid = vendor.payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  // Calculate payment progress percentage
  const paymentProgress = vendor.totalCost > 0
    ? Math.round((totalPaid / vendor.totalCost) * 100)
    : 0;

  // Get badge variant for payment status
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-500">Paid</Badge>;
      case 'partial':
        return <Badge variant="secondary">Partial</Badge>;
      default:
        return <Badge variant="outline">Unpaid</Badge>;
    }
  };

  // Sort payments by due date
  const sortedPayments = [...vendor.payments].sort((a, b) => {
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Payment Tracker</CardTitle>
          {onAddPayment && (
            <Button size="sm" onClick={onAddPayment}>
              <Plus className="mr-2 h-4 w-4" />
              Add Payment
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Payment Progress</span>
            <span className="font-medium">{paymentProgress}%</span>
          </div>
          <Progress value={paymentProgress} className="h-2" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Paid: {formatCurrency(totalPaid)}
            </span>
            <span className="text-muted-foreground">
              Total: {formatCurrency(vendor.totalCost)}
            </span>
          </div>
        </div>

        {/* Outstanding Balance */}
        <div className="rounded-lg bg-muted p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Outstanding Balance</span>
            <span className={`text-xl font-bold ${
              (vendor.balance ?? vendor.totalCost) > 0
                ? 'text-orange-600'
                : 'text-green-600'
            }`}>
              {formatCurrency(vendor.balance ?? vendor.totalCost)}
            </span>
          </div>
        </div>

        {/* Payment Schedule */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Payment Schedule</h4>

          {sortedPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No payment schedule added yet.
            </p>
          ) : (
            <div className="space-y-2">
              {sortedPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {formatCurrency(payment.amount)}
                      </span>
                      {getPaymentStatusBadge(payment.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Due: {formatDate(payment.dueDate)}
                      {payment.paidDate && (
                        <span className="ml-2">
                          | Paid: {formatDate(payment.paidDate)}
                        </span>
                      )}
                    </div>
                    {payment.method && (
                      <div className="text-sm text-muted-foreground">
                        Method: {payment.method}
                      </div>
                    )}
                    {payment.notes && (
                      <div className="text-sm text-muted-foreground">
                        {payment.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Summary */}
        <div className="space-y-2 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Payments</span>
            <span className="font-medium">{vendor.payments.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Paid Payments</span>
            <span className="font-medium text-green-600">
              {vendor.payments.filter((p) => p.status === 'paid').length}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Pending Payments</span>
            <span className="font-medium text-orange-600">
              {vendor.payments.filter((p) => p.status !== 'paid').length}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
