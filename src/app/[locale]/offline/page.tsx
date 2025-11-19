'use client';

import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <WifiOff className="mx-auto h-16 w-16 text-gray-400" />
        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          You're Offline
        </h1>
        <p className="mt-2 text-gray-600">
          Please check your internet connection and try again.
        </p>
        <Button
          onClick={() => window.location.reload()}
          className="mt-6"
        >
          Try Again
        </Button>
      </div>
    </div>
  );
}
