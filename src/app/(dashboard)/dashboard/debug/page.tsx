'use client';

import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { PageLoader } from '@/components/ui/loading-spinner';

export default function DebugPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fixVendorBalances = useMutation(api.migrations.fixVendorBalances);

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

  // Get debug vendor data
  const vendorData = useQuery(
    api.migrations.debugVendors,
    weddingId ? { weddingId } : 'skip'
  );

  const handleFixBalances = async () => {
    setLoading(true);
    try {
      const result = await fixVendorBalances({});
      setResult(result);
      toast({
        title: 'Success',
        description: result.message,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
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
        <h2 className="text-3xl font-bold tracking-tight">Debug Tools</h2>
        <p className="text-muted-foreground">
          Tools to fix data issues
        </p>
      </div>

      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Fix Vendor Balances</h3>
          <p className="text-sm text-muted-foreground mb-4">
            This will recalculate the balance for all vendors based on their total cost, deposit amount, and paid payments.
          </p>
          <Button onClick={handleFixBalances} disabled={loading}>
            {loading ? 'Fixing...' : 'Fix Vendor Balances'}
          </Button>

          {result && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
              <p className="text-sm font-medium text-green-900">{result.message}</p>
              <p className="text-xs text-green-700 mt-1">Fixed {result.fixed} vendor(s)</p>
            </div>
          )}
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Vendor Data</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Current vendor data from database
          </p>

          {vendorData === undefined ? (
            <p className="text-sm">Loading...</p>
          ) : vendorData.length === 0 ? (
            <p className="text-sm">No vendors found</p>
          ) : (
            <div className="space-y-3">
              {vendorData.map((vendor, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded border">
                  <p className="font-semibold">{vendor.name}</p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Cost:</span>{' '}
                      <span className="font-medium">${vendor.totalCost}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Deposit:</span>{' '}
                      <span className="font-medium">${vendor.depositAmount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Stored Balance:</span>{' '}
                      <span className="font-medium">${vendor.balance}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Calculated Balance:</span>{' '}
                      <span className={`font-medium ${vendor.balance !== vendor.calculatedBalance ? 'text-red-600' : 'text-green-600'}`}>
                        ${vendor.calculatedBalance}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Paid Payments:</span>{' '}
                      <span className="font-medium">${vendor.paidPaymentsTotal}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Payment Count:</span>{' '}
                      <span className="font-medium">{vendor.paymentsCount}</span>
                    </div>
                  </div>
                  {vendor.balance !== vendor.calculatedBalance && (
                    <p className="text-xs text-red-600 mt-2">
                      ⚠️ Balance mismatch! Stored: ${vendor.balance}, Should be: ${vendor.calculatedBalance}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
