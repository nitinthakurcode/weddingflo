# Usage Enforcement Examples

This document provides practical examples of how to enforce subscription limits in your components.

## Using the useSubscription Hook

### Basic Setup

```typescript
import { useSubscription } from '@/lib/hooks/use-subscription';
import { useToast } from '@/hooks/use-toast';

function MyComponent() {
  const companyId = user?.publicMetadata?.companyId as string;
  const { canAddGuest, getGuestLimitMessage } = useSubscription(companyId);
  const { toast } = useToast();

  const handleAddGuest = () => {
    if (!canAddGuest()) {
      toast({
        title: 'Guest Limit Reached',
        description: getGuestLimitMessage(),
        variant: 'destructive',
      });
      return;
    }

    // Proceed with adding guest
    createGuest();
  };
}
```

## Example 1: Guest Creation with Limit Check

```typescript
'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useSubscription } from '@/lib/hooks/use-subscription';
import { UpgradePrompt } from '@/components/limits/upgrade-prompt';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function AddGuestButton() {
  const { user } = useUser();
  const { toast } = useToast();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const companyId = user?.publicMetadata?.companyId as string;
  const { canAddGuest, getGuestLimitMessage, usage } = useSubscription(companyId);

  const createGuest = useMutation(api.guests.create);

  const handleAddGuest = async () => {
    // Check limit before creating
    if (!canAddGuest()) {
      setShowUpgradePrompt(true);
      toast({
        title: 'Guest Limit Reached',
        description: getGuestLimitMessage(),
        variant: 'destructive',
      });
      return;
    }

    try {
      await createGuest({
        company_id: companyId,
        client_id: 'your_client_id',
        guest_name: 'John Doe',
        // ... other fields
      });

      toast({
        title: 'Success',
        description: 'Guest added successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add guest',
        variant: 'destructive',
      });
    }
  };

  return (
    <div>
      {showUpgradePrompt && (
        <UpgradePrompt
          title="Guest Limit Reached"
          message={getGuestLimitMessage() || 'Upgrade to add more guests'}
          resourceType="guests"
        />
      )}
      <Button onClick={handleAddGuest}>
        Add Guest ({usage?.guestsCount || 0})
      </Button>
    </div>
  );
}
```

## Example 2: Bulk Import with Limit Check

```typescript
'use client';

import { useSubscription } from '@/lib/hooks/use-subscription';
import { useToast } from '@/hooks/use-toast';

export function BulkImportGuests() {
  const companyId = user?.publicMetadata?.companyId as string;
  const { checker, usage } = useSubscription(companyId);
  const { toast } = useToast();

  const handleBulkImport = (guests: any[]) => {
    if (!checker) return;

    // Check if we can add all guests
    const limitCheck = checker.checkGuestLimit(guests.length);

    if (!limitCheck.allowed) {
      const remaining = limitCheck.limit - (usage?.guestsCount || 0);

      toast({
        title: 'Import Limit Exceeded',
        description: `You can only import ${remaining} more guests. ${limitCheck.message}`,
        variant: 'destructive',
      });
      return;
    }

    // Proceed with import
    bulkCreateGuests(guests);
  };
}
```

## Example 3: Proactive Warning Before Limit

```typescript
'use client';

import { useSubscription } from '@/lib/hooks/use-subscription';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function UsageWarning() {
  const companyId = user?.publicMetadata?.companyId as string;
  const { checker, usage } = useSubscription(companyId);

  if (!checker || !usage) return null;

  const guestPercentage = checker.getUsagePercentage('guests');

  // Show warning at 80% usage
  if (guestPercentage >= 80 && guestPercentage < 100) {
    return (
      <Alert>
        <AlertDescription>
          You've used {guestPercentage}% of your guest limit.
          Consider upgrading soon to avoid disruptions.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
```

## Example 4: Event Creation Check

