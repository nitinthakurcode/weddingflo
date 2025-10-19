'use client';

import { SignUp } from '@clerk/nextjs';

export default function SuperAdminSignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Super Admin Access</h1>
          <p className="mt-2 text-sm text-gray-600">
            Platform administrator registration
          </p>
        </div>
        <SignUp
          appearance={{
            variables: {
              colorPrimary: '#8b5cf6',
            },
          }}
          redirectUrl="/onboard?role=super_admin"
          signInUrl="/sign-in"
        />
      </div>
    </div>
  );
}
