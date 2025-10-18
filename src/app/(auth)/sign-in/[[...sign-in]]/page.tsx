'use client';

import { SignIn } from '@clerk/nextjs';
import { Building2, Sparkles } from 'lucide-react';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-pink-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-pink-600 shadow-lg">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              WeddingFlow Pro
            </h1>
            <p className="text-gray-600">
              Sign in to manage your events
            </p>
          </div>
        </div>

        {/* Sign In Component */}
        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-2xl',
              },
            }}
            fallbackRedirectUrl="/onboard"
          />
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Professional wedding planning software
          </p>
        </div>
      </div>
    </div>
  );
}
