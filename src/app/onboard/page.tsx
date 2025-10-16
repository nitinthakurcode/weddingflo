'use client';

import { useUser } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageLoader } from '@/components/ui/loading-spinner';

export default function OnboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const supabase = useSupabase();
  const [error, setError] = useState<string | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);

  // Check if user already exists
  const { data: existingUser, isLoading: isCheckingUser } = useQuery({
    queryKey: ['current-user', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID not available');
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', user.id)
        .single();

      if (error) {
        // User doesn't exist yet - this is expected
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    },
    enabled: !!user?.id && isLoaded,
  });

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

      // If still checking, wait
      if (isCheckingUser) {
        console.log('Checking user data...');
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

        console.log('✅ User onboarded successfully:', result.userId);

        // Wait a moment for data propagation
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Force a hard refresh to ensure query cache is cleared
        window.location.href = '/dashboard';
      } catch (err: any) {
        console.error('❌ Onboarding error:', err);
        console.error('Error details:', {
          message: err?.message,
        });
        setError(err instanceof Error ? err.message : 'Failed to onboard user. Please refresh and try again.');
        setIsOnboarding(false);
      }
    }

    handleOnboarding();
  }, [isLoaded, user, existingUser, isCheckingUser, isOnboarding, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Onboarding Error</h2>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-white hover:bg-primary"
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
