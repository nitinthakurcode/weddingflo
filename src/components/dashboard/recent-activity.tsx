import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import {
  UserPlus,
  DollarSign,
  Calendar,
  Users,
  FileText,
  Check,
  AlertCircle,
} from 'lucide-react';

interface ActivityItem {
  _id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: number;
  user_id: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

const getActivityIcon = (entityType: string, action: string) => {
  if (entityType === 'guests') return UserPlus;
  if (entityType === 'event_budget') return DollarSign;
  if (entityType === 'vendors') return Users;
  if (entityType === 'event_brief' || entityType === 'event_flow') return Calendar;
  if (entityType === 'creatives') return FileText;
  if (action.includes('complete')) return Check;
  return AlertCircle;
};

const getActivityColor = (action: string) => {
  if (action.includes('create')) return 'text-green-600 bg-green-100';
  if (action.includes('update')) return 'text-blue-600 bg-blue-100';
  if (action.includes('delete')) return 'text-red-600 bg-red-100';
  if (action.includes('complete')) return 'text-purple-600 bg-purple-100';
  return 'text-gray-600 bg-gray-100';
};

const formatActivityMessage = (activity: ActivityItem) => {
  const entityName = activity.entity_type.replace('_', ' ');
  return `${activity.action} ${entityName}`;
};

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No recent activity
            </p>
          ) : (
            activities.map((activity) => {
              const Icon = getActivityIcon(activity.entity_type, activity.action);
              const colorClass = getActivityColor(activity.action);

              return (
                <div key={activity._id} className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">
                      {formatActivityMessage(activity)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(activity.created_at, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
