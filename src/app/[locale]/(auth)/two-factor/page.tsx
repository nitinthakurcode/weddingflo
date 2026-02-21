'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, enable2FA, verify2FA, disable2FA } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ShieldCheck, ShieldOff, Loader2, Copy, CheckCircle2 } from 'lucide-react';

/**
 * Two-Factor Authentication Setup Page
 *
 * Allows users to:
 * - Enable 2FA with TOTP (authenticator app)
 * - Disable 2FA with password confirmation
 * - View 2FA status
 *
 * Security February 2026
 */
export default function TwoFactorPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [step, setStep] = useState<'status' | 'setup' | 'verify' | 'disable'>('status');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 2FA setup state
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/sign-in');
    }
  }, [user, authLoading, router]);

  // Cast to access twoFactorEnabled which is added by 2FA plugin
  const has2FA = (user as { twoFactorEnabled?: boolean } | null)?.twoFactorEnabled ?? false;

  const handleEnable2FA = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await enable2FA();

      if (result.error) {
        setError(result.error.message || 'Failed to enable 2FA');
        return;
      }

      // Store TOTP details for verification
      // Note: BetterAuth uses totpURI (uppercase)
      const data = result.data as { totpURI?: string; backupCodes?: string[] } | undefined;
      setTotpSecret(data?.totpURI?.split('secret=')[1]?.split('&')[0] || null);
      setTotpUri(data?.totpURI || null);
      setStep('verify');
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('[2FA] Enable error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await verify2FA(verificationCode);

      if (result.error) {
        setError(result.error.message || 'Invalid verification code');
        return;
      }

      setSuccess('Two-factor authentication enabled successfully!');
      setStep('status');

      // Refresh the page to update auth state
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('[2FA] Verify error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await disable2FA(password);

      if (result.error) {
        setError(result.error.message || 'Failed to disable 2FA');
        return;
      }

      setSuccess('Two-factor authentication disabled');
      setStep('status');
      setPassword('');

      // Refresh the page to update auth state
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('[2FA] Disable error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const copySecret = () => {
    if (totpSecret) {
      navigator.clipboard.writeText(totpSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
            {has2FA ? (
              <ShieldCheck className="h-6 w-6 text-green-600" />
            ) : (
              <Shield className="h-6 w-6 text-primary" />
            )}
          </div>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            {step === 'status' && (has2FA
              ? 'Your account is protected with 2FA'
              : 'Add an extra layer of security to your account'
            )}
            {step === 'setup' && 'Setting up two-factor authentication'}
            {step === 'verify' && 'Scan the QR code with your authenticator app'}
            {step === 'disable' && 'Confirm to disable two-factor authentication'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Status View */}
          {step === 'status' && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">TOTP Authenticator</p>
                    <p className="text-sm text-muted-foreground">
                      Use an authenticator app like Google Authenticator or Authy
                    </p>
                  </div>
                  {has2FA ? (
                    <span className="text-sm font-medium text-green-600">Enabled</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not configured</span>
                  )}
                </div>
              </div>

              {has2FA ? (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setStep('disable')}
                >
                  <ShieldOff className="mr-2 h-4 w-4" />
                  Disable 2FA
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={handleEnable2FA}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="mr-2 h-4 w-4" />
                  )}
                  Enable 2FA
                </Button>
              )}
            </div>
          )}

          {/* Verify View (QR Code) */}
          {step === 'verify' && totpUri && (
            <div className="space-y-4">
              <div className="flex justify-center">
                {/* QR Code would be rendered here using qrcode.react */}
                <div className="rounded-lg border bg-white p-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpUri)}`}
                    alt="TOTP QR Code"
                    width={200}
                    height={200}
                  />
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p>Can&apos;t scan the code? Enter this key manually:</p>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                    {totpSecret}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copySecret}
                    className="h-8 w-8 p-0"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Verification Code</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                />
              </div>
            </div>
          )}

          {/* Disable View */}
          {step === 'disable' && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Disabling 2FA will make your account less secure. You can re-enable it at any time.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm Password</label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-2">
          {step !== 'status' && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setStep('status');
                setError(null);
                setVerificationCode('');
                setPassword('');
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}

          {step === 'verify' && (
            <Button
              className="flex-1"
              onClick={handleVerify2FA}
              disabled={isLoading || verificationCode.length !== 6}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Verify & Enable
            </Button>
          )}

          {step === 'disable' && (
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDisable2FA}
              disabled={isLoading || !password}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Disable 2FA
            </Button>
          )}

          {step === 'status' && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/settings')}
            >
              Back to Settings
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
