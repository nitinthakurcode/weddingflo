import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// Migration to fix vendor balances
export const fixVendorBalances = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    // Get all vendors
    const vendors = await ctx.db.query('vendors').collect();

    let fixed = 0;
    for (const vendor of vendors) {
      const depositAmount = vendor.depositAmount || 0;
      const payments = vendor.payments || [];
      const totalPaidFromPayments = payments
        .filter((p) => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);

      // Calculate correct balance
      const correctBalance = vendor.totalCost - depositAmount - totalPaidFromPayments;

      // Only update if balance is different
      if (vendor.balance !== correctBalance) {
        await ctx.db.patch(vendor._id, {
          balance: correctBalance,
        });
        fixed++;
      }
    }

    return { message: `Fixed ${fixed} vendor(s) with incorrect balances`, fixed };
  },
});

// Debug query to inspect vendor data
export const debugVendors = query({
  args: {
    weddingId: v.id('weddings'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const vendors = await ctx.db
      .query('vendors')
      .withIndex('by_wedding', (q) => q.eq('weddingId', args.weddingId))
      .collect();

    return vendors.map((v) => ({
      name: v.name,
      totalCost: v.totalCost,
      depositAmount: v.depositAmount || 0,
      balance: v.balance,
      paymentsCount: (v.payments || []).length,
      paidPaymentsTotal: (v.payments || [])
        .filter((p) => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0),
      calculatedBalance: v.totalCost - (v.depositAmount || 0) - (v.payments || [])
        .filter((p) => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0),
    }));
  },
});
