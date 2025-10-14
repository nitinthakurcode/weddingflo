"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkVendor = exports.fixAllVendorBalances = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
// One-time fix to recalculate all vendor balances
exports.fixAllVendorBalances = (0, server_1.mutation)({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        // Get ALL vendors
        const vendors = await ctx.db.query('vendors').collect();
        const results = [];
        for (const vendor of vendors) {
            const oldBalance = vendor.balance;
            const depositAmount = vendor.depositAmount || 0;
            const payments = vendor.payments || [];
            const totalPaidFromPayments = payments
                .filter((p) => p.status === 'paid')
                .reduce((sum, p) => sum + p.amount, 0);
            // Calculate correct balance: totalCost - depositAmount - paidPayments
            const correctBalance = vendor.totalCost - depositAmount - totalPaidFromPayments;
            // Update the vendor
            await ctx.db.patch(vendor._id, {
                balance: correctBalance,
            });
            results.push({
                name: vendor.name,
                totalCost: vendor.totalCost,
                depositAmount: depositAmount,
                oldBalance: oldBalance,
                newBalance: correctBalance,
                fixed: oldBalance !== correctBalance,
            });
        }
        return results;
    },
});
// Check a specific vendor's calculation
exports.checkVendor = (0, server_1.mutation)({
    args: {
        vendorId: values_1.v.id('vendors'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const vendor = await ctx.db.get(args.vendorId);
        if (!vendor)
            throw new Error('Vendor not found');
        const depositAmount = vendor.depositAmount || 0;
        const payments = vendor.payments || [];
        const totalPaidFromPayments = payments
            .filter((p) => p.status === 'paid')
            .reduce((sum, p) => sum + p.amount, 0);
        const correctBalance = vendor.totalCost - depositAmount - totalPaidFromPayments;
        return {
            name: vendor.name,
            totalCost: vendor.totalCost,
            depositAmount: depositAmount,
            currentBalance: vendor.balance,
            calculatedBalance: correctBalance,
            paymentsCount: payments.length,
            paidPaymentsTotal: totalPaidFromPayments,
            needsFix: vendor.balance !== correctBalance,
        };
    },
});
