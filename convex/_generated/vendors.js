"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUploadUrl = exports.getVendorStats = exports.deleteVendor = exports.updatePaymentStatus = exports.addPayment = exports.updateVendor = exports.searchVendors = exports.getVendor = exports.getVendorsByStatus = exports.getVendorsByCategory = exports.getVendorsByWedding = exports.createVendor = void 0;
const values_1 = require("convex/values");
const server_1 = require("./_generated/server");
const vendorCategoryValues = values_1.v.union(values_1.v.literal('venue'), values_1.v.literal('catering'), values_1.v.literal('photography'), values_1.v.literal('videography'), values_1.v.literal('florist'), values_1.v.literal('music'), values_1.v.literal('decor'), values_1.v.literal('transportation'), values_1.v.literal('stationery'), values_1.v.literal('hair_makeup'), values_1.v.literal('attire'), values_1.v.literal('cake'), values_1.v.literal('other'));
const vendorStatusValues = values_1.v.union(values_1.v.literal('prospect'), values_1.v.literal('contacted'), values_1.v.literal('quoted'), values_1.v.literal('booked'), values_1.v.literal('confirmed'), values_1.v.literal('completed'), values_1.v.literal('cancelled'));
const paymentStatusValues = values_1.v.union(values_1.v.literal('unpaid'), values_1.v.literal('partial'), values_1.v.literal('paid'));
const paymentObject = values_1.v.object({
    id: values_1.v.string(),
    amount: values_1.v.number(),
    dueDate: values_1.v.string(),
    paidDate: values_1.v.optional(values_1.v.string()),
    status: paymentStatusValues,
    method: values_1.v.optional(values_1.v.string()),
    notes: values_1.v.optional(values_1.v.string()),
});
// Create a new vendor
exports.createVendor = (0, server_1.mutation)({
    args: {
        weddingId: values_1.v.id('weddings'),
        name: values_1.v.string(),
        category: vendorCategoryValues,
        contactName: values_1.v.optional(values_1.v.string()),
        email: values_1.v.optional(values_1.v.string()),
        phone: values_1.v.optional(values_1.v.string()),
        website: values_1.v.optional(values_1.v.string()),
        address: values_1.v.optional(values_1.v.string()),
        status: values_1.v.optional(vendorStatusValues),
        contractDate: values_1.v.optional(values_1.v.string()),
        serviceDate: values_1.v.optional(values_1.v.string()),
        totalCost: values_1.v.number(),
        depositAmount: values_1.v.optional(values_1.v.number()),
        depositPaidDate: values_1.v.optional(values_1.v.string()),
        balance: values_1.v.optional(values_1.v.number()),
        payments: values_1.v.optional(values_1.v.array(paymentObject)),
        budgetItemId: values_1.v.optional(values_1.v.id('event_budget')),
        contractStorageId: values_1.v.optional(values_1.v.id('_storage')),
        rating: values_1.v.optional(values_1.v.number()),
        performanceNotes: values_1.v.optional(values_1.v.string()),
        wouldRecommend: values_1.v.optional(values_1.v.boolean()),
        notes: values_1.v.optional(values_1.v.string()),
        tags: values_1.v.optional(values_1.v.array(values_1.v.string())),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        // Calculate initial balance: totalCost - depositAmount - payments
        const depositAmount = args.depositAmount || 0;
        const payments = args.payments || [];
        const totalPaidFromPayments = payments
            .filter((p) => p.status === 'paid')
            .reduce((sum, p) => sum + p.amount, 0);
        const initialBalance = args.balance ?? (args.totalCost - depositAmount - totalPaidFromPayments);
        console.log('=== CREATE VENDOR ===');
        console.log('Total Cost:', args.totalCost);
        console.log('Deposit Amount:', depositAmount);
        console.log('Paid Payments:', totalPaidFromPayments);
        console.log('Calculated Balance:', initialBalance);
        const vendorId = await ctx.db.insert('vendors', {
            weddingId: args.weddingId,
            name: args.name,
            category: args.category,
            contactName: args.contactName,
            email: args.email,
            phone: args.phone,
            website: args.website,
            address: args.address,
            status: args.status || 'prospect',
            contractDate: args.contractDate,
            serviceDate: args.serviceDate,
            totalCost: args.totalCost,
            depositAmount: args.depositAmount,
            depositPaidDate: args.depositPaidDate,
            balance: initialBalance,
            payments: payments,
            budgetItemId: args.budgetItemId,
            contractStorageId: args.contractStorageId,
            rating: args.rating,
            performanceNotes: args.performanceNotes,
            wouldRecommend: args.wouldRecommend,
            notes: args.notes,
            tags: args.tags,
        });
        // Generate contract URL if exists
        if (args.contractStorageId) {
            const contractUrl = await ctx.storage.getUrl(args.contractStorageId);
            await ctx.db.patch(vendorId, { contractUrl: contractUrl ?? undefined });
        }
        return vendorId;
    },
});
// Get all vendors for a wedding
exports.getVendorsByWedding = (0, server_1.query)({
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
        // Enrich with contract URLs
        return Promise.all(vendors.map(async (vendor) => {
            if (vendor.contractStorageId && !vendor.contractUrl) {
                const contractUrl = await ctx.storage.getUrl(vendor.contractStorageId);
                return { ...vendor, contractUrl: contractUrl ?? undefined };
            }
            return vendor;
        }));
    },
});
// Get vendors by category
exports.getVendorsByCategory = (0, server_1.query)({
    args: {
        weddingId: values_1.v.id('weddings'),
        category: vendorCategoryValues,
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.db
            .query('vendors')
            .withIndex('by_category', (q) => q.eq('weddingId', args.weddingId).eq('category', args.category))
            .collect();
    },
});
// Get vendors by status
exports.getVendorsByStatus = (0, server_1.query)({
    args: {
        weddingId: values_1.v.id('weddings'),
        status: vendorStatusValues,
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.db
            .query('vendors')
            .withIndex('by_status', (q) => q.eq('weddingId', args.weddingId).eq('status', args.status))
            .collect();
    },
});
// Get a single vendor by ID
exports.getVendor = (0, server_1.query)({
    args: {
        vendorId: values_1.v.id('vendors'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const vendor = await ctx.db.get(args.vendorId);
        if (!vendor) {
            return null;
        }
        // Generate contract URL if needed
        if (vendor.contractStorageId && !vendor.contractUrl) {
            const contractUrl = await ctx.storage.getUrl(vendor.contractStorageId);
            return { ...vendor, contractUrl: contractUrl ?? undefined };
        }
        return vendor;
    },
});
// Search vendors
exports.searchVendors = (0, server_1.query)({
    args: {
        weddingId: values_1.v.id('weddings'),
        query: values_1.v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.db
            .query('vendors')
            .withSearchIndex('search_vendors', (q) => q.search('name', args.query).eq('weddingId', args.weddingId))
            .collect();
    },
});
// Update a vendor
exports.updateVendor = (0, server_1.mutation)({
    args: {
        vendorId: values_1.v.id('vendors'),
        name: values_1.v.optional(values_1.v.string()),
        category: values_1.v.optional(vendorCategoryValues),
        contactName: values_1.v.optional(values_1.v.string()),
        email: values_1.v.optional(values_1.v.string()),
        phone: values_1.v.optional(values_1.v.string()),
        website: values_1.v.optional(values_1.v.string()),
        address: values_1.v.optional(values_1.v.string()),
        status: values_1.v.optional(vendorStatusValues),
        contractDate: values_1.v.optional(values_1.v.string()),
        serviceDate: values_1.v.optional(values_1.v.string()),
        totalCost: values_1.v.optional(values_1.v.number()),
        depositAmount: values_1.v.optional(values_1.v.number()),
        depositPaidDate: values_1.v.optional(values_1.v.string()),
        balance: values_1.v.optional(values_1.v.number()),
        payments: values_1.v.optional(values_1.v.array(paymentObject)),
        budgetItemId: values_1.v.optional(values_1.v.id('event_budget')),
        contractStorageId: values_1.v.optional(values_1.v.id('_storage')),
        rating: values_1.v.optional(values_1.v.number()),
        performanceNotes: values_1.v.optional(values_1.v.string()),
        wouldRecommend: values_1.v.optional(values_1.v.boolean()),
        notes: values_1.v.optional(values_1.v.string()),
        tags: values_1.v.optional(values_1.v.array(values_1.v.string())),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const { vendorId, ...updates } = args;
        // Get the current vendor
        const vendor = await ctx.db.get(vendorId);
        if (!vendor) {
            throw new Error('Vendor not found');
        }
        // Update contract URL if contractStorageId changed
        let contractUrl = vendor.contractUrl;
        if (updates.contractStorageId && updates.contractStorageId !== vendor.contractStorageId) {
            contractUrl = (await ctx.storage.getUrl(updates.contractStorageId)) ?? undefined;
        }
        // Always recalculate balance based on totalCost and depositAmount
        // Use the new values if provided, otherwise keep existing values
        const newTotalCost = updates.totalCost ?? vendor.totalCost;
        const newDepositAmount = updates.depositAmount ?? vendor.depositAmount ?? 0;
        // Calculate total paid from payments
        const totalPaidFromPayments = (vendor.payments || [])
            .filter((p) => p.status === 'paid')
            .reduce((sum, p) => sum + p.amount, 0);
        // New balance = totalCost - depositAmount - payments
        const newBalance = newTotalCost - newDepositAmount - totalPaidFromPayments;
        console.log('=== UPDATE VENDOR ===');
        console.log('Vendor:', vendor.name);
        console.log('New Total Cost:', newTotalCost);
        console.log('New Deposit Amount:', newDepositAmount);
        console.log('Paid Payments:', totalPaidFromPayments);
        console.log('Calculated Balance:', newBalance);
        // Update vendor with recalculated balance
        // Note: We spread updates first, then override balance to ensure our calculation takes precedence
        const patchData = {
            ...updates,
            balance: newBalance,
        };
        if (contractUrl) {
            patchData.contractUrl = contractUrl;
        }
        await ctx.db.patch(vendorId, patchData);
        return vendorId;
    },
});
// Add payment to vendor
exports.addPayment = (0, server_1.mutation)({
    args: {
        vendorId: values_1.v.id('vendors'),
        payment: paymentObject,
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const vendor = await ctx.db.get(args.vendorId);
        if (!vendor) {
            throw new Error('Vendor not found');
        }
        const updatedPayments = [...(vendor.payments || []), args.payment];
        // Recalculate balance
        const totalPaid = updatedPayments
            .filter((p) => p.status === 'paid')
            .reduce((sum, p) => sum + p.amount, 0);
        const balance = vendor.totalCost - (vendor.depositAmount || 0) - totalPaid;
        await ctx.db.patch(args.vendorId, {
            payments: updatedPayments,
            balance,
        });
        return args.vendorId;
    },
});
// Update payment status
exports.updatePaymentStatus = (0, server_1.mutation)({
    args: {
        vendorId: values_1.v.id('vendors'),
        paymentId: values_1.v.string(),
        status: paymentStatusValues,
        paidDate: values_1.v.optional(values_1.v.string()),
        method: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const vendor = await ctx.db.get(args.vendorId);
        if (!vendor) {
            throw new Error('Vendor not found');
        }
        const updatedPayments = (vendor.payments || []).map((p) => {
            if (p.id === args.paymentId) {
                return {
                    ...p,
                    status: args.status,
                    paidDate: args.paidDate || p.paidDate,
                    method: args.method || p.method,
                };
            }
            return p;
        });
        // Recalculate balance
        const totalPaid = updatedPayments
            .filter((p) => p.status === 'paid')
            .reduce((sum, p) => sum + p.amount, 0);
        const balance = vendor.totalCost - (vendor.depositAmount || 0) - totalPaid;
        await ctx.db.patch(args.vendorId, {
            payments: updatedPayments,
            balance,
        });
        return args.vendorId;
    },
});
// Delete a vendor
exports.deleteVendor = (0, server_1.mutation)({
    args: {
        vendorId: values_1.v.id('vendors'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const vendor = await ctx.db.get(args.vendorId);
        if (!vendor) {
            throw new Error('Vendor not found');
        }
        // Delete the contract from storage if it exists
        if (vendor.contractStorageId) {
            await ctx.storage.delete(vendor.contractStorageId);
        }
        await ctx.db.delete(args.vendorId);
        return { success: true };
    },
});
// Get vendor statistics
exports.getVendorStats = (0, server_1.query)({
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
        const totalVendors = vendors.length;
        const confirmedVendors = vendors.filter((v) => v.status === 'confirmed' || v.status === 'booked').length;
        const totalValue = vendors.reduce((sum, v) => sum + v.totalCost, 0);
        const totalPaid = vendors.reduce((sum, v) => {
            const depositPaid = v.depositAmount || 0;
            const paymentsPaid = (v.payments || []).filter((p) => p.status === 'paid').reduce((pSum, p) => pSum + p.amount, 0);
            return sum + depositPaid + paymentsPaid;
        }, 0);
        const totalOutstanding = totalValue - totalPaid;
        // Count by category
        const byCategory = vendors.reduce((acc, v) => {
            acc[v.category] = (acc[v.category] || 0) + 1;
            return acc;
        }, {});
        return {
            totalVendors,
            confirmedVendors,
            totalValue,
            totalPaid,
            totalOutstanding,
            byCategory,
        };
    },
});
// Generate upload URL for contract
exports.generateUploadUrl = (0, server_1.mutation)({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.storage.generateUploadUrl();
    },
});
