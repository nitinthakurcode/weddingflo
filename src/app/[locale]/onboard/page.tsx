'use client';

import { useUser, useClerk } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageLoader } from '@/components/ui/loading-spinner';

export default function OnboardPage() {
  const { user, isLoaded } = useUser();
  const clerk = useClerk();
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || 'company_admin'; // Default to company_admin
  const supabase = useSupabase();
  const [error, setError] = useState<string | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const hasAttemptedOnboarding = useRef(false);

  // Check if user already exists in Supabase (uses Clerk JWT with proper RLS)
  const { data: existingUser, isLoading: isCheckingUser } = useQuery({
    queryKey: ['current-user', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      if (!supabase) throw new Error('Supabase client not ready');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isLoaded && !!supabase,
    retry: 1,
  });

  useEffect(() => {
    async function handleOnboarding() {
      if (!isLoaded) return;

      if (!user) {
        router.push('/en/sign-in');
        return;
      }

      // If user already exists, check if session has role before redirecting
      if (existingUser) {
        const roleInSession = user.publicMetadata?.role as string | undefined;

        if (roleInSession) {
          console.log('✅ User already exists with role in session:', roleInSession, '- redirecting to dashboard');
          // Force hard refresh to clear React Query cache
          window.location.href = '/en/dashboard';
          return;
        }

        // User exists in DB but role not in session yet
        // Force hard refresh to reload Clerk session with updated metadata
        console.log('⚠️ User exists in DB but role not yet in Clerk session');
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
            role: role, // Pass the role from URL parameter
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to onboard');
        }

        console.log('✅ User onboarded successfully:', result.userId);

        // Wait for webhook to complete and update Clerk metadata (2-3 seconds)
        console.log('⏳ Waiting for Clerk webhook to update metadata...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Force Clerk to reload BOTH session and user to pick up the new role from metadata
        console.log('🔄 Reloading Clerk session and user to get updated role...');
        if (clerk.session) {
          await clerk.session.reload();
        }
        await user.reload();

        // Verify the role is now in the session
        const updatedRole = user.publicMetadata?.role as string | undefined;
        console.log('✅ Session reloaded, role:', updatedRole);

        if (!updatedRole) {
          console.warn('⚠️ Role still not in session after reload, waiting another 3 seconds...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          if (clerk.session) {
            await clerk.session.reload();
          }
          await user.reload();
          const finalRole = user.publicMetadata?.role as string | undefined;
          console.log('✅ Final role check:', finalRole);
        }

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
  }, [isLoaded, user, existingUser, isCheckingUser, router, clerk, role, supabase]);

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
