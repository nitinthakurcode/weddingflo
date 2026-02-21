'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';

interface GuestRsvpFunnelProps {
  dateRange?: { from: Date; to: Date };
  data?: { invited: number; responded: number; confirmed: number; declined: number };
}

export function GuestRsvpFunnel({ dateRange, data }: GuestRsvpFunnelProps) {
  const t = useTranslations('analytics');

  const hasData = data && data.invited > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t('guestRsvpFunnel')}</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="h-[200px] space-y-3 py-4">
            <FunnelBar label="Invited" value={data.invited} max={data.invited} />
            <FunnelBar label="Responded" value={data.responded} max={data.invited} />
            <FunnelBar label="Confirmed" value={data.confirmed} max={data.invited} />
            <FunnelBar label="Declined" value={data.declined} max={data.invited} color="rose" />
          </div>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
            <Users className="h-8 w-8 mb-2" />
            <p className="text-sm">No guest data available</p>
            <p className="text-xs mt-1">Add guests to see RSVP funnel</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FunnelBar({ label, value, max, color = 'primary' }: { label: string; value: number; max: number; color?: string }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const bgColor = color === 'rose' ? 'bg-rose-500' : 'bg-primary';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary">
        <div className={`h-2 rounded-full ${bgColor}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
