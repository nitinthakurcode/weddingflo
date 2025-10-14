'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SeatingAssignment } from '@/lib/ai/seating-optimizer';

interface SeatingChartViewProps {
  assignments: SeatingAssignment[];
  guests: any[];
}

export function SeatingChartView({ assignments, guests }: SeatingChartViewProps) {
  const getGuestName = (guestId: string) => {
    const guest = guests.find(g => g.id === guestId);
    return guest?.name || guestId;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {assignments.map((assignment) => (
        <Card key={assignment.tableId}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{assignment.tableName}</CardTitle>
              <Badge variant={assignment.compatibilityScore >= 80 ? 'default' : 'secondary'}>
                {assignment.compatibilityScore}% match
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground font-medium">
                Guests ({assignment.guests.length}):
              </p>
              <ul className="text-sm space-y-1">
                {assignment.guests.map((guestId) => (
                  <li key={guestId} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {getGuestName(guestId)}
                  </li>
                ))}
              </ul>
              {assignment.reasoning && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground italic">
                    {assignment.reasoning}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
