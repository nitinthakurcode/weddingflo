'use client';

import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { PageLoader } from '@/components/ui/loading-spinner';

export default function FixVendorsPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const fixAllVendorBalances = useMutation(api.fixVendors.fixAllVendorBalances);

  // Get current user and wedding
  const currentUser = useQuery(api.users.getCurrent);
  const clients = useQuery(
    api.clients.list,
    currentUser?.company_id ? { companyId: currentUser.company_id } : 'skip'
  );
  const weddings = useQuery(
    api.weddings.getByClient,
    clients?.[0]?._id ? { clientId: clients[0]._id } : 'skip'
  );
  const weddingId = weddings?.[0]?._id;

  // Get debug info for all vendors
  const vendorsDebug = useQuery(
    api.debugVendor.getAllVendorsDebug,
    weddingId ? { weddingId } : 'skip'
  );

  const handleFix = async () => {
    setLoading(true);
    try {
      const result = await fixAllVendorBalances({});
      setResult(result);
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (currentUser === undefined || clients === undefined || weddings === undefined) {
    return <PageLoader />;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Fix Vendor Balances</h2>
        <p className="text-muted-foreground">
          Click the button below to recalculate all vendor balances
        </p>
      </div>

      {/* Current Database Values */}
      <div className="border rounded-lg p-6 bg-gray-50">
        <h3 className="text-lg font-semibold mb-4">Current Vendors in Database:</h3>
        {vendorsDebug === undefined ? (
          <p>Loading...</p>
        ) : vendorsDebug.length === 0 ? (
          <p>No vendors found</p>
        ) : (
          <div className="space-y-3">
            {vendorsDebug.map((vendor: any) => (
              <div
                key={vendor._id}
                className={`p-4 rounded border ${vendor.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
              >
                <p className="font-semibold">{vendor.name}</p>
                <div className="mt-2 text-sm space-y-1">
                  <div className="grid grid-cols-3 gap-2">
                    <div>Total Cost: <strong>${vendor.totalCost.toLocaleString()}</strong></div>
                    <div>Deposit: <strong>${vendor.depositAmount.toLocaleString()}</strong></div>
                    <div>Stored Balance: <strong>${vendor.storedBalance?.toLocaleString() || 'N/A'}</strong></div>
                  </div>
                  <div className={`font-bold ${vendor.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                    Should be: ${vendor.calculatedBalance.toLocaleString()}
                    {!vendor.isCorrect && ' ❌ INCORRECT'}
                    {vendor.isCorrect && ' ✓ CORRECT'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border rounded-lg p-6">
        <Button onClick={handleFix} disabled={loading} size="lg">
          {loading ? 'Fixing...' : 'Fix All Vendor Balances'}
        </Button>

        {result && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold">Results:</h3>
            {result.map((vendor: any, i: number) => (
              <div
                key={i}
                className={`p-4 rounded border ${vendor.fixed ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}
              >
                <p className="font-semibold">{vendor.name}</p>
                <div className="mt-2 text-sm grid grid-cols-2 gap-2">
                  <div>Total Cost: <strong>${vendor.totalCost}</strong></div>
                  <div>Deposit: <strong>${vendor.depositAmount}</strong></div>
                  <div>Old Balance: <strong>${vendor.oldBalance}</strong></div>
                  <div className={vendor.fixed ? 'text-green-600 font-bold' : ''}>
                    New Balance: <strong>${vendor.newBalance}</strong>
                  </div>
                </div>
                {vendor.fixed && (
                  <p className="mt-2 text-xs text-green-700">✓ Fixed!</p>
                )}
              </div>
            ))}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="font-semibold">
                Fixed {result.filter((v: any) => v.fixed).length} out of {result.length} vendors
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
