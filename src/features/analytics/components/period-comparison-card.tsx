'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PeriodComparisonCardProps {
  title: string;
  currentValue: number;
  previousValue: number;
  format?: 'number' | 'currency' | 'percentage';
  dateRange?: { from: Date; to: Date };
}

export function PeriodComparisonCard({
  title,
  currentValue,
  previousValue,
  format = 'number',
}: PeriodComparisonCardProps) {
  const t = useTranslations('analytics');

  const percentChange = previousValue > 0
    ? ((currentValue - previousValue) / previousValue) * 100
    : 0;
  const isPositive = percentChange >= 0;

  const formatValue = (value: number) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(value / 100);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return value.toLocaleString();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(currentValue)}</div>
        <div className="flex items-center gap-1 text-sm">
          {isPositive ? (
            <ArrowUpIcon className="h-4 w-4 text-green-600" />
          ) : (
            <ArrowDownIcon className="h-4 w-4 text-red-600" />
          )}
          <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
            {Math.abs(percentChange).toFixed(1)}%
          </span>
          <span className="text-muted-foreground">{t('vsPreviousPeriod')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
