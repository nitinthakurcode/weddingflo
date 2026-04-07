'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { FileSignature, CheckCircle2, Clock, AlertCircle, Send, X, Eye } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { trpc } from '@/lib/trpc/client';

interface SignatureTrackerProps {
  clientId: string;
  onSendReminder?: (requestId: string) => void;
  onCancelRequest?: (requestId: string) => void;
}

export function SignatureTracker({
  clientId,
  onSendReminder,
  onCancelRequest,
}: SignatureTrackerProps) {
  const t = useTranslations('documents');

  const { data: stats, isLoading: statsLoading } = trpc.documents.getSignatureStats.useQuery({ clientId });
  const { data: requests, isLoading: requestsLoading } = trpc.documents.getSignatureRequests.useQuery({ clientId });

  const isLoading = statsLoading || requestsLoading;

  const total = stats
    ? stats.pending + stats.signed + stats.expired + stats.rejected
    : 0;
  const signedPercentage = total > 0
    ? Math.round((stats?.signed || 0) / total * 100)
    : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            <CardTitle className="text-lg">{t('signatureTracking')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'signed':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />Signed</Badge>;
      case 'pending':
      case 'sent':
      case 'viewed':
        return <Badge className="bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'declined':
        return <Badge className="bg-red-100 text-red-700"><X className="w-3 h-3 mr-1" />Declined</Badge>;
      case 'expired':
        return <Badge className="bg-gray-100 text-gray-700"><AlertCircle className="w-3 h-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            <CardTitle className="text-lg">{t('signatureTracking')}</CardTitle>
          </div>
          {stats && total > 0 && (
            <div className="flex gap-4 text-sm">
              <span className="text-amber-600">{stats.pending} pending</span>
              <span className="text-green-600">{stats.signed} signed</span>
              <span className="text-red-600">{stats.expired} expired</span>
            </div>
          )}
        </div>
        {total > 0 && (
          <Progress value={signedPercentage} className="h-2 mt-2" />
        )}
      </CardHeader>
      <CardContent>
        {(!requests || requests.length === 0) ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileSignature className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('noSignatureRequests')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-lg border space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{req.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {req.document?.name || 'Document'}
                    </p>
                  </div>
                  {getStatusBadge(req.status)}
                </div>

                {/* Signers */}
                <div className="space-y-2">
                  {req.signers.map((signer) => (
                    <div key={signer.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>{signer.name}</span>
                        <span className="text-muted-foreground">({signer.email})</span>
                        {signer.role && (
                          <Badge variant="outline" className="text-xs">{signer.role}</Badge>
                        )}
                      </div>
                      {getStatusBadge(signer.status)}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                {(req.status === 'pending' || req.status === 'partially_signed') && (
                  <div className="flex gap-2 pt-2 border-t">
                    {onSendReminder && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSendReminder(req.id)}
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Remind
                      </Button>
                    )}
                    {onCancelRequest && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCancelRequest(req.id)}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
