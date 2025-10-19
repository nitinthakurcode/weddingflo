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
      textColor: '#1e1b4b', // Indigo-950
      bgColor: '#e0e7ff', // Indigo-100
      iconBgStyle: { background: 'linear-gradient(to bottom right, #4f46e5, #6366f1)' }, // Indigo gradient
      borderColor: '#a5b4fc', // Indigo-300
      filter: 'all',
    },
    {
      title: 'Pending Review',
      value: stats.review,
      icon: Clock,
      description: `${stats.pending} not started`,
      textColor: '#500724', // Pink-950
      bgColor: '#fce7f3', // Pink-100
      iconBgStyle: { background: 'linear-gradient(to bottom right, #db2777, #ec4899)' }, // Pink gradient
      borderColor: '#fbcfe8', // Pink-200
      filter: 'review',
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      description: `${stats.approved} approved`,
      textColor: '#064e3b', // Emerald-900
      bgColor: '#d1fae5', // Emerald-100
      iconBgStyle: { background: 'linear-gradient(to bottom right, #10b981, #059669)' }, // Emerald gradient
      borderColor: '#a7f3d0', // Emerald-200
      filter: 'completed',
    },
    {
      title: 'Overdue',
      value: stats.overdue,
      icon: AlertCircle,
      description: `${stats.cancelled} cancelled`,
      textColor: '#7f1d1d', // Rose-900
      bgColor: '#ffe4e6', // Rose-100
      iconBgStyle: { background: 'linear-gradient(to bottom right, #dc2626, #ea580c)' }, // Red-Orange gradient
      borderColor: '#fecaca', // Rose-200
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
            className={`overflow-hidden border-2 backdrop-blur-sm shadow-lg hover:shadow-2xl ${
              onFilterChange && stat.filter
                ? "cursor-pointer transition-all hover:scale-[1.03] hover:-translate-y-1 active:scale-100 touch-manipulation select-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                : "opacity-90"
            }`}
            style={{
              backgroundColor: stat.bgColor,
              borderColor: stat.borderColor,
            }}
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
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                {stat.title}
                {onFilterChange && stat.filter && (
                  <Filter className="h-3 w-3 text-primary animate-pulse" />
                )}
              </CardTitle>
              <div className="p-2.5 rounded-xl shadow-lg shadow-black/20" style={stat.iconBgStyle}>
                <Icon className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pointer-events-none">
              <div className="text-3xl font-bold tracking-tight" style={{ color: stat.textColor }}>
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
