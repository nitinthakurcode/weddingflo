'use client';

import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function OnboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleOnboard = async () => {
    if (!user) {
      setError('No user found. Please sign in again.');
      return;
    }

    setLoading(true);
    setError(null);

    console.log('Starting onboard with user:', {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress,
      name: user.fullName || user.firstName,
    });

    try {
      const response = await fetch('/api/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress || '',
          name: user.fullName || user.firstName || 'User',
          avatarUrl: user.imageUrl,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to onboard');
      }

      console.log('Onboard successful! User ID:', result.userId);
      setSuccess(true);

      setTimeout(() => {
        router.push('/dashboard/guests');
      }, 2000);
    } catch (err: any) {
      console.error('Onboard error:', err);

      if (err.message && err.message.includes('already exists')) {
        console.log('User already exists, redirecting...');
        setSuccess(true);
        setTimeout(() => {
          router.push('/dashboard/guests');
        }, 2000);
      } else {
        setError(`Failed to onboard: ${err.message || JSON.stringify(err)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-green-600">Success!</CardTitle>
            <CardDescription>
              Your account has been set up. Redirecting to dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete Your Setup</CardTitle>
          <CardDescription>
            Click the button below to complete your account setup and create your company profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              <strong>Email:</strong> {user.primaryEmailAddress?.emailAddress}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Name:</strong> {user.fullName || user.firstName || 'User'}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button
            onClick={handleOnboard}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Setting up...' : 'Complete Setup'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
