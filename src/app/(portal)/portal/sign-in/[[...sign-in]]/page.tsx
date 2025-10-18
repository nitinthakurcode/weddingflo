'use client';

import { SignIn } from '@clerk/nextjs';
import { Heart, Sparkles } from 'lucide-react';

export default function PortalSignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 shadow-lg">
            <Heart className="h-8 w-8 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Client Portal Login
            </h1>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-rose-200 rounded-lg shadow-sm">
              <Sparkles className="h-4 w-4 text-rose-500" />
              <p className="text-sm font-medium text-gray-700">
                Welcome to your wedding planning portal
              </p>
            </div>
          </div>
        </div>

        {/* Sign In Component */}
        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-2xl bg-white',
              },
            }}
            fallbackRedirectUrl="/portal/dashboard"
            signUpUrl="/sign-up"
          />
        </div>

        {/* Footer */}
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">
            Your wedding journey starts here
          </p>
          <div className="flex items-center justify-center gap-1 text-rose-400">
            <Heart className="h-3 w-3 fill-current" />
            <Heart className="h-3 w-3 fill-current" />
            <Heart className="h-3 w-3 fill-current" />
          </div>
        </div>
      </div>
    </div>
  );
}
