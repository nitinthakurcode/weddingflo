'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { CheckSquare } from 'lucide-react';

interface TaskCompletionChartProps {
  dateRange?: { from: Date; to: Date };
  data?: { completed: number; total: number };
}

export function TaskCompletionChart({ dateRange, data }: TaskCompletionChartProps) {
  const t = useTranslations('analytics');

  const hasData = data && data.total > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t('taskCompletion')}</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="h-[200px] flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-primary">
              {Math.round((data.completed / data.total) * 100)}%
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {data.completed} of {data.total} tasks completed
            </p>
          </div>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
            <CheckSquare className="h-8 w-8 mb-2" />
            <p className="text-sm">No task data available</p>
            <p className="text-xs mt-1">Add tasks to see completion progress</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
