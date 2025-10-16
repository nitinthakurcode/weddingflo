'use client';

import { Conflict } from '@/types/eventFlow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ConflictListProps {
  conflicts: Conflict[];
}

const severityConfig = {
  high: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    badgeClass: 'bg-red-600 text-white',
  },
  medium: {
    icon: AlertCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    badgeClass: 'bg-orange-500 text-white',
  },
  low: {
    icon: Info,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    badgeClass: 'bg-yellow-500 text-white',
  },
};

const conflictTypeLabels: Record<string, string> = {
  time_overlap: 'Time Overlap',
  vendor_double_booking: 'Vendor Double-Booking',
  location_conflict: 'Location Conflict',
  dependency_violation: 'Dependency Violation',
};

export function ConflictList({ conflicts }: ConflictListProps) {
  if (conflicts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Info className="h-12 w-12 mx-auto mb-3 text-green-500" />
        <p className="text-lg font-medium text-gray-900">No Conflicts Found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Your timeline is conflict-free!
        </p>
      </div>
    );
  }

  // Group conflicts by severity
  const conflictsBySeverity = {
    high: conflicts.filter((c) => c.severity === 'high'),
    medium: conflicts.filter((c) => c.severity === 'medium'),
    low: conflicts.filter((c) => c.severity === 'low'),
  };

  return (
    <div className="space-y-6">
      {Object.entries(conflictsBySeverity).map(
        ([severity, severityConflicts]) =>
          severityConflicts.length > 0 && (
            <div key={severity}>
              <div className="flex items-center gap-2 mb-4">
                <Badge className={severityConfig[severity as keyof typeof severityConfig].badgeClass}>
                  {severity.toUpperCase()} PRIORITY
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {severityConflicts.length} conflict{severityConflicts.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-4">
                {severityConflicts.map((conflict) => {
                  const config = severityConfig[conflict.severity];
                  const Icon = config.icon;

                  return (
                    <Card key={conflict.id}>
                      <CardHeader className={`${config.bgColor} border-b`}>
                        <div className="flex items-start gap-3">
                          <Icon className={`h-5 w-5 ${config.color} flex-shrink-0 mt-0.5`} />
                          <div className="flex-1">
                            <CardTitle className="text-base flex items-center gap-2">
                              {conflictTypeLabels[conflict.type]}
                            </CardTitle>
                            <CardDescription className="text-gray-900 mt-1">
                              {conflict.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Affected Activities:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {conflict.affected_activities.map((activityId) => (
                                <Badge key={activityId} variant="outline">
                                  Activity {activityId.substring(0, 8)}...
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {conflict.suggested_resolution && (
                            <>
                              <Separator />
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <p className="text-sm font-medium text-blue-900 mb-1">
                                  Suggested Resolution:
                                </p>
                                <p className="text-sm text-blue-800">
                                  {conflict.suggested_resolution}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )
      )}
    </div>
  );
}
