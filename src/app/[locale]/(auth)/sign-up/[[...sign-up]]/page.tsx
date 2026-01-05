'use client';

import { useState, useEffect } from 'react';
import { Building2, Loader2, Mail, Lock, User, Eye, EyeOff, Gift, Sparkles } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signUpWithEmail, signInWithGoogle } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { TurnstileCaptcha, isCaptchaEnabled } from '@/components/auth/turnstile-captcha';
import { GoogleOneTap } from '@/components/auth/google-one-tap';
import { trpc } from '@/lib/trpc/client';

export default function SignUpPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'en';

  // Capture referral code from URL (?ref=CODE)
  const referralCode = searchParams.get('ref') || '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string>('');
  const [referralTracked, setReferralTracked] = useState(false);

  // tRPC mutations for referral tracking
  const trackClickMutation = trpc.referrals.trackClick.useMutation();
  const convertSignupMutation = trpc.referrals.convertSignup.useMutation();

  // Track referral click when page loads with ref code
  useEffect(() => {
    if (referralCode && !referralTracked) {
      trackClickMutation.mutate({
        referralCode,
        source: 'signup_page',
        utmSource: searchParams.get('utm_source') || undefined,
        utmMedium: searchParams.get('utm_medium') || undefined,
        utmCampaign: searchParams.get('utm_campaign') || undefined,
      });
      // Store referral code in sessionStorage for post-signup conversion
      sessionStorage.setItem('weddingflo_referral_code', referralCode);
      setReferralTracked(true);
    }
  }, [referralCode, referralTracked, searchParams, trackClickMutation]);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    // Require CAPTCHA if enabled
    if (isCaptchaEnabled() && !captchaToken) {
      setError('Please complete the CAPTCHA verification');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUpWithEmail(email, password, name, captchaToken || undefined);
      if (result.error) {
        // Reset CAPTCHA on error
        setCaptchaToken('');
        // Handle specific error codes
        if (result.error.code === 'PASSWORD_COMPROMISED') {
          setError('This password has been found in a data breach. Please choose a different password.');
        } else {
          setError(result.error.message || 'Failed to create account');
        }
      } else {
        // Successfully signed up - convert referral if present
        const storedReferralCode = sessionStorage.getItem('weddingflo_referral_code');
        if (storedReferralCode) {
          try {
            await convertSignupMutation.mutateAsync({ referralCode: storedReferralCode });
            sessionStorage.removeItem('weddingflo_referral_code');
          } catch {
            // Silent fail - don't block user flow if referral tracking fails
            console.error('Failed to convert referral signup');
          }
        }
        router.push(`/${locale}/dashboard`);
      }
    } catch {
      setCaptchaToken('');
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setIsGoogleLoading(true);

    try {
      await signInWithGoogle();
    } catch {
      setError('Failed to sign up with Google');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50/50 via-secondary-50/30 to-accent-50/40 dark:from-primary-950/30 dark:via-secondary-950/20 dark:to-accent-950/20 flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary-300/15 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary-300/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent-200/10 rounded-full blur-3xl" />
        <div className="absolute bottom-40 left-1/4 w-48 h-48 bg-primary-300/15 rounded-full blur-2xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Google One Tap - Shows frictionless sign-in prompt */}
      <GoogleOneTap callbackURL="/dashboard" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Header - Elegant Style */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-xl shadow-primary-500/25 animate-bounce-in hover:scale-110 transition-transform duration-300">
            <Building2 className="h-10 w-10 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-primary-700 dark:text-primary-400 mb-2">
              WeddingFlo
            </h1>
            <p className="text-muted-foreground">
              Create your account to get started
            </p>
          </div>
        </div>

        {/* Sign Up Card - Glass Effect */}
        <Card variant="glass-strong" className="shadow-2xl border-white/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center font-bold">Create an account</CardTitle>
            <CardDescription className="text-center">
              Enter your details to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Referral Bonus Indicator */}
            {referralCode && (
              <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-4 animate-bounce-in">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <Gift className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-amber-700 dark:text-amber-400">Referral Bonus Active!</span>
                      <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                    </div>
                    <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
                      You&apos;ve been referred by a friend. Sign up to claim your welcome bonus!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-xl border border-destructive/20 animate-shake">
                {error}
              </div>
            )}

            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/70 group-focus-within:text-primary-600 transition-colors" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 h-12 border-border/60 focus:border-primary-400 focus:ring-primary-400/20"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/70 group-focus-within:text-primary-600 transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 border-border/60 focus:border-primary-400 focus:ring-primary-400/20"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/70 group-focus-within:text-primary-600 transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 border-border/60 focus:border-primary-400 focus:ring-primary-400/20"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-muted-foreground/70 hover:text-primary-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/70 group-focus-within:text-primary-600 transition-colors" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 h-12 border-border/60 focus:border-primary-400 focus:ring-primary-400/20"
                    required
                  />
                </div>
              </div>

              {/* CAPTCHA - Only renders if TURNSTILE_SITE_KEY is configured */}
              <TurnstileCaptcha
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken('')}
                onError={() => setCaptchaToken('')}
                className="flex justify-center"
              />

              <Button
                type="submit"
                size="lg"
                className="w-full h-12 text-base font-semibold bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 transition-all duration-300"
                disabled={isLoading || (isCaptchaEnabled() && !captchaToken)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card/80 backdrop-blur-sm px-3 text-muted-foreground rounded-full">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              variant="glass"
              size="lg"
              className="w-full h-12 text-base font-medium hover:scale-[1.02] transition-all duration-300"
              onClick={handleGoogleSignUp}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              Continue with Google
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Link
                href={`/${locale}/sign-in`}
                className="text-primary-600 hover:text-primary-700 font-semibold transition-colors"
              >
                Sign in
              </Link>
            </div>
            <p className="text-xs text-center text-muted-foreground/70">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
          </CardFooter>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Professional wedding planning software
          </p>
        </div>
      </div>
    </div>
  );
}
