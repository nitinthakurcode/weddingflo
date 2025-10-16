'use client';

import { EventActivity } from '@/types/eventFlow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, GitBranch } from 'lucide-react';

interface DependencyGraphProps {
  activities: EventActivity[];
}

export function DependencyGraph({ activities }: DependencyGraphProps) {
  // Filter activities that have dependencies
  const activitiesWithDeps = activities.filter((a) => a.depends_on.length > 0);

  if (activitiesWithDeps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Activity Dependencies
          </CardTitle>
          <CardDescription>
            Visual representation of activity dependencies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <GitBranch className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm">No dependencies configured</p>
            <p className="text-xs text-gray-400 mt-1">
              Add dependencies to activities to see them here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Activity Dependencies
        </CardTitle>
        <CardDescription>
          Shows relationships between activities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {activitiesWithDeps.map((activity) => (
            <div key={activity._id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    {activity.activity}
                  </h4>

                  <div className="space-y-3">
                    {activity.depends_on.map((depId, index) => {
                      const dependentActivity = activities.find((a) => a._id === depId);

                      return (
                        <div
                          key={`${depId}-${index}`}
                          className="flex items-center gap-3"
                        >
                          <Badge className="bg-blue-100 text-blue-800">
                            Depends on
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                          <div className="flex-1 bg-white rounded-lg border p-3">
                            <p className="text-sm font-medium text-gray-900">
                              {dependentActivity?.activity || 'Unknown Activity'}
                            </p>
                            {dependentActivity && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {dependentActivity.start_time} -{' '}
                                {dependentActivity.end_time}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
