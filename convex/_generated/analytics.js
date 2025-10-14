"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSnapshot = exports.getTrends = exports.getInsights = exports.getDashboardStats = void 0;
const values_1 = require("convex/values");
const server_1 = require("./_generated/server");
exports.getDashboardStats = (0, server_1.query)({
    args: { clientId: values_1.v.id('clients') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const [guests, budgetItems, client] = await Promise.all([
            ctx.db
                .query('guests')
                .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
                .collect(),
            ctx.db
                .query('event_budget')
                .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
                .collect(),
            ctx.db.get(args.clientId),
        ]);
        if (!client)
            throw new Error('Client not found');
        const guestsCheckedIn = guests.filter((g) => g.checked_in).length;
        const vendorsConfirmed = 0; // TODO: Fix when vendor schema is updated
        const totalBudget = budgetItems.reduce((sum, item) => sum + item.budget, 0);
        const totalActual = budgetItems.reduce((sum, item) => sum + item.actual_cost, 0);
        const daysUntilWedding = Math.ceil((client.wedding_date - Date.now()) / (1000 * 60 * 60 * 24));
        return {
            guests_total: guests.length,
            guests_confirmed: guests.filter((g) => g.form_submitted).length,
            guests_checked_in: guestsCheckedIn,
            vendors_total: 0, // TODO: Fix when vendor schema is updated
            vendors_confirmed: vendorsConfirmed,
            budget_total: totalBudget,
            budget_spent: totalActual,
            budget_spent_percentage: totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0,
            days_until_wedding: daysUntilWedding,
        };
    },
});
exports.getInsights = (0, server_1.query)({
    args: { clientId: values_1.v.id('clients') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const client = await ctx.db.get(args.clientId);
        if (!client)
            throw new Error('Client not found');
        return client.ai_insights;
    },
});
exports.getTrends = (0, server_1.query)({
    args: { clientId: values_1.v.id('clients'), days: values_1.v.number() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const cutoffDate = Date.now() - args.days * 24 * 60 * 60 * 1000;
        const snapshots = await ctx.db
            .query('analytics_snapshots')
            .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
            .filter((q) => q.gte(q.field('snapshot_date'), cutoffDate))
            .collect();
        return snapshots;
    },
});
exports.createSnapshot = (0, server_1.mutation)({
    args: { clientId: values_1.v.id('clients') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        // Fetch data inline instead of calling the query
        const [guests, budgetItems, client] = await Promise.all([
            ctx.db
                .query('guests')
                .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
                .collect(),
            ctx.db
                .query('event_budget')
                .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
                .collect(),
            ctx.db.get(args.clientId),
        ]);
        if (!client)
            throw new Error('Client not found');
        const guestsCheckedIn = guests.filter((g) => g.checked_in).length;
        const vendorsConfirmed = 0; // TODO: Fix when vendor schema is updated
        const totalBudget = budgetItems.reduce((sum, item) => sum + item.budget, 0);
        const totalActual = budgetItems.reduce((sum, item) => sum + item.actual_cost, 0);
        const daysUntilWedding = Math.ceil((client.wedding_date - Date.now()) / (1000 * 60 * 60 * 24));
        const now = Date.now();
        return await ctx.db.insert('analytics_snapshots', {
            client_id: args.clientId,
            snapshot_date: now,
            metrics: {
                guests_total: guests.length,
                guests_confirmed: guests.filter((g) => g.form_submitted).length,
                guests_checked_in: guestsCheckedIn,
                budget_spent_percentage: totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0,
                tasks_completed_percentage: client.ai_insights.completion_percentage,
                vendors_confirmed: vendorsConfirmed,
                days_until_wedding: daysUntilWedding,
            },
            insights: [],
            created_at: now,
        });
    },
});
