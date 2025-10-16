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
      textColor: '#1e1b4b', // Indigo-950
      bgColor: '#e0e7ff', // Indigo-100
      iconBgStyle: { background: 'linear-gradient(to bottom right, #4f46e5, #6366f1)' }, // Indigo gradient
      borderColor: '#a5b4fc', // Indigo-300
      filter: 'all',
    },
    {
      title: 'Upcoming',
      value: stats.upcoming,
      icon: TrendingUp,
      description: 'Events coming up',
      textColor: '#500724', // Pink-950
      bgColor: '#fce7f3', // Pink-100
      iconBgStyle: { background: 'linear-gradient(to bottom right, #db2777, #ec4899)' }, // Pink gradient
      borderColor: '#fbcfe8', // Pink-200
      filter: 'upcoming',
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: CalendarCheck,
      description: 'Events finished',
      textColor: '#064e3b', // Emerald-900
      bgColor: '#d1fae5', // Emerald-100
      iconBgStyle: { background: 'linear-gradient(to bottom right, #10b981, #059669)' }, // Emerald gradient
      borderColor: '#a7f3d0', // Emerald-200
      filter: 'completed',
    },
    {
      title: 'Total Guests',
      value: stats.total_guests.toLocaleString(),
      icon: Users,
      description: 'Across all events',
      textColor: '#78350f', // Amber-900
      bgColor: '#fef3c7', // Amber-100
      iconBgStyle: { background: 'linear-gradient(to bottom right, #d97706, #f59e0b)' }, // Amber gradient
      borderColor: '#fde68a', // Amber-200
      filter: 'all',
    },
    {
      title: 'Total Budget',
      value: `$${stats.total_budget.toLocaleString()}`,
      icon: DollarSign,
      description: 'Allocated budget',
      textColor: '#581c87', // Purple-900
      bgColor: '#f3e8ff', // Purple-100
      iconBgStyle: { background: 'linear-gradient(to bottom right, #9333ea, #a855f7)' }, // Purple gradient
      borderColor: '#e9d5ff', // Purple-200
      filter: 'all',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {statsData.map((stat) => (
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
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
              {stat.title}
              {onFilterChange && stat.filter && (
                <Filter className="h-3 w-3 text-primary animate-pulse" />
              )}
            </CardTitle>
            <div className="p-2.5 rounded-xl shadow-lg shadow-black/20" style={stat.iconBgStyle}>
              <stat.icon className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="pointer-events-none">
            <div className="text-3xl font-bold tracking-tight" style={{ color: stat.textColor }}>{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
