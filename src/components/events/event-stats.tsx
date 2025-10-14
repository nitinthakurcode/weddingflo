'use client';

import { EventStats as EventStatsType } from '@/types/event';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CalendarCheck, Users, DollarSign, TrendingUp, Filter } from 'lucide-react';

interface EventStatsProps {
  stats: EventStatsType;
  onFilterChange?: (filter: string | null) => void;
}

export function EventStats({ stats, onFilterChange }: EventStatsProps) {
  const statsData = [
    {
      title: 'Total Events',
      value: stats.total,
      icon: Calendar,
      description: 'All events',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      filter: 'all',
    },
    {
      title: 'Upcoming',
      value: stats.upcoming,
      icon: TrendingUp,
      description: 'Events coming up',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      filter: 'upcoming',
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: CalendarCheck,
      description: 'Events finished',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      filter: 'completed',
    },
    {
      title: 'Total Guests',
      value: stats.total_guests.toLocaleString(),
      icon: Users,
      description: 'Across all events',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      filter: 'all',
    },
    {
      title: 'Total Budget',
      value: `$${stats.total_budget.toLocaleString()}`,
      icon: DollarSign,
      description: 'Allocated budget',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      filter: 'all',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {statsData.map((stat) => (
        <Card
          key={stat.title}
          className={onFilterChange && stat.filter
            ? "cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] active:scale-100 active:shadow-sm touch-manipulation select-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            : "opacity-75 border-dashed"}
          onClick={(e) => {
            if (onFilterChange && stat.filter) {
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
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent className="pointer-events-none">
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
