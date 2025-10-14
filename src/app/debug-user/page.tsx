'use client';

import { useUser } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function DebugUserPage() {
  const { user } = useUser();
  const convexUser = useQuery(api.users.getCurrent);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold">User Debug Information</h1>

        <div className="space-y-6">
          {/* Clerk User Info */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">Clerk User</h2>
            <pre className="overflow-auto rounded bg-gray-100 p-4 text-sm">
              {JSON.stringify(
                {
                  id: user?.id,
                  email: user?.primaryEmailAddress?.emailAddress,
                  name: user?.fullName,
                  publicMetadata: user?.publicMetadata,
                },
                null,
                2
              )}
            </pre>
          </div>

          {/* Convex User Info */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">Convex User</h2>
            <pre className="overflow-auto rounded bg-gray-100 p-4 text-sm">
              {convexUser === undefined
                ? 'Loading...'
                : convexUser === null
                  ? 'No user found in Convex'
                  : JSON.stringify(convexUser, null, 2)}
            </pre>
          </div>

          {/* Action Buttons */}
          {convexUser && convexUser.company_id && (
            <div className="rounded-lg bg-green-50 p-6">
              <h3 className="mb-2 font-semibold text-green-900">Company Found!</h3>
              <p className="mb-4 text-green-700">
                Company ID: <code className="rounded bg-green-100 px-2 py-1">{convexUser.company_id}</code>
              </p>
              <p className="text-sm text-green-600">
                This company ID needs to be added to your Clerk user metadata.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
