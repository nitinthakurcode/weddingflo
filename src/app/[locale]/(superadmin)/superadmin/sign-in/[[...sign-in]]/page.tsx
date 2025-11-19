'use client';

import { SignIn } from '@clerk/nextjs';
import { ShieldAlert } from 'lucide-react';

export default function SuperAdminSignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-orange-600 shadow-lg">
            <ShieldAlert className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Super Admin Access
            </h1>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-600/20 border border-red-500/50 rounded-lg">
              <ShieldAlert className="h-4 w-4 text-red-400" />
              <p className="text-sm font-medium text-red-300">
                Restricted Access - Authorized Personnel Only
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
                card: 'shadow-2xl',
              },
            }}
            fallbackRedirectUrl="/en/superadmin/dashboard"
            forceRedirectUrl="/en/superadmin/dashboard"
            signUpUrl="/en/sign-up"
          />
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-400">
            WeddingFlow Pro Platform Administration
          </p>
        </div>
      </div>
    </div>
  );
}
