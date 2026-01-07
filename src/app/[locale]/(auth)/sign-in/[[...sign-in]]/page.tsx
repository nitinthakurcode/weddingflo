'use client';

import { useState } from 'react';
import { Building2, Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useParams } from 'next/navigation';
import { Link, useRouter } from '@/lib/navigation';
import { signInWithEmail } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { TurnstileCaptcha, isCaptchaEnabled } from '@/components/auth/turnstile-captcha';
import { GoogleOneTap } from '@/components/auth/google-one-tap';

export default function SignInPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string>('');

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Require CAPTCHA if enabled
    if (isCaptchaEnabled() && !captchaToken) {
      setError('Please complete the CAPTCHA verification');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signInWithEmail(email, password, captchaToken || undefined);
      if (result.error) {
        // Reset CAPTCHA on error
        setCaptchaToken('');
        setError(result.error.message || 'Invalid email or password');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setCaptchaToken('');
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // For Safari compatibility, we need to handle Google OAuth carefully
  // Safari's ITP can block programmatic redirects

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50/50 via-secondary-50/30 to-accent-50/40 dark:from-primary-950/30 dark:via-secondary-950/20 dark:to-accent-950/20 flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary-300/15 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary-300/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent-200/10 rounded-full blur-3xl" />
      </div>

      {/* Google One Tap - Shows frictionless sign-in prompt */}
      <GoogleOneTap callbackURL="/dashboard" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Header - Elegant Style */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-xl shadow-primary-500/25 animate-bounce-in">
            <Building2 className="h-10 w-10 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-primary-700 dark:text-primary-400 mb-2">
              WeddingFlo
            </h1>
            <p className="text-muted-foreground">
              Sign in to manage your events
            </p>
          </div>
        </div>

        {/* Sign In Card - Glass Effect */}
        <Card variant="glass-strong" className="shadow-2xl border-white/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
            <CardDescription className="text-center">
              Enter your email and password to sign in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            <form onSubmit={handleEmailSignIn} className="space-y-4">
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
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 border-border/60 focus:border-primary-400 focus:ring-primary-400/20"
                    required
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
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Server-side redirect for Safari OAuth compatibility */}
            {/* Safari blocks programmatic JS redirects, but follows server 302 redirects */}
            <a
              href={`/api/auth/google?locale=${locale}&callbackURL=/dashboard`}
              className="inline-flex items-center justify-center w-full h-12 text-base font-medium rounded-lg bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/90 dark:hover:bg-white/20 hover:scale-[1.02] transition-all duration-300 text-foreground"
            >
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
              Continue with Google
            </a>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link
                href="/sign-up"
                className="text-primary-600 hover:text-primary-700 font-semibold transition-colors"
              >
                Sign up
              </Link>
            </div>
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
