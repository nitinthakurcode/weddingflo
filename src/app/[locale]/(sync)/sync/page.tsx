'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Sync Page
 * December 2025 - BetterAuth
 *
 * This page handles the case where a user is authenticated but their
 * session doesn't have role/company_id properly set.
 *
 * This can happen when:
 * 1. User just signed up and data sync hasn't completed yet
 * 2. Database sync failed
 * 3. Legacy user without company assignment
 *
 * Pattern: Sync from DB to session, then redirect to dashboard.
 */
export default function SyncPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [status, setStatus] = useState<'syncing' | 'error' | 'retrying'>('syncing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [canRetry, setCanRetry] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const syncInProgress = useRef(false);

  const syncMetadata = async () => {
    try {
      setStatus('syncing');

      const response = await fetch('/api/user/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success! Force sign out and back in to get fresh session with new companyId
        // This ensures the session cache is cleared and new data is loaded
        console.log('[Sync] Account setup complete, refreshing session...');

        // Small delay to ensure DB write is committed
        await new Promise(resolve => setTimeout(resolve, 500));

        // Force full page reload to clear any cached session
        window.location.href = `/${locale}/dashboard`;
        return;
      }

      // Handle errors
      if (response.status === 404 && data.retry) {
        // User not in DB yet - webhook may still be processing
        if (retryCount < maxRetries) {
          setStatus('retrying');
          setRetryCount(prev => prev + 1);
          // Wait and retry
          setTimeout(syncMetadata, 2000);
          return;
        }
      }

      // Show error
      setStatus('error');
      setErrorMessage(data.message || data.error || 'Failed to sync account');
      setCanRetry(data.retry !== false);
    } catch (error) {
      console.error('Sync error:', error);
      setStatus('error');
      setErrorMessage('Network error. Please check your connection.');
      setCanRetry(true);
    }
  };

  useEffect(() => {
    // Prevent double calls from React StrictMode
    if (syncInProgress.current) return;
    syncInProgress.current = true;
    syncMetadata();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = () => {
    setRetryCount(0);
    syncMetadata();
  };

  const handleSignOut = () => {
    // Redirect to sign-out
    window.location.href = '/sign-out';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {status === 'syncing' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Setting up your account
              </h1>
              <p className="text-gray-600">
                Please wait while we configure your workspace...
              </p>
            </>
          )}

          {status === 'retrying' && (
            <>
              <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Almost there
              </h1>
              <p className="text-gray-600">
                Your account is being set up. Retrying... ({retryCount}/{maxRetries})
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Setup Issue
              </h1>
              <p className="text-gray-600 mb-6">
                {errorMessage}
              </p>
              <div className="space-y-3">
                {canRetry && (
                  <Button onClick={handleRetry} className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="w-full"
                >
                  Sign Out
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
