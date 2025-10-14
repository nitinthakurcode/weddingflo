'use client';

import { useUser } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageLoader } from '@/components/ui/loading-spinner';

export default function OnboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);

  // Check if user already exists
  const existingUser = useQuery(api.users.getCurrent);

  // Mutation to onboard user (doesn't require auth)
  const onboardUser = useMutation(api.users.onboardUser);

  useEffect(() => {
    async function handleOnboarding() {
      if (!isLoaded) return;

      if (!user) {
        router.push('/sign-in');
        return;
      }

      // If user already exists, redirect to dashboard
      if (existingUser) {
        console.log('User already exists, redirecting to dashboard');
        router.push('/dashboard');
        return;
      }

      // If existingUser is still undefined (loading), wait
      if (existingUser === undefined) {
        console.log('Waiting for user data to load...');
        return;
      }

      // If already onboarding, don't start again
      if (isOnboarding) {
        console.log('Already onboarding, please wait...');
        return;
      }

      // existingUser is null, so we need to onboard
      setIsOnboarding(true);

      try {
        console.log('🚀 Onboarding user:', user.id);
        console.log('User details:', {
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          name: user.fullName || user.firstName,
        });

        const userId = await onboardUser({
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress || '',
          name: user.fullName || user.firstName || 'User',
          avatarUrl: user.imageUrl,
        });

        console.log('✅ User onboarded successfully:', userId);

        // Wait for Convex to propagate the change
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Force a hard refresh to ensure query cache is cleared
        window.location.href = '/dashboard';
      } catch (err: any) {
        console.error('❌ Onboarding error:', err);
        console.error('Error details:', {
          message: err?.message,
          data: err?.data,
          stack: err?.stack,
        });
        setError(err instanceof Error ? err.message : 'Failed to onboard user. Please refresh and try again.');
        setIsOnboarding(false);
      }
    }

    handleOnboarding();
  }, [isLoaded, user, existingUser, isOnboarding, router, onboardUser]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Onboarding Error</h2>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <PageLoader />
        <h2 className="mt-4 text-2xl font-bold text-gray-900">Setting up your account</h2>
        <p className="mt-2 text-gray-600">This will only take a moment...</p>
      </div>
    </div>
  );
}
