"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePaymentStatus = exports.generateUploadUrl = exports.deleteBudgetItem = exports.updateBudgetItem = exports.createBudgetItem = exports.getSpendingTimeline = exports.getCategoryBreakdown = exports.getBudgetStats = exports.getBudgetItemsByWedding = void 0;
const values_1 = require("convex/values");
const server_1 = require("./_generated/server");
// Get all budget items for a wedding
exports.getBudgetItemsByWedding = (0, server_1.query)({
    args: {
        weddingId: values_1.v.id('weddings'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
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
        return Promise.all(items.map(async (item) => {
            return {
                _id: item._id,
                weddingId: args.weddingId,
                category: item.category,
                item_name: item.expense_details,
                description: item.subcategory,
                budget: item.budget,
                actual_cost: item.actual_cost,
                paid_amount: item.paid_amount,
                vendor_id: item.vendor_id,
                payment_status: item.paid_amount >= item.actual_cost ? 'paid' :
                    item.paid_amount > 0 ? 'partial' :
                        'unpaid',
                due_date: item.transaction_date ? new Date(item.transaction_date).toISOString().split('T')[0] : undefined,
                paid_date: item.paid_amount > 0 && item.transaction_date ? new Date(item.transaction_date).toISOString().split('T')[0] : undefined,
                receipt_url: item.receipt_url,
                notes: item.notes,
                created_at: item.created_at,
                updated_at: item.updated_at,
            };
        }));
    },
});
// Get budget statistics
exports.getBudgetStats = (0, server_1.query)({
    args: {
        weddingId: values_1.v.id('weddings'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
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
exports.getCategoryBreakdown = (0, server_1.query)({
    args: {
        weddingId: values_1.v.id('weddings'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        // Get the wedding to get its client_id
        const wedding = await ctx.db.get(args.weddingId);
        if (!wedding) {
            return [];
        }
        const items = await ctx.db
            .query('event_budget')
            .filter((q) => q.eq(q.field('client_id'), wedding.client_id))
            .collect();
        const categoryMap = new Map();
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
exports.getSpendingTimeline = (0, server_1.query)({
    args: {
        weddingId: values_1.v.id('weddings'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        // Get the wedding to get its client_id
        const wedding = await ctx.db.get(args.weddingId);
        if (!wedding) {
            return [];
        }
        const items = await ctx.db
            .query('event_budget')
            .filter((q) => q.eq(q.field('client_id'), wedding.client_id))
            .collect();
        const dateMap = new Map();
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
exports.createBudgetItem = (0, server_1.mutation)({
    args: {
        weddingId: values_1.v.id('weddings'),
        category: values_1.v.string(),
        item_name: values_1.v.string(),
        description: values_1.v.optional(values_1.v.string()),
        budget: values_1.v.number(),
        actual_cost: values_1.v.number(),
        paid_amount: values_1.v.number(),
        vendor_id: values_1.v.optional(values_1.v.id('vendors')),
        payment_status: values_1.v.union(values_1.v.literal('unpaid'), values_1.v.literal('partial'), values_1.v.literal('paid'), values_1.v.literal('overdue')),
        due_date: values_1.v.optional(values_1.v.string()),
        paid_date: values_1.v.optional(values_1.v.string()),
        notes: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
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
exports.updateBudgetItem = (0, server_1.mutation)({
    args: {
        budgetItemId: values_1.v.id('event_budget'),
        category: values_1.v.optional(values_1.v.string()),
        item_name: values_1.v.optional(values_1.v.string()),
        description: values_1.v.optional(values_1.v.string()),
        budget: values_1.v.optional(values_1.v.number()),
        actual_cost: values_1.v.optional(values_1.v.number()),
        paid_amount: values_1.v.optional(values_1.v.number()),
        vendor_id: values_1.v.optional(values_1.v.id('vendors')),
        payment_status: values_1.v.optional(values_1.v.union(values_1.v.literal('unpaid'), values_1.v.literal('partial'), values_1.v.literal('paid'), values_1.v.literal('overdue'))),
        due_date: values_1.v.optional(values_1.v.string()),
        paid_date: values_1.v.optional(values_1.v.string()),
        notes: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
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
exports.deleteBudgetItem = (0, server_1.mutation)({
    args: {
        budgetItemId: values_1.v.id('event_budget'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const item = await ctx.db.get(args.budgetItemId);
        if (!item) {
            throw new Error('Budget item not found');
        }
        await ctx.db.delete(args.budgetItemId);
        return { success: true };
    },
});
// Generate upload URL for receipts
exports.generateUploadUrl = (0, server_1.mutation)({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.storage.generateUploadUrl();
    },
});
// Update payment status
exports.updatePaymentStatus = (0, server_1.mutation)({
    args: {
        budgetItemId: values_1.v.id('event_budget'),
        payment_status: values_1.v.union(values_1.v.literal('unpaid'), values_1.v.literal('partial'), values_1.v.literal('paid'), values_1.v.literal('overdue')),
        paid_amount: values_1.v.optional(values_1.v.number()),
        paid_date: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
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
