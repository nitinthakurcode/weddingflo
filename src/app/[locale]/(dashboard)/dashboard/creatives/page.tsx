'use client';

import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Palette, Image, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function CreativesPage() {
  const t = useTranslations('creatives');

  // Get all clients to show their creative stats
  const { data: clients, isLoading } = trpc.clients.list.useQuery({});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('creativesManagement')}</h2>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Client Creative Overview */}
      {clients && clients.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => {
            const clientName =
              client.weddingName ||
              `${client.partner1FirstName} & ${client.partner2FirstName || ''}`;

            return (
              <Card key={client.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{clientName}</CardTitle>
                  <CardDescription className="flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5" />
                    Creative requests & deliverables
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Badge variant="secondary" className="text-[10px]">
                    {client.status || 'active'}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Palette className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No creatives yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Creative requests will appear here when you add them to client projects.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
