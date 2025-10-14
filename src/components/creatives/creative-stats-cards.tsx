'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreativeStats } from '@/types/creative';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
} from 'lucide-react';

interface CreativeStatsCardsProps {
  stats: CreativeStats;
  isLoading?: boolean;
  onFilterChange?: (filter: string | null) => void;
}

export function CreativeStatsCards({ stats, isLoading, onFilterChange }: CreativeStatsCardsProps) {
  const statsData = [
    {
      title: 'Total Projects',
      value: stats.total,
      icon: FileText,
      description: `${stats.in_progress} in progress`,
      color: 'text-blue-600',
      filter: 'all',
    },
    {
      title: 'Pending Review',
      value: stats.review,
      icon: Clock,
      description: `${stats.pending} not started`,
      color: 'text-orange-600',
      filter: 'review',
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      description: `${stats.approved} approved`,
      color: 'text-green-600',
      filter: 'completed',
    },
    {
      title: 'Overdue',
      value: stats.overdue,
      icon: AlertCircle,
      description: `${stats.cancelled} cancelled`,
      color: 'text-red-600',
      filter: 'overdue',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsData.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.title}
            className={onFilterChange && stat.filter
              ? "cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] active:scale-100 active:shadow-sm touch-manipulation select-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              : "opacity-75 border-dashed"}
            onClick={(e) => {
              if (stat.filter && onFilterChange) {
                e.stopPropagation();
                onFilterChange(stat.filter);
              }
            }}
            role={onFilterChange && stat.filter ? "button" : undefined}
            tabIndex={onFilterChange && stat.filter ? 0 : undefined}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && stat.filter && onFilterChange) {
                e.preventDefault();
                onFilterChange(stat.filter);
              }
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pointer-events-none">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                {stat.title}
                {onFilterChange && stat.filter && (
                  <Filter className="h-3 w-3 text-blue-500" />
                )}
              </CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent className="pointer-events-none">
              <div className="text-2xl font-bold">
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
