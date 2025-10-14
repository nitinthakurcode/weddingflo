'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function AuthDebugPage() {
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const convexUser = useQuery(api.users.getCurrent);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Authentication Debug</h1>
        <p className="text-gray-600 mt-2">Check your Clerk and Convex authentication status</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Clerk Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isSignedIn ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Clerk Authentication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1">
              <p className="text-sm font-medium">Status:</p>
              <p className={`text-sm ${isSignedIn ? 'text-green-600' : 'text-red-600'}`}>
                {isSignedIn ? 'Signed In' : 'Not Signed In'}
              </p>
            </div>

            {user && (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-medium">User ID:</p>
                  <p className="text-xs font-mono bg-gray-100 p-2 rounded">{userId}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">Email:</p>
                  <p className="text-sm">{user.primaryEmailAddress?.emailAddress}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">Name:</p>
                  <p className="text-sm">{user.fullName || user.firstName || 'N/A'}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Convex Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {convexUser === undefined ? (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              ) : convexUser ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Convex Database
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1">
              <p className="text-sm font-medium">Status:</p>
              <p className={`text-sm ${
                convexUser === undefined
                  ? 'text-yellow-600'
                  : convexUser
                    ? 'text-green-600'
                    : 'text-red-600'
              }`}>
                {convexUser === undefined
                  ? 'Loading...'
                  : convexUser
                    ? 'User Found'
                    : 'User Not Found'}
              </p>
            </div>

            {convexUser && (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Database ID:</p>
                  <p className="text-xs font-mono bg-gray-100 p-2 rounded">{convexUser._id}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">Clerk ID:</p>
                  <p className="text-xs font-mono bg-gray-100 p-2 rounded">{convexUser.clerk_id}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">Email:</p>
                  <p className="text-sm">{convexUser.email}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">Role:</p>
                  <p className="text-sm">{convexUser.role}</p>
                </div>
              </>
            )}

            {convexUser === null && isSignedIn && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  You&apos;re signed in with Clerk but don&apos;t exist in Convex yet.
                  You should be redirected to the onboarding page.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* JWT Token Info */}
      <Card>
        <CardHeader>
          <CardTitle>JWT Token Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              If you&apos;re seeing 404 errors for Convex tokens, check:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Clerk Dashboard → JWT Templates → Verify &quot;convex&quot; template exists</li>
              <li>Template issuer should be: <code className="bg-gray-100 px-2 py-1 rounded">https://awaited-dog-98.clerk.accounts.dev</code></li>
              <li>Template name must be exactly: <code className="bg-gray-100 px-2 py-1 rounded">convex</code> (lowercase)</li>
              <li>Check browser console for specific error messages</li>
            </ol>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800 font-medium">Quick Fix:</p>
              <p className="text-sm text-blue-800 mt-1">
                Go to <a href="https://dashboard.clerk.com" target="_blank" className="underline">Clerk Dashboard</a> →
                JWT Templates → New template → Select &quot;Convex&quot; → Name it &quot;convex&quot; → Save
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
