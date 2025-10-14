"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategoryBreakdown = exports.getBudgetHealth = exports.updateSummary = exports.get = void 0;
const values_1 = require("convex/values");
const server_1 = require("./_generated/server");
exports.get = (0, server_1.query)({
    args: { clientId: values_1.v.id('clients') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.db
            .query('budget_summary')
            .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
            .first();
    },
});
exports.updateSummary = (0, server_1.mutation)({
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
        const totalEstimated = budgets.reduce((sum, b) => sum + b.estimated_cost, 0);
        const totalActual = budgets.reduce((sum, b) => sum + b.actual_cost, 0);
        const totalPaid = budgets.reduce((sum, b) => sum + b.paid_amount, 0);
        const totalPending = budgets.reduce((sum, b) => sum + b.pending_amount, 0);
        const categoryMap = new Map();
        budgets.forEach((b) => {
            const existing = categoryMap.get(b.category) || { budget: 0, actual: 0 };
            categoryMap.set(b.category, {
                budget: existing.budget + b.budget,
                actual: existing.actual + b.actual_cost,
            });
        });
        const category_breakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
            category,
            budget: data.budget,
            actual: data.actual,
            variance: data.budget - data.actual,
        }));
        const overbudget_categories = category_breakdown
            .filter((c) => c.variance < 0)
            .map((c) => c.category);
        let budget_health;
        const spendPercentage = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
        if (spendPercentage <= 85)
            budget_health = 'excellent';
        else if (spendPercentage <= 95)
            budget_health = 'good';
        else if (spendPercentage <= 105)
            budget_health = 'warning';
        else
            budget_health = 'critical';
        const existing = await ctx.db
            .query('budget_summary')
            .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
            .first();
        const summaryData = {
            client_id: args.clientId,
            total_budget: totalBudget,
            total_estimated: totalEstimated,
            total_actual: totalActual,
            total_paid: totalPaid,
            total_pending: totalPending,
            category_breakdown,
            budget_health,
            overbudget_categories,
            savings_opportunities: [],
            last_updated: Date.now(),
        };
        if (existing) {
            await ctx.db.patch(existing._id, summaryData);
            return existing._id;
        }
        else {
            return await ctx.db.insert('budget_summary', summaryData);
        }
    },
});
exports.getBudgetHealth = (0, server_1.query)({
    args: { clientId: values_1.v.id('clients') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const summary = await ctx.db
            .query('budget_summary')
            .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
            .first();
        return summary?.budget_health || 'good';
    },
});
exports.getCategoryBreakdown = (0, server_1.query)({
    args: { clientId: values_1.v.id('clients') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const summary = await ctx.db
            .query('budget_summary')
            .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
            .first();
        return summary?.category_breakdown || [];
    },
});
