"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBudget = exports.uploadReceipt = exports.linkVendor = exports.calculateVariance = exports.update = exports.create = exports.getByCategory = exports.list = exports.get = void 0;
const values_1 = require("convex/values");
const server_1 = require("./_generated/server");
exports.get = (0, server_1.query)({
    args: { budgetId: values_1.v.id('event_budget') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.db.get(args.budgetId);
    },
});
exports.list = (0, server_1.query)({
    args: { clientId: values_1.v.id('clients') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.db
            .query('event_budget')
            .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
            .collect();
    },
});
exports.getByCategory = (0, server_1.query)({
    args: { clientId: values_1.v.id('clients'), category: values_1.v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.db
            .query('event_budget')
            .withIndex('by_category', (q) => q.eq('client_id', args.clientId).eq('category', args.category))
            .collect();
    },
});
exports.create = (0, server_1.mutation)({
    args: {
        company_id: values_1.v.id('companies'),
        client_id: values_1.v.id('clients'),
        expense_details: values_1.v.string(),
        category: values_1.v.string(),
        subcategory: values_1.v.optional(values_1.v.string()),
        event_name: values_1.v.string(),
        budget: values_1.v.number(),
        estimated_cost: values_1.v.number(),
        priority: values_1.v.union(values_1.v.literal('critical'), values_1.v.literal('high'), values_1.v.literal('medium'), values_1.v.literal('low')),
        vendor_id: values_1.v.optional(values_1.v.id('vendors')),
        tags: values_1.v.array(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
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
exports.update = (0, server_1.mutation)({
    args: {
        budgetId: values_1.v.id('event_budget'),
        expense_details: values_1.v.optional(values_1.v.string()),
        budget: values_1.v.optional(values_1.v.number()),
        estimated_cost: values_1.v.optional(values_1.v.number()),
        actual_cost: values_1.v.optional(values_1.v.number()),
        paid_amount: values_1.v.optional(values_1.v.number()),
        payment_method: values_1.v.optional(values_1.v.string()),
        paid_by: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const { budgetId, ...updates } = args;
        const budget = await ctx.db.get(budgetId);
        if (!budget)
            throw new Error('Budget item not found');
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
exports.calculateVariance = (0, server_1.query)({
    args: { clientId: values_1.v.id('clients') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
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
exports.linkVendor = (0, server_1.mutation)({
    args: {
        budgetId: values_1.v.id('event_budget'),
        vendor_id: values_1.v.id('vendors'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        await ctx.db.patch(args.budgetId, {
            vendor_id: args.vendor_id,
            updated_at: Date.now(),
        });
        return args.budgetId;
    },
});
exports.uploadReceipt = (0, server_1.mutation)({
    args: {
        budgetId: values_1.v.id('event_budget'),
        receipt_url: values_1.v.string(),
        receipt_ocr_data: values_1.v.optional(values_1.v.any()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        await ctx.db.patch(args.budgetId, {
            receipt_url: args.receipt_url,
            receipt_ocr_data: args.receipt_ocr_data,
            updated_at: Date.now(),
        });
        return args.budgetId;
    },
});
exports.deleteBudget = (0, server_1.mutation)({
    args: { budgetId: values_1.v.id('event_budget') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        await ctx.db.delete(args.budgetId);
        return { success: true };
    },
});
