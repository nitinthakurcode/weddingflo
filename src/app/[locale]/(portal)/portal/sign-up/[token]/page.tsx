'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/lib/navigation';
import { useAuth, signUpWithEmail } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Heart } from 'lucide-react';

interface InviteData {
  valid: boolean;
  email?: string;
  relationship?: string;
  error?: string;
}

export default function PortalSignUpPage() {
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
        const res = await fetch(`/api/invite/accept?token=${token}&type=wedding`);
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
              body: JSON.stringify({ token, type: 'wedding' }),
            });
            const data = await res.json();
            if (data.success) {
              router.push(data.redirectTo || '/portal/dashboard');
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
        body: JSON.stringify({ token, type: 'wedding' }),
      });
      const acceptData = await acceptRes.json();

      if (acceptData.success) {
        router.push(acceptData.redirectTo || '/portal/dashboard');
      } else {
        setError(acceptData.error || 'Failed to accept invitation');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  const relationshipLabel = {
    bride: 'Bride',
    groom: 'Groom',
    family_bride: "Bride's Family",
    family_groom: "Groom's Family",
    other: 'Guest',
  }[inviteData?.relationship || 'other'] || 'Guest';

  if (isLoading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!inviteData?.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Invalid Invitation</CardTitle>
            <CardDescription>
              {inviteData?.error || 'This invitation link is invalid or has expired.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Please contact your wedding planner for a new invitation.
            </p>
            <Button onClick={() => router.push('/portal/sign-in')} className="w-full">
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50">
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
              Please sign out and sign in with the invited email address.
            </p>
            <Button onClick={() => router.push('/portal/sign-in')} className="w-full">
              Sign Out & Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show signup form for new users
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Heart className="mx-auto h-12 w-12 text-rose-500" />
          <h1 className="mt-4 text-3xl font-bold text-foreground">Welcome to Your Wedding Portal</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You&apos;ve been invited as: <strong>{relationshipLabel}</strong>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Your Account</CardTitle>
            <CardDescription>
              Set up your account to access your wedding planning portal
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

              <Button type="submit" className="w-full bg-rose-500 hover:bg-rose-600" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Join Wedding Portal'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
