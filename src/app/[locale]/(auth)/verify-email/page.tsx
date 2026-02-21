'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, CheckCircle2, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

/**
 * Email Verification Page
 *
 * Handles:
 * - Displaying verification pending state
 * - Processing verification tokens from URL
 * - Resending verification emails
 *
 * Security February 2026
 */
export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  const [status, setStatus] = useState<'pending' | 'verifying' | 'success' | 'error'>('pending');
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Get token from URL if present
  const token = searchParams.get('token');

  // Verify token if present
  const verifyToken = useCallback(async (verificationToken: string) => {
    setStatus('verifying');
    setError(null);

    try {
      const result = await authClient.verifyEmail({
        query: { token: verificationToken },
      });

      if (result.error) {
        setStatus('error');
        setError(result.error.message || 'Verification failed');
        return;
      }

      setStatus('success');

      // Redirect to dashboard after successful verification
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      setStatus('error');
      setError('An unexpected error occurred');
      console.error('[Verify] Error:', err);
    }
  }, [router]);

  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token, verifyToken]);

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Redirect if already verified
  // Cast to access emailVerified which may be on user object
  useEffect(() => {
    const isVerified = (user as { emailVerified?: boolean } | null)?.emailVerified;
    if (!authLoading && isVerified) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleResendEmail = async () => {
    if (resendCooldown > 0 || !user?.email) return;

    setIsResending(true);
    setError(null);

    try {
      const result = await authClient.sendVerificationEmail({
        email: user.email,
      });

      if (result.error) {
        setError(result.error.message || 'Failed to send verification email');
        return;
      }

      // Start 60 second cooldown
      setResendCooldown(60);
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('[Verify] Resend error:', err);
    } finally {
      setIsResending(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {status === 'success' ? (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            ) : status === 'error' ? (
              <AlertCircle className="h-6 w-6 text-destructive" />
            ) : status === 'verifying' ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              <Mail className="h-6 w-6 text-primary" />
            )}
          </div>
          <CardTitle>
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
            {status === 'verifying' && 'Verifying...'}
            {status === 'pending' && 'Verify Your Email'}
          </CardTitle>
          <CardDescription>
            {status === 'success' && 'Your email has been verified successfully. Redirecting...'}
            {status === 'error' && 'There was a problem verifying your email.'}
            {status === 'verifying' && 'Please wait while we verify your email address.'}
            {status === 'pending' && `We've sent a verification link to ${user?.email || 'your email'}`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {status === 'pending' && (
            <>
              <div className="rounded-lg border bg-muted/50 p-4">
                <h4 className="mb-2 font-medium">What to do next:</h4>
                <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                  <li>Check your email inbox</li>
                  <li>Click the verification link</li>
                  <li>You&apos;ll be redirected to your dashboard</li>
                </ol>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p>Didn&apos;t receive the email? Check your spam folder or request a new one.</p>
              </div>
            </>
          )}

          {status === 'error' && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="mb-2 font-medium">Common issues:</h4>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                <li>The link may have expired (valid for 24 hours)</li>
                <li>The link may have already been used</li>
                <li>Try requesting a new verification email</li>
              </ul>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          {(status === 'pending' || status === 'error') && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResendEmail}
              disabled={isResending || resendCooldown > 0}
            >
              {isResending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : 'Resend Verification Email'
              }
            </Button>
          )}

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => router.push('/sign-in')}
          >
            Back to Sign In
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
