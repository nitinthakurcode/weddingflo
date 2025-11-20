'use client';

import { SignUp } from '@clerk/nextjs';
import { useParams } from 'next/navigation';

export default function SignUpPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 to-pink-50">
      <div className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">WeddingFlow Pro</h1>
          <p className="mt-2 text-gray-600">Create your account to get started</p>
        </div>
        <SignUp
          afterSignUpUrl={`/${locale}/dashboard`}
          signInUrl={`/${locale}/sign-in`}
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-xl',
            },
          }}
        />
      </div>
    </div>
  );
}
