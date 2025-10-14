import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const get = query({
  args: { budgetId: v.id('event_budget') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    return await ctx.db.get(args.budgetId);
  },
});

export const list = query({
  args: { clientId: v.id('clients') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    return await ctx.db
      .query('event_budget')
      .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
      .collect();
  },
});

export const getByCategory = query({
  args: { clientId: v.id('clients'), category: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    return await ctx.db
      .query('event_budget')
      .withIndex('by_category', (q) => q.eq('client_id', args.clientId).eq('category', args.category))
      .collect();
  },
});

export const create = mutation({
  args: {
    company_id: v.id('companies'),
    client_id: v.id('clients'),
    expense_details: v.string(),
    category: v.string(),
    subcategory: v.optional(v.string()),
    event_name: v.string(),
    budget: v.number(),
    estimated_cost: v.number(),
    priority: v.union(
      v.literal('critical'),
      v.literal('high'),
      v.literal('medium'),
      v.literal('low')
    ),
    vendor_id: v.optional(v.id('vendors')),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const now = Date.now();
    return await ctx.db.insert('event_budget', {
      ...args,
      actual_cost: 0,
      variance: args.budget - args.estimated_cost,
      variance_percentage: ((args.budget - args.estimated_cost) / args.budget) * 100,
      paid_amount: 0,
      pending_amount: args.estimated_cost,
      created_at: now,
      updated_at: now,
    });
  },
});

export const update = mutation({
  args: {
    budgetId: v.id('event_budget'),
    expense_details: v.optional(v.string()),
    budget: v.optional(v.number()),
    estimated_cost: v.optional(v.number()),
    actual_cost: v.optional(v.number()),
    paid_amount: v.optional(v.number()),
    payment_method: v.optional(v.string()),
    paid_by: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const { budgetId, ...updates } = args;
    const budget = await ctx.db.get(budgetId);
    if (!budget) throw new Error('Budget item not found');

    const newBudget = updates.budget || budget.budget;
    const newActualCost = updates.actual_cost !== undefined ? updates.actual_cost : budget.actual_cost;
    const variance = newBudget - newActualCost;
    const variance_percentage = (variance / newBudget) * 100;

    const newPaidAmount = updates.paid_amount !== undefined ? updates.paid_amount : budget.paid_amount;
    const pending_amount = newActualCost - newPaidAmount;

    await ctx.db.patch(budgetId, {
      ...updates,
      variance,
      variance_percentage,
      pending_amount,
      updated_at: Date.now(),
    });
    return budgetId;
  },
});

export const calculateVariance = query({
  args: { clientId: v.id('clients') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const budgets = await ctx.db
      .query('event_budget')
      .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
      .collect();

    const totalBudget = budgets.reduce((sum, b) => sum + b.budget, 0);
    const totalActual = budgets.reduce((sum, b) => sum + b.actual_cost, 0);
    const variance = totalBudget - totalActual;

    return {
      totalBudget,
      totalActual,
      variance,
      variance_percentage: totalBudget > 0 ? (variance / totalBudget) * 100 : 0,
    };
  },
});

export const linkVendor = mutation({
  args: {
    budgetId: v.id('event_budget'),
    vendor_id: v.id('vendors'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    await ctx.db.patch(args.budgetId, {
      vendor_id: args.vendor_id,
      updated_at: Date.now(),
    });
    return args.budgetId;
  },
});

export const uploadReceipt = mutation({
  args: {
    budgetId: v.id('event_budget'),
    receipt_url: v.string(),
    receipt_ocr_data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    await ctx.db.patch(args.budgetId, {
      receipt_url: args.receipt_url,
      receipt_ocr_data: args.receipt_ocr_data,
      updated_at: Date.now(),
    });
    return args.budgetId;
  },
});

export const deleteBudget = mutation({
  args: { budgetId: v.id('event_budget') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    await ctx.db.delete(args.budgetId);
    return { success: true };
  },
});
