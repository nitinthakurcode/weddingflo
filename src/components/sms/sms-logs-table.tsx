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
import { Loader2, Search, Filter, MessageSquare, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { SmsLog } from '@/types/sms';

export function SmsLogsTable() {
  const t = useTranslations('smsLogs');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading } = trpc.sms.getSmsLogs.useQuery({
    limit: pageSize,
    offset: page * pageSize,
    status: statusFilter === 'all' ? undefined : statusFilter as any,
    smsType: typeFilter === 'all' ? undefined : typeFilter as any,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-100">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {t(`status.${status}`)}
          </Badge>
        );
      case 'failed':
      case 'undelivered':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            {t(`status.${status}`)}
          </Badge>
        );
      case 'pending':
      case 'queued':
      case 'sending':
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            {t(`status.${status}`)}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSmsTypeLabel = (type: string) => {
    const key = type.replace(/_/g, '').replace(/([A-Z])/g, (match, p1, offset) =>
      offset === 0 ? p1.toLowerCase() : p1.toLowerCase()
    );

    const mappedKey = type === 'wedding_reminder' ? 'weddingReminder' :
                      type === 'rsvp_confirmation' ? 'rsvpConfirmation' :
                      type === 'payment_reminder' ? 'paymentReminder' :
                      type === 'payment_received' ? 'paymentReceived' :
                      type === 'vendor_notification' ? 'vendorNotification' :
                      type === 'event_update' ? 'eventUpdate' : 'general';

    return t(`types.${mappedKey}`);
  };

  const filteredLogs = (data?.logs as SmsLog[] | undefined)?.filter((log) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      log.recipient_phone.toLowerCase().includes(searchLower) ||
      log.recipient_name?.toLowerCase().includes(searchLower) ||
      log.message_body.toLowerCase().includes(searchLower)
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
              <SelectValue placeholder={t('filters.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allStatus')}</SelectItem>
              <SelectItem value="sent">{t('status.sent')}</SelectItem>
              <SelectItem value="delivered">{t('status.delivered')}</SelectItem>
              <SelectItem value="failed">{t('status.failed')}</SelectItem>
              <SelectItem value="undelivered">{t('status.undelivered')}</SelectItem>
              <SelectItem value="pending">{t('status.pending')}</SelectItem>
              <SelectItem value="queued">{t('status.queued')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <MessageSquare className="mr-2 h-4 w-4" />
              <SelectValue placeholder={t('filters.type')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allTypes')}</SelectItem>
              <SelectItem value="wedding_reminder">{t('types.weddingReminder')}</SelectItem>
              <SelectItem value="rsvp_confirmation">{t('types.rsvpConfirmation')}</SelectItem>
              <SelectItem value="payment_reminder">{t('types.paymentReminder')}</SelectItem>
              <SelectItem value="payment_received">{t('types.paymentReceived')}</SelectItem>
              <SelectItem value="vendor_notification">{t('types.vendorNotification')}</SelectItem>
              <SelectItem value="event_update">{t('types.eventUpdate')}</SelectItem>
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
                    <TableHead>{t('table.message')}</TableHead>
                    <TableHead>{t('table.type')}</TableHead>
                    <TableHead>{t('table.status')}</TableHead>
                    <TableHead>{t('table.segments')}</TableHead>
                    <TableHead>{t('table.language')}</TableHead>
                    <TableHead>{t('table.sent')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.recipient_name || t('table.unknown')}</div>
                          <div className="text-sm text-muted-foreground">{log.recipient_phone}</div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{log.message_body}</TableCell>
                      <TableCell>{getSmsTypeLabel(log.sms_type)}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>{log.segments}</TableCell>
                      <TableCell className="uppercase">{log.locale}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.sent_at
                          ? formatDistanceToNow(new Date(log.sent_at), { addSuffix: true })
                          : t('table.notSent')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {t('pagination.showing')} {page * pageSize + 1} {t('pagination.to')} {Math.min((page + 1) * pageSize, data?.total || 0)} {t('pagination.of')}{' '}
                {data?.total || 0} {t('pagination.messages')}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                >
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
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('empty.title')}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {search || statusFilter !== 'all' || typeFilter !== 'all'
                ? t('empty.description')
                : t('empty.noSmsYet')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
