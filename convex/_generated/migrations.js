"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugVendors = exports.fixVendorBalances = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
// Migration to fix vendor balances
exports.fixVendorBalances = (0, server_1.mutation)({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
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
exports.debugVendors = (0, server_1.query)({
    args: {
        weddingId: values_1.v.id('weddings'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
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
