'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ClipboardList } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function MyTasksPage() {
  const t = useTranslations('tasks');

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('myTasks')}</h2>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Coming Soon */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-1">{t('noTasks')}</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Task management is coming soon. You'll be able to track your to-dos across all clients.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
