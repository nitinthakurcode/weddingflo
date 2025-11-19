'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Filter, FileText, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { formatStripeAmount } from '@/lib/payments/stripe';
import { PDFDownloadButton } from './pdf-download-button';

export function InvoicesTable() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading } = trpc.payment.getInvoices.useQuery({
    limit: pageSize,
    offset: page * pageSize,
    status: statusFilter === 'all' ? undefined : (statusFilter as any),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-100">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Paid
          </Badge>
        );
      case 'overdue':
        return (
          <Badge variant="destructive">
            <AlertCircle className="mr-1 h-3 w-3" />
            Overdue
          </Badge>
        );
      case 'open':
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-100">
            <Clock className="mr-1 h-3 w-3" />
            Open
          </Badge>
        );
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'void':
        return <Badge variant="outline">Void</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredInvoices = data?.invoices.filter((invoice) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const clientName = `${invoice.client?.partner1_first_name || ''} ${invoice.client?.partner1_last_name || ''}`.toLowerCase();
    return (
      invoice.invoice_number.toLowerCase().includes(searchLower) ||
      invoice.description?.toLowerCase().includes(searchLower) ||
      clientName.includes(searchLower)
    );
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
        <CardDescription>Create and manage invoices for your clients</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col gap-4 mb-6 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by invoice number, client, or description..."
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
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="void">Void</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredInvoices && filteredInvoices.length > 0 ? (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <div className="font-medium">{invoice.invoice_number}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {invoice.description || 'No description'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {invoice.client ? `${invoice.client.partner1_first_name} ${invoice.client.partner1_last_name}` : 'Unknown'}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatStripeAmount(invoice.total_amount, invoice.currency as any)}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status || 'draft')}</TableCell>
                      <TableCell className="text-sm">
                        {invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {invoice.created_at ? formatDistanceToNow(new Date(invoice.created_at), { addSuffix: true }) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.payments && invoice.payments.length > 0 &&
                         invoice.payments[0].status === 'paid' && (
                          <PDFDownloadButton
                            paymentId={invoice.payments[0].id}
                            invoiceNumber={invoice.invoice_number}
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
                {data?.total || 0} invoices
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
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your filters to see more results'
                : 'No invoices have been created yet. Create your first invoice to get started!'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
