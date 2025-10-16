'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FixAccountPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const router = useRouter();

  const handleSync = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sync-user-metadata', {
        method: 'POST',
      });
      const data = await response.json();
      setResult(data);

      if (data.success) {
        setTimeout(() => {
          router.push('/settings/billing');
        }, 2000);
      }
    } catch (error) {
      setResult({ error: 'Failed to sync' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Fix Your Account</h1>
        <p className="mb-6 text-gray-600">
          Click the button below to sync your company information to your account.
        </p>

        <button
          onClick={handleSync}
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-white hover:bg-primary disabled:opacity-50"
        >
          {loading ? 'Syncing...' : 'Sync Company Data'}
        </button>

        {result && (
          <div
            className={`mt-4 rounded-lg p-4 ${
              result.success ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'
            }`}
          >
            <pre className="whitespace-pre-wrap text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
            {result.success && (
              <p className="mt-2 font-semibold">
                ✅ Success! Redirecting to billing page...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
