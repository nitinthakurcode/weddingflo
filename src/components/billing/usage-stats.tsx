'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { UsageChecker } from '@/lib/limits/usage-checker';
import { PlanTier } from '@/lib/stripe/plans';

interface UsageStatsProps {
  tier: PlanTier;
  guestsCount: number;
  eventsCount: number;
  usersCount: number;
}

export function UsageStats({ tier, guestsCount, eventsCount, usersCount }: UsageStatsProps) {
  const checker = new UsageChecker(tier, {
    guestsCount,
    eventsCount,
    usersCount,
  });

  const guestPercentage = checker.getUsagePercentage('guests');
  const eventPercentage = checker.getUsagePercentage('events');
  const userPercentage = checker.getUsagePercentage('users');

  const guestLimit = checker.checkGuestLimit(0);
  const eventLimit = checker.checkEventLimit(0);
  const userLimit = checker.checkUserLimit(0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Statistics</CardTitle>
        <CardDescription>Your current usage across all resources</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium">Guests</span>
            <span className="text-muted-foreground">
              {guestsCount} / {guestLimit.limit === -1 ? 'Unlimited' : guestLimit.limit}
            </span>
          </div>
          <Progress value={guestPercentage} className="h-2" />
        </div>

        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium">Events</span>
            <span className="text-muted-foreground">
              {eventsCount} / {eventLimit.limit === -1 ? 'Unlimited' : eventLimit.limit}
            </span>
          </div>
          <Progress value={eventPercentage} className="h-2" />
        </div>

        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium">Team Members</span>
            <span className="text-muted-foreground">
              {usersCount} / {userLimit.limit === -1 ? 'Unlimited' : userLimit.limit}
            </span>
          </div>
          <Progress value={userPercentage} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
