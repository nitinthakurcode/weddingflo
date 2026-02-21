'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

interface BudgetVarianceChartProps {
  dateRange?: { from: Date; to: Date };
  data?: { planned: number; actual: number };
}

export function BudgetVarianceChart({ dateRange, data }: BudgetVarianceChartProps) {
  const t = useTranslations('analytics');

  const hasData = data && data.planned > 0;
  const variance = hasData ? ((data.actual - data.planned) / data.planned) * 100 : 0;
  const isOverBudget = variance > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t('budgetVariance')}</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="h-[200px] flex flex-col items-center justify-center">
            <div className={`text-4xl font-bold ${isOverBudget ? 'text-rose-600' : 'text-sage-600'}`}>
              {isOverBudget ? '+' : ''}{variance.toFixed(1)}%
            </div>
            <div className="flex items-center gap-1 mt-2">
              {isOverBudget ? (
                <TrendingUp className="h-4 w-4 text-rose-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-sage-600" />
              )}
              <p className="text-sm text-muted-foreground">
                {isOverBudget ? 'Over budget' : 'Under budget'}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ${data.actual.toLocaleString()} of ${data.planned.toLocaleString()} planned
            </p>
          </div>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
            <DollarSign className="h-8 w-8 mb-2" />
            <p className="text-sm">No budget data available</p>
            <p className="text-xs mt-1">Set a budget to track variance</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
