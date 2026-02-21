'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/lib/navigation';
import { useAuth, signUpWithEmail } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface InviteData {
  valid: boolean;
  email?: string;
  role?: string;
  error?: string;
}

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for new users
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  // Verify invitation on load
  useEffect(() => {
    async function verifyInvite() {
      try {
        const res = await fetch(`/api/invite/accept?token=${token}&type=team`);
        const data = await res.json();
        setInviteData(data);
      } catch (err) {
        setInviteData({ valid: false, error: 'Failed to verify invitation' });
      } finally {
        setIsLoading(false);
      }
    }
    verifyInvite();
  }, [token]);

  // If user is authenticated with matching email, auto-accept
  useEffect(() => {
    async function autoAccept() {
      if (!authLoading && isAuthenticated && user && inviteData?.valid) {
        if (user.email?.toLowerCase() === inviteData.email?.toLowerCase()) {
          setIsSubmitting(true);
          try {
            const res = await fetch('/api/invite/accept', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, type: 'team' }),
            });
            const data = await res.json();
            if (data.success) {
              router.push(data.redirectTo || '/dashboard');
            } else {
              setError(data.error || 'Failed to accept invitation');
            }
          } catch (err) {
            setError('Failed to accept invitation');
          } finally {
            setIsSubmitting(false);
          }
        }
      }
    }
    autoAccept();
  }, [authLoading, isAuthenticated, user, inviteData, token, router]);

  // Handle signup and accept
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteData?.email) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Sign up with the invitation email
      const result = await signUpWithEmail(inviteData.email, password, name);

      if (result.error) {
        setError(result.error.message || 'Failed to create account');
        setIsSubmitting(false);
        return;
      }

      // Accept the invitation
      const acceptRes = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, type: 'team' }),
      });
      const acceptData = await acceptRes.json();

      if (acceptData.success) {
        router.push(acceptData.redirectTo || '/dashboard');
      } else {
        setError(acceptData.error || 'Failed to accept invitation');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!inviteData?.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50/50 via-secondary-50/30 to-accent-50/40">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Invalid Invitation</CardTitle>
            <CardDescription>
              {inviteData?.error || 'This invitation link is invalid or has expired.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/sign-in')} className="w-full">
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If already authenticated with different email
  if (isAuthenticated && user?.email?.toLowerCase() !== inviteData.email?.toLowerCase()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50/50 via-secondary-50/30 to-accent-50/40">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Email Mismatch</CardTitle>
            <CardDescription>
              This invitation was sent to <strong>{inviteData.email}</strong>, but you&apos;re signed in as{' '}
              <strong>{user?.email}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please sign out and sign in with the invited email address, or ask for a new invitation.
            </p>
            <Button onClick={() => router.push('/sign-in')} className="w-full">
              Sign Out & Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show signup form for new users
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50/50 via-secondary-50/30 to-accent-50/40">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">Join the Team</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You&apos;ve been invited as a <strong>{inviteData.role}</strong>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Your Account</CardTitle>
            <CardDescription>
              Set up your account to accept the invitation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteData.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  minLength={8}
                />
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Accept Invitation'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
