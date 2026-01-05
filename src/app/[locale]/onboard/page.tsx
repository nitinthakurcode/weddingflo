'use client';

import { useAuth } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc/client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageLoader } from '@/components/ui/loading-spinner';

export default function OnboardPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || 'company_admin'; // Default to company_admin
  const [error, setError] = useState<string | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const hasAttemptedOnboarding = useRef(false);

  // Check if user already exists via tRPC
  const { data: existingUser, isLoading: isCheckingUser } = trpc.users.getCurrent.useQuery(
    undefined,
    {
      enabled: !!user?.id && !isAuthLoading,
      retry: 1,
    }
  );

  useEffect(() => {
    async function handleOnboarding() {
      if (isAuthLoading) return;

      if (!user || !isAuthenticated) {
        router.push('/en/sign-in');
        return;
      }

      // If user already exists, check if they have a role before redirecting
      if (existingUser) {
        const userRole = (user as any).role;

        if (userRole) {
          console.log('✅ User already exists with role:', userRole, '- redirecting to dashboard');
          // Force hard refresh to clear React Query cache
          window.location.href = '/en/dashboard';
          return;
        }

        // User exists in DB but role not in session yet
        // Force hard refresh to reload session with updated role
        console.log('⚠️ User exists in DB but role not yet in session');
        console.log('ℹ️ Forcing hard refresh to reload session with updated role');

        // MUST use window.location.href (not router.push) for full page reload
        window.location.href = '/en/dashboard';
        return;
      }

      // If still checking, wait
      if (isCheckingUser) {
        console.log('Checking user data...');
        return;
      }

      // If already onboarding or already attempted, don't start again
      if (isOnboarding || hasAttemptedOnboarding.current) {
        console.log('Already onboarding or attempted, please wait...');
        return;
      }

      // existingUser is null, so we need to onboard
      hasAttemptedOnboarding.current = true;
      setIsOnboarding(true);

      try {
        console.log('🚀 Onboarding user:', user.id);
        console.log('User details:', {
          userId: user.id,
          email: user.email,
          name: user.name,
        });

        const response = await fetch('/api/onboard', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            email: user.email || '',
            name: user.name || 'User',
            avatarUrl: (user as any).image,
            role: role, // Pass the role from URL parameter
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to onboard');
        }

        console.log('✅ User onboarded successfully:', result.userId);

        // Wait a moment for the database to update
        console.log('⏳ Waiting for database to update...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Redirect based on role
        const redirectPath = role === 'super_admin' ? '/en/admin' : '/en/dashboard';

        // Force a hard refresh to ensure query cache is cleared and session is reloaded
        console.log('🚀 Redirecting to:', redirectPath);
        window.location.href = redirectPath;
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
  }, [isAuthLoading, user, isAuthenticated, existingUser, isCheckingUser, router, role]);

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
