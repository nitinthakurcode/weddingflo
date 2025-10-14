'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { STRIPE_CONFIG } from '@/lib/stripe/config';

export function TestModeBanner() {
  if (!STRIPE_CONFIG.isTestMode) return null;

  return (
    <Alert className="border-yellow-500 bg-yellow-50">
      <AlertDescription className="text-sm text-yellow-800">
        <strong>Test Mode:</strong> You&apos;re in test mode. Use test card{' '}
        <code className="rounded bg-yellow-100 px-1">4242 4242 4242 4242</code> with any future
        expiry and CVC.
      </AlertDescription>
    </Alert>
  );
}
