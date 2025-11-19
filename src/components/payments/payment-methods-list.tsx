'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';

export function PaymentMethodsList() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Saved Payment Methods
        </CardTitle>
        <CardDescription>
          Manage your saved payment methods for quick checkout
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No payment methods saved</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Payment methods will be saved automatically when you make your first payment.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
