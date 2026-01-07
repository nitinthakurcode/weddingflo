'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock } from 'lucide-react';
import { useRouter } from '@/lib/navigation';

interface PasswordProtectionProps {
  websiteId: string;
  subdomain: string;
}

/**
 * Password Protection UI
 * Session 49: Password-protected wedding websites
 */
export function PasswordProtection({ websiteId, subdomain }: PasswordProtectionProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Verify password with backend
      const response = await fetch('/api/websites/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId,
          password,
        }),
      });

      const data = await response.json();

      if (data.valid) {
        // Set cookie and reload
        document.cookie = `website-password-${websiteId}=${password}; path=/; max-age=86400`; // 24 hours
        router.refresh();
      } else {
        setError('Incorrect password. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto rounded-full bg-primary/10 p-3 w-fit mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Password Protected</CardTitle>
          <CardDescription>
            This wedding website is private. Please enter the password to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={loading}
                autoFocus
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading || !password}>
              {loading ? 'Verifying...' : 'Continue'}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Don't have the password? Contact the couple for access.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
