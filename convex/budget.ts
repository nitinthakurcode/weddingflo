import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { Id } from './_generated/dataModel';

// Get all budget items for a wedding
export const getBudgetItemsByWedding = query({
  args: {
    weddingId: v.id('weddings'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    // Get the wedding to get its client_id
    const wedding = await ctx.db.get(args.weddingId);
    if (!wedding) {
      return [];
    }

    const items = await ctx.db
      .query('event_budget')
      .filter((q) => q.eq(q.field('client_id'), wedding.client_id))
      .collect();

    // Enrich with receipt URLs if available
    return Promise.all(
      items.map(async (item) => {
        return {
          _id: item._id,
          weddingId: args.weddingId,
          category: item.category as any,
          item_name: item.expense_details,
          description: item.subcategory,
          budget: item.budget,
          actual_cost: item.actual_cost,
          paid_amount: item.paid_amount,
          vendor_id: item.vendor_id,
          payment_status:
            item.paid_amount >= item.actual_cost ? 'paid' as const :
            item.paid_amount > 0 ? 'partial' as const :
            'unpaid' as const,
          due_date: item.transaction_date ? new Date(item.transaction_date).toISOString().split('T')[0] : undefined,
          paid_date: item.paid_amount > 0 && item.transaction_date ? new Date(item.transaction_date).toISOString().split('T')[0] : undefined,
          receipt_url: item.receipt_url,
          notes: item.notes,
          created_at: item.created_at,
          updated_at: item.updated_at,
        };
      })
    );
  },
});

// Get budget statistics
export const getBudgetStats = query({
  args: {
    weddingId: v.id('weddings'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    // Get the wedding to get its client_id
    const wedding = await ctx.db.get(args.weddingId);
    if (!wedding) {
      return {
        totalBudget: 0,
        totalSpent: 0,
        totalPaid: 0,
        totalRemaining: 0,
        variance: 0,
        variancePercentage: 0,
        itemCount: 0,
        paidCount: 0,
        overdueCount: 0,
      };
    }

    const items = await ctx.db
      .query('event_budget')
      .filter((q) => q.eq(q.field('client_id'), wedding.client_id))
      .collect();

    const totalBudget = items.reduce((sum, item) => sum + item.budget, 0);
    const totalSpent = items.reduce((sum, item) => sum + item.actual_cost, 0);
    const totalPaid = items.reduce((sum, item) => sum + item.paid_amount, 0);
    const totalRemaining = totalBudget - totalSpent;
    const variance = totalBudget - totalSpent;
    const variancePercentage = totalBudget > 0 ? (variance / totalBudget) * 100 : 0;

    const paidCount = items.filter((item) => item.paid_amount >= item.actual_cost).length;
    const overdueCount = 0; // Would need due_date logic to calculate properly

    return {
      totalBudget,
      totalSpent,
      totalPaid,
      totalRemaining,
      variance,
      variancePercentage,
      itemCount: items.length,
      paidCount,
      overdueCount,
    };
  },
});

// Get category breakdown for charts
export const getCategoryBreakdown = query({
  args: {
    weddingId: v.id('weddings'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    // Get the wedding to get its client_id
    const wedding = await ctx.db.get(args.weddingId);
    if (!wedding) {
      return [];
    }

    const items = await ctx.db
      .query('event_budget')
      .filter((q) => q.eq(q.field('client_id'), wedding.client_id))
      .collect();

    const categoryMap = new Map<string, { budget: number; spent: number }>();

    items.forEach((item) => {
      const existing = categoryMap.get(item.category) || { budget: 0, spent: 0 };
      categoryMap.set(item.category, {
        budget: existing.budget + item.budget,
        spent: existing.spent + item.actual_cost,
      });
    });

    const totalBudget = items.reduce((sum, item) => sum + item.budget, 0);

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      budget: data.budget,
      spent: data.spent,
      variance: data.budget - data.spent,
      percentage: totalBudget > 0 ? (data.budget / totalBudget) * 100 : 0,
    }));
  },
});