```typescript
'use client';

import { useSubscription } from '@/lib/hooks/use-subscription';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Link from 'next/link';

export function CreateEventDialog({ open, onOpenChange }) {
  const companyId = user?.publicMetadata?.companyId as string;
  const { canAddEvent, getEventLimitMessage } = useSubscription(companyId);

  if (!canAddEvent()) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event Limit Reached</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>{getEventLimitMessage()}</p>
            <Link href="/settings/billing">
              <Button>View Plans</Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Normal event creation form */}
    </Dialog>
  );
}
```

## Example 5: Team Member Invitation

```typescript
'use client';

import { useSubscription } from '@/lib/hooks/use-subscription';

export function InviteTeamMember() {
  const companyId = user?.publicMetadata?.companyId as string;
  const { canAddUser, usage, checker } = useSubscription(companyId);

  const handleInvite = (email: string) => {
    if (!canAddUser()) {
      const limits = checker?.getAllLimits();

      toast({
        title: 'User Limit Reached',
        description: `Your ${limits?.planName} plan allows ${limits?.users.limit} users. Upgrade to add more.`,
        variant: 'destructive',
      });
      return;
    }

    // Send invitation
    sendInvite(email);
  };
}
```

## Example 6: Dashboard Usage Display

```typescript
'use client';

import { useSubscription } from '@/lib/hooks/use-subscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export function DashboardUsageCard() {
  const companyId = user?.publicMetadata?.companyId as string;
  const { checker, usage, subscription } = useSubscription(companyId);

  if (!checker || !usage || !subscription) return null;

  const limits = checker.getAllLimits();
  const guestPercentage = checker.getUsagePercentage('guests');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan Usage - {limits.planName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span>Guests</span>
              <span>
                {usage.guestsCount} / {limits.guests.limit === -1 ? '∞' : limits.guests.limit}
              </span>
            </div>
            <Progress value={guestPercentage} />
          </div>

          {guestPercentage >= 90 && (
            <Link href="/settings/billing">
              <Button variant="outline" size="sm" className="w-full">
                Upgrade Plan
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

## Example 7: Server-Side Limit Check (API Route)

```typescript
// app/api/guests/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { UsageChecker } from '@/lib/limits/usage-checker';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { companyId, guestData } = await req.json();

  // Get subscription and usage
  const subscription = await convex.query(api.billing.getCurrentSubscription, { companyId });
  const usage = await convex.query(api.billing.getUsageStats, { companyId });

  // Check limits
  const checker = new UsageChecker(subscription.tier, {
    guestsCount: usage.guestsCount,
    eventsCount: usage.eventsCount,
    usersCount: usage.usersCount,
  });

  const limitCheck = checker.checkGuestLimit(1);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: limitCheck.message, upgrade: true },
      { status: 403 }
    );
  }

  // Proceed with guest creation
  // ...
}
```

## Best Practices

1. **Always check limits BEFORE creating resources**
   ```typescript
   if (!canAddGuest()) return; // Stop early
   createGuest(); // Only run if allowed
   ```

2. **Provide clear upgrade paths**
   ```typescript
   <Link href="/settings/billing">
     <Button>Upgrade Plan</Button>
   </Link>
   ```

3. **Show usage warnings proactively (at 80-90%)**
   ```typescript
   if (guestPercentage >= 80) {
     showWarning('Approaching guest limit');
   }
   ```

4. **Handle edge cases gracefully**
   ```typescript
   if (!checker || !usage) {
     // Loading state or skip check
     return null;
   }
   ```

5. **Use server-side validation for security**
   - Always validate limits on both client and server
   - Don't trust client-side checks alone

6. **Provide helpful error messages**
   ```typescript
   toast({
     title: 'Limit Reached',
     description: 'Your Starter plan allows 100 guests. Upgrade to Professional for 1,000 guests.',
   });
   ```

## Testing Limits

### Test reaching guest limit:
1. Create a test company with Starter plan (100 guest limit)
2. Try to create 101st guest
3. Verify upgrade prompt appears
4. Verify creation is blocked

### Test unlimited plan:
1. Upgrade to Enterprise plan
2. Create many guests (>1000)
3. Verify no limits enforced
