import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { Id } from './_generated/dataModel';

const vendorCategoryValues = v.union(
  v.literal('venue'),
  v.literal('catering'),
  v.literal('photography'),
  v.literal('videography'),
  v.literal('florist'),
  v.literal('music'),
  v.literal('decor'),
  v.literal('transportation'),
  v.literal('stationery'),
  v.literal('hair_makeup'),
  v.literal('attire'),
  v.literal('cake'),
  v.literal('other')
);

const vendorStatusValues = v.union(
  v.literal('prospect'),
  v.literal('contacted'),
  v.literal('quoted'),
  v.literal('booked'),
  v.literal('confirmed'),
  v.literal('completed'),
  v.literal('cancelled')
);

const paymentStatusValues = v.union(v.literal('unpaid'), v.literal('partial'), v.literal('paid'));

const paymentObject = v.object({
  id: v.string(),
  amount: v.number(),
  dueDate: v.string(),
  paidDate: v.optional(v.string()),
  status: paymentStatusValues,
  method: v.optional(v.string()),
  notes: v.optional(v.string()),
});

// Create a new vendor
export const createVendor = mutation({
  args: {
    weddingId: v.id('weddings'),
    name: v.string(),
    category: vendorCategoryValues,
    contactName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    address: v.optional(v.string()),
    status: v.optional(vendorStatusValues),
    contractDate: v.optional(v.string()),
    serviceDate: v.optional(v.string()),
    totalCost: v.number(),
    depositAmount: v.optional(v.number()),
    depositPaidDate: v.optional(v.string()),
    balance: v.optional(v.number()),
    payments: v.optional(v.array(paymentObject)),
    budgetItemId: v.optional(v.id('event_budget')),
    contractStorageId: v.optional(v.id('_storage')),
    rating: v.optional(v.number()),
    performanceNotes: v.optional(v.string()),
    wouldRecommend: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

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
export const getVendorsByWedding = query({
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

    // Enrich with contract URLs
    return Promise.all(
      vendors.map(async (vendor) => {
        if (vendor.contractStorageId && !vendor.contractUrl) {
          const contractUrl = await ctx.storage.getUrl(vendor.contractStorageId);
          return { ...vendor, contractUrl: contractUrl ?? undefined };
        }
        return vendor;
      })
    );
  },
});

// Get vendors by category
export const getVendorsByCategory = query({
  args: {
    weddingId: v.id('weddings'),
    category: vendorCategoryValues,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    return await ctx.db
      .query('vendors')
      .withIndex('by_category', (q) => q.eq('weddingId', args.weddingId).eq('category', args.category))
      .collect();
  },
});

// Get vendors by status
export const getVendorsByStatus = query({
  args: {
    weddingId: v.id('weddings'),
    status: vendorStatusValues,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    return await ctx.db
      .query('vendors')
      .withIndex('by_status', (q) => q.eq('weddingId', args.weddingId).eq('status', args.status))
      .collect();
  },
});

// Get a single vendor by ID
export const getVendor = query({
  args: {
    vendorId: v.id('vendors'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

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
export const searchVendors = query({
  args: {
    weddingId: v.id('weddings'),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    return await ctx.db
      .query('vendors')
      .withSearchIndex('search_vendors', (q) => q.search('name', args.query).eq('weddingId', args.weddingId))
      .collect();
  },
});

// Update a vendor
export const updateVendor = mutation({
  args: {
    vendorId: v.id('vendors'),
    name: v.optional(v.string()),
    category: v.optional(vendorCategoryValues),
    contactName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    address: v.optional(v.string()),
    status: v.optional(vendorStatusValues),
    contractDate: v.optional(v.string()),
    serviceDate: v.optional(v.string()),
    totalCost: v.optional(v.number()),
    depositAmount: v.optional(v.number()),
    depositPaidDate: v.optional(v.string()),
    balance: v.optional(v.number()),
    payments: v.optional(v.array(paymentObject)),
    budgetItemId: v.optional(v.id('event_budget')),
    contractStorageId: v.optional(v.id('_storage')),
    rating: v.optional(v.number()),
    performanceNotes: v.optional(v.string()),
    wouldRecommend: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

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
    const patchData: any = {
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
export const addPayment = mutation({
  args: {
    vendorId: v.id('vendors'),
    payment: paymentObject,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

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
export const updatePaymentStatus = mutation({
  args: {
    vendorId: v.id('vendors'),
    paymentId: v.string(),
    status: paymentStatusValues,
    paidDate: v.optional(v.string()),
    method: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

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
export const deleteVendor = mutation({
  args: {
    vendorId: v.id('vendors'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

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
export const getVendorStats = query({
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
    }, {} as Record<string, number>);

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
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    return await ctx.storage.generateUploadUrl();
  },
});
