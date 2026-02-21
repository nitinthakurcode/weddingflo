'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { FileSignature, CheckCircle2, Clock, AlertCircle, Send, X, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Document {
  id: string;
  clientId: string;
  name: string;
  url: string | null;
  type: string | null;
  size: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SignatureTrackerProps {
  documents: Document[];
  stats?: {
    pending: number;
    signed: number;
    expired: number;
    rejected: number;
  };
  onRequestSignature?: (documentId: string, signerEmail: string, signerName: string, expiresInDays: number) => void;
  onSendReminder?: (documentId: string) => void;
  onCancelRequest?: (documentId: string) => void;
  onSignDocument?: (documentId: string, signatureDataUrl: string, signedAt: string) => void;
  isLoading?: boolean;
}

export function SignatureTracker({
  documents = [],
  stats,
  onRequestSignature,
  onSendReminder,
  onCancelRequest,
  onSignDocument,
  isLoading = false,
}: SignatureTrackerProps) {
  const t = useTranslations('documents');

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            <CardTitle className="text-lg">{t('signatureTracking')}</CardTitle>
          </div>
          {stats && (
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
        {documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileSignature className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('noSignatureRequests')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {doc.type || 'Document'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {doc.type || 'Document'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
