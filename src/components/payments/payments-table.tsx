'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Filter, CheckCircle2, XCircle, Clock, DollarSign } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { formatStripeAmount } from '@/lib/payments/stripe';
import { DownloadInvoiceButton } from '@/components/pdf/download-invoice-button';

interface Payment {
  id: string;
  description: string | null;
  stripe_payment_intent_id: string | null;
  status: string;
  amount: number;
  currency: string;
  created_at: string;
  payment_method: string | null;
  invoice: {
    invoice_number: string;
  } | null;
  client: {
    partner1_first_name: string | null;
    partner1_last_name: string | null;
  } | null;
}

export function PaymentsTable() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading } = trpc.payment.getPayments.useQuery({
    limit: pageSize,
    offset: page * pageSize,
    status: statusFilter === 'all' ? undefined : (statusFilter as any),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-100">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Succeeded
          </Badge>
        );
      case 'failed':
      case 'canceled':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            {status}
          </Badge>
        );
      case 'pending':
      case 'processing':
      case 'requires_action':
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            {status}
          </Badge>
        );
      case 'refunded':
      case 'partially_refunded':
        return (
          <Badge variant="outline" className="border-orange-200 text-orange-800">
            {status.replace('_', ' ')}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const typedPayments = data?.payments as Payment[] | undefined;
  const filteredPayments = typedPayments?.filter((payment: Payment) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      payment.description?.toLowerCase().includes(searchLower) ||
      payment.stripe_payment_intent_id?.toLowerCase().includes(searchLower) ||
      payment.invoice?.invoice_number.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
        <CardDescription>View and manage all payment transactions</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col gap-4 mb-6 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by invoice, description, or payment ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="succeeded">Succeeded</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredPayments && filteredPayments.length > 0 ? (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="font-medium">
                          {payment.invoice?.invoice_number || 'N/A'}
                        </div>
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {payment.description || 'No description'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.client ? `${payment.client.partner1_first_name} ${payment.client.partner1_last_name}` : 'Unknown'}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatStripeAmount(payment.amount, payment.currency as any)}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status || 'pending')}</TableCell>
                      <TableCell className="capitalize">
                        {payment.payment_method || 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {payment.created_at ? formatDistanceToNow(new Date(payment.created_at), { addSuffix: true }) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        {payment.status === 'paid' && (
                          <DownloadInvoiceButton
                            paymentId={payment.id}
                            invoiceNumber={payment.invoice?.invoice_number}
                            showText={false}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, data?.total || 0)} of{' '}
                {data?.total || 0} payments
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={!data?.hasMore}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No payments found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your filters to see more results'
                : 'No payments have been processed yet. Create an invoice to get started!'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
