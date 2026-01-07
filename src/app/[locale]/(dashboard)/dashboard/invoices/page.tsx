import { Suspense } from 'react';
import { Metadata } from 'next';
import { InvoicesTable } from '@/components/payments/invoices-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Link } from '@/lib/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Invoices',
  description: 'Create and manage invoices',
};

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground mt-2">
            Create, send, and track invoices for your clients.
          </p>
        </div>
        <Link href="/dashboard/invoices/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </Link>
      </div>

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <InvoicesTable />
      </Suspense>
    </div>
  );
}