// Get spending timeline for charts
export const getSpendingTimeline = query({
  args: {
    weddingId: v.id('weddings'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    // Get the wedding to get its client_id
    const wedding = await ctx.db.get(args.weddingId);
    if (!wedding) {
      return [];
    }

    const items = await ctx.db
      .query('event_budget')
      .filter((q) => q.eq(q.field('client_id'), wedding.client_id))
      .collect();

    const dateMap = new Map<string, number>();

    items.forEach((item) => {
      if (item.transaction_date && item.paid_amount > 0) {
        const date = new Date(item.transaction_date).toISOString().split('T')[0];
        const existing = dateMap.get(date) || 0;
        dateMap.set(date, existing + item.paid_amount);
      }
    });

    const sorted = Array.from(dateMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    let cumulative = 0;
    return sorted.map(([date, amount]) => {
      cumulative += amount;
      return { date, amount, cumulative };
    });
  },
});

// Create new budget item
export const createBudgetItem = mutation({
  args: {
    weddingId: v.id('weddings'),
    category: v.string(),
    item_name: v.string(),
    description: v.optional(v.string()),
    budget: v.number(),
    actual_cost: v.number(),
    paid_amount: v.number(),
    vendor_id: v.optional(v.id('vendors')),
    payment_status: v.union(
      v.literal('unpaid'),
      v.literal('partial'),
      v.literal('paid'),
      v.literal('overdue')
    ),
    due_date: v.optional(v.string()),
    paid_date: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    // Get the wedding to get company_id and client_id
    const wedding = await ctx.db.get(args.weddingId);
    if (!wedding) {
      throw new Error('Wedding not found');
    }

    const variance = args.budget - args.actual_cost;
    const variancePercentage = args.budget > 0 ? (variance / args.budget) * 100 : 0;

    const budgetId = await ctx.db.insert('event_budget', {
      company_id: wedding.company_id,
      client_id: wedding.client_id,
      expense_details: args.item_name,
      category: args.category,
      subcategory: args.description,
      event_name: wedding.wedding_name,
      budget: args.budget,
      estimated_cost: args.actual_cost,
      actual_cost: args.actual_cost,
      variance,
      variance_percentage: variancePercentage,
      paid_amount: args.paid_amount,
      pending_amount: args.actual_cost - args.paid_amount,
      transaction_date: args.paid_date ? new Date(args.paid_date).getTime() : undefined,
      payment_method: undefined,
      paid_by: undefined,
      receipt_url: undefined,
      receipt_ocr_data: undefined,
      vendor_id: args.vendor_id,
      ai_predicted_final_cost: undefined,
      ai_confidence_score: undefined,
      priority: 'medium',
      notes: args.notes,
      tags: [],
      created_at: Date.now(),
      updated_at: Date.now(),
    });

    return budgetId;
  },
});

// Update budget item (supports inline editing)
export const updateBudgetItem = mutation({
  args: {
    budgetItemId: v.id('event_budget'),
    category: v.optional(v.string()),
    item_name: v.optional(v.string()),
    description: v.optional(v.string()),
    budget: v.optional(v.number()),
    actual_cost: v.optional(v.number()),
    paid_amount: v.optional(v.number()),
    vendor_id: v.optional(v.id('vendors')),
    payment_status: v.optional(
      v.union(
        v.literal('unpaid'),
        v.literal('partial'),
        v.literal('paid'),
        v.literal('overdue')
      )
    ),
    due_date: v.optional(v.string()),
    paid_date: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const { budgetItemId, ...updates } = args;

    const existing = await ctx.db.get(budgetItemId);
    if (!existing) {
      throw new Error('Budget item not found');
    }

    const budget = updates.budget ?? existing.budget;
    const actual_cost = updates.actual_cost ?? existing.actual_cost;
    const paid_amount = updates.paid_amount ?? existing.paid_amount;

    const variance = budget - actual_cost;
    const variancePercentage = budget > 0 ? (variance / budget) * 100 : 0;

    await ctx.db.patch(budgetItemId, {
      ...(updates.item_name && { expense_details: updates.item_name }),
      ...(updates.category && { category: updates.category }),
      ...(updates.description && { subcategory: updates.description }),
      ...(updates.budget !== undefined && { budget: updates.budget }),
      ...(updates.actual_cost !== undefined && {
        actual_cost: updates.actual_cost,
        estimated_cost: updates.actual_cost,
      }),
      ...(updates.paid_amount !== undefined && { paid_amount: updates.paid_amount }),
      ...(updates.vendor_id && { vendor_id: updates.vendor_id }),
      ...(updates.paid_date && { transaction_date: new Date(updates.paid_date).getTime() }),
      ...(updates.notes && { notes: updates.notes }),
      variance,
      variance_percentage: variancePercentage,
      pending_amount: actual_cost - paid_amount,
      updated_at: Date.now(),
    });

    return budgetItemId;
  },
});

// Delete budget item
export const deleteBudgetItem = mutation({
  args: {
    budgetItemId: v.id('event_budget'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const item = await ctx.db.get(args.budgetItemId);
    if (!item) {
      throw new Error('Budget item not found');
    }

    await ctx.db.delete(args.budgetItemId);
    return { success: true };
  },
});

// Generate upload URL for receipts
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    return await ctx.storage.generateUploadUrl();
  },
});

// Update payment status
export const updatePaymentStatus = mutation({
  args: {
    budgetItemId: v.id('event_budget'),
    payment_status: v.union(
      v.literal('unpaid'),
      v.literal('partial'),
      v.literal('paid'),
      v.literal('overdue')
    ),
    paid_amount: v.optional(v.number()),
    paid_date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const existing = await ctx.db.get(args.budgetItemId);
    if (!existing) {
      throw new Error('Budget item not found');
    }

    const paid_amount = args.paid_amount ?? existing.paid_amount;

    await ctx.db.patch(args.budgetItemId, {
      paid_amount,
      pending_amount: existing.actual_cost - paid_amount,
      ...(args.paid_date && { transaction_date: new Date(args.paid_date).getTime() }),
      updated_at: Date.now(),
    });

    return args.budgetItemId;
  },
});
