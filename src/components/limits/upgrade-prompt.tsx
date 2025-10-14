'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface UpgradePromptProps {
  title: string;
  message: string;
  resourceType: 'guests' | 'events' | 'users';
}

export function UpgradePrompt({ title, message, resourceType }: UpgradePromptProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2 flex flex-col gap-3">
        <p>{message}</p>
        <Link href="/settings/billing">
          <Button size="sm" variant="outline">
            Upgrade Plan
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
}
