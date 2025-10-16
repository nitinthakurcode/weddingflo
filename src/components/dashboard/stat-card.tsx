import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: number;
  changeLabel?: string;
  iconColor?: string;
  iconBgColor?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  change,
  changeLabel,
  iconColor = 'text-primary-600',
  iconBgColor = 'bg-primary-100',
}: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <Card>
      <CardContent className="p-3 sm:p-4 md:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2 break-words">{value}</h3>
            {change !== undefined && (
              <div className="flex items-center gap-1 mt-1 sm:mt-2">
                <span
                  className={cn(
                    'text-xs sm:text-sm font-medium',
                    isPositive ? 'text-emerald-600' : 'text-rose-600'
                  )}
                >
                  {isPositive ? '+' : ''}
                  {change}%
                </span>
                {changeLabel && (
                  <span className="text-xs sm:text-sm text-muted-foreground truncate">{changeLabel}</span>
                )}
              </div>
            )}
          </div>
          <div className={cn('p-2 sm:p-3 rounded-full flex-shrink-0', iconBgColor)}>
            <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
