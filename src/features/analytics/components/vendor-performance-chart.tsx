'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { Store, Star } from 'lucide-react';

interface VendorPerformanceChartProps {
  dateRange?: { from: Date; to: Date };
  data?: Array<{ name: string; rating: number; bookings: number }>;
}

export function VendorPerformanceChart({ dateRange, data }: VendorPerformanceChartProps) {
  const t = useTranslations('analytics');

  const hasData = data && data.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t('vendorPerformance')}</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="h-[200px] overflow-y-auto space-y-3 py-2">
            {data.map((vendor, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{vendor.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-gold-500 fill-gold-500" />
                    <span className="text-xs">{vendor.rating.toFixed(1)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{vendor.bookings} bookings</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
            <Store className="h-8 w-8 mb-2" />
            <p className="text-sm">No vendor data available</p>
            <p className="text-xs mt-1">Add vendors to track performance</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
