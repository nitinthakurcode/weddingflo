import { Suspense } from 'react';
import { Metadata } from 'next';
import { PaymentStatsCards } from '@/components/payments/payment-stats-cards';
import { PaymentsTable } from '@/components/payments/payments-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Payments',
  description: 'View and manage all payments',
};

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground mt-2">
            View payment history and process new payments.
          </p>
        </div>
        <Link href="/dashboard/invoices/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      <Suspense fallback={<StatsLoadingSkeleton />}>
        <PaymentStatsCards />
      </Suspense>

      {/* Payments Table */}
      <Suspense fallback={<TableLoadingSkeleton />}>
        <PaymentsTable />
      </Suspense>
    </div>
  );
}

function StatsLoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  );
}

function TableLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
