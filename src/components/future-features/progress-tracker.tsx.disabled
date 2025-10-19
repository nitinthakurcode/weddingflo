'use client';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ProgressTrackerProps {
  progress: number;
  className?: string;
  showLabel?: boolean;
}

export function ProgressTracker({
  progress,
  className,
  showLabel = true,
}: ProgressTrackerProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const getProgressColor = (value: number) => {
    if (value === 100) return 'bg-green-500';
    if (value >= 75) return 'bg-blue-500';
    if (value >= 50) return 'bg-yellow-500';
    if (value >= 25) return 'bg-orange-500';
    return 'bg-gray-400';
  };

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between">
        {showLabel && (
          <span className="text-xs text-muted-foreground">Progress</span>
        )}
        <span className="text-xs font-medium">{clampedProgress}%</span>
      </div>
      <Progress
        value={clampedProgress}
        className="h-2"
        indicatorClassName={getProgressColor(clampedProgress)}
      />
    </div>
  );
}
