'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Filter, Mail, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function EmailLogsTable() {
  const t = useTranslations('emailLogs');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading } = trpc.email.getEmailLogs.useQuery({
    limit: pageSize,
    offset: page * pageSize,
    status: statusFilter === 'all' ? undefined : (statusFilter as any),
    emailType: typeFilter === 'all' ? undefined : (typeFilter as any),
  });

  const getStatusBadge = (status: string) => {
    const statusText = t(`status.${status}` as any) || status;
    switch (status) {
      case 'sent':
      case 'delivered':
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-100"
          >
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {statusText}
          </Badge>
        );
      case 'failed':
      case 'bounced':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            {statusText}
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            {statusText}
          </Badge>
        );
      default:
        return <Badge variant="outline">{statusText}</Badge>;
    }
  };

  const getEmailTypeLabel = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const filteredLogs = data?.logs.filter((log) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      log.recipient_email.toLowerCase().includes(searchLower) ||
      log.recipient_name?.toLowerCase().includes(searchLower) ||
      log.subject.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col gap-4 mb-6 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder={t('filterLabel')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filterAll')}</SelectItem>
              <SelectItem value="sent">{t('status.sent')}</SelectItem>
              <SelectItem value="delivered">{t('status.sent')}</SelectItem>
              <SelectItem value="failed">{t('status.failed')}</SelectItem>
              <SelectItem value="bounced">{t('status.bounced')}</SelectItem>
              <SelectItem value="pending">{t('status.pending')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Mail className="mr-2 h-4 w-4" />
              <SelectValue placeholder={t('filterLabel')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filterAll')}</SelectItem>
              <SelectItem value="client_invite">{t('filterAll')}</SelectItem>
              <SelectItem value="wedding_reminder">{t('filterAll')}</SelectItem>
              <SelectItem value="rsvp_confirmation">{t('filterAll')}</SelectItem>
              <SelectItem value="payment_reminder">{t('filterAll')}</SelectItem>
              <SelectItem value="payment_receipt">{t('filterAll')}</SelectItem>
              <SelectItem value="vendor_communication">{t('filterAll')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredLogs && filteredLogs.length > 0 ? (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.recipient')}</TableHead>
                    <TableHead>{t('table.subject')}</TableHead>
                    <TableHead>{t('table.template')}</TableHead>
                    <TableHead>{t('table.status')}</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>{t('table.sentAt')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.recipient_name || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">{log.recipient_email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{log.subject}</TableCell>
                      <TableCell>{getEmailTypeLabel(log.email_type)}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="uppercase">{log.locale}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.sent_at
                          ? formatDistanceToNow(new Date(log.sent_at), { addSuffix: true })
                          : 'Not sent'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {t('pagination.showing', {
                  start: page * pageSize + 1,
                  end: Math.min((page + 1) * pageSize, data?.total || 0),
                  total: data?.total || 0
                })}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 0}>
                  {t('pagination.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={!data?.hasMore}
                >
                  {t('pagination.next')}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('empty')}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {search || statusFilter !== 'all' || typeFilter !== 'all'
                ? t('empty')
                : t('empty')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
