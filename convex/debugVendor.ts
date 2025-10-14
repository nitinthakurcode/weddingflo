import { query } from './_generated/server';
import { v } from 'convex/values';

// Check what's actually stored in the database for a vendor
export const getVendorDebugInfo = query({
  args: {
    vendorId: v.id('vendors'),
  },
  handler: async (ctx, args) => {
    const vendor = await ctx.db.get(args.vendorId);

    if (!vendor) {
      return { error: 'Vendor not found' };
    }

    const depositAmount = vendor.depositAmount || 0;
    const payments = vendor.payments || [];
    const totalPaidFromPayments = payments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
    const calculatedBalance = vendor.totalCost - depositAmount - totalPaidFromPayments;

    return {
      name: vendor.name,
      totalCost: vendor.totalCost,
      depositAmount: depositAmount,
      storedBalance: vendor.balance,
      calculatedBalance: calculatedBalance,
      paymentsCount: payments.length,
      paidPayments: totalPaidFromPayments,
      isCorrect: vendor.balance === calculatedBalance,
      formula: `${vendor.totalCost} - ${depositAmount} - ${totalPaidFromPayments} = ${calculatedBalance}`,
    };
  },
});

// Get all vendors with debug info
export const getAllVendorsDebug = query({
  args: {
    weddingId: v.id('weddings'),
  },
  handler: async (ctx, args) => {
    const vendors = await ctx.db
      .query('vendors')
      .withIndex('by_wedding', (q) => q.eq('weddingId', args.weddingId))
      .collect();

    return vendors.map((vendor) => {
      const depositAmount = vendor.depositAmount || 0;
      const payments = vendor.payments || [];
      const totalPaidFromPayments = payments
        .filter((p) => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);
      const calculatedBalance = vendor.totalCost - depositAmount - totalPaidFromPayments;

      return {
        _id: vendor._id,
        name: vendor.name,
        totalCost: vendor.totalCost,
        depositAmount: depositAmount,
        storedBalance: vendor.balance,
        calculatedBalance: calculatedBalance,
        isCorrect: vendor.balance === calculatedBalance,
      };
    });
  },
});
