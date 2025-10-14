"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAlerts = exports.getUpcomingEvents = exports.getRecentActivity = exports.getDashboardStats = void 0;
const values_1 = require("convex/values");
const server_1 = require("./_generated/server");
exports.getDashboardStats = (0, server_1.query)({
    args: { clientId: values_1.v.id('clients') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const client = await ctx.db.get(args.clientId);
        if (!client) {
            throw new Error('Client not found');
        }
        // Get all related data
        const guests = await ctx.db
            .query('guests')
            .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
            .collect();
        const budgetItems = await ctx.db
            .query('event_budget')
            .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
            .collect();
        // Get weddings for this client first
        const weddings = await ctx.db
            .query('weddings')
            .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
            .collect();
        const weddingIds = weddings.map(w => w._id);
        // Query vendors by weddingId
        const allVendors = await Promise.all(weddingIds.map(weddingId => ctx.db
            .query('vendors')
            .withIndex('by_wedding', (q) => q.eq('weddingId', weddingId))
            .collect()));
        const vendors = allVendors.flat();
        const creatives = await ctx.db
            .query('creatives')
            .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
            .collect();
        const activities = await ctx.db
            .query('event_flow')
            .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
            .collect();
        // Calculate stats
        const totalGuests = guests.length;
        const confirmedGuests = guests.filter((g) => g.form_submitted).length;
        const checkedInGuests = guests.filter((g) => g.checked_in).length;
        const totalBudget = budgetItems.reduce((sum, item) => sum + item.budget, 0);
        const budgetSpent = budgetItems.reduce((sum, item) => sum + item.actual_cost, 0);
        const budgetSpentPercentage = totalBudget > 0 ? (budgetSpent / totalBudget) * 100 : 0;
        const daysUntilWedding = Math.ceil((client.wedding_date - Date.now()) / (1000 * 60 * 60 * 24));
        const confirmedVendors = vendors.filter((v) => v.status === 'confirmed' || v.status === 'booked').length;
        const completedCreatives = creatives.filter((c) => c.status === 'completed').length;
        const totalCreatives = creatives.length;
        const completedActivities = activities.filter((a) => a.status === 'completed').length;
        const totalActivities = activities.length;
        return {
            totalGuests,
            confirmedGuests,
            checkedInGuests,
            budgetSpent,
            totalBudget,
            budgetSpentPercentage,
            daysUntilWedding,
            confirmedVendors,
            totalVendors: vendors.length,
            completedCreatives,
            totalCreatives,
            completedActivities,
            totalActivities,
            // Guest breakdown by category
            guestsByCategory: guests.reduce((acc, guest) => {
                const category = guest.guest_category || 'uncategorized';
                acc[category] = (acc[category] || 0) + 1;
                return acc;
            }, {}),
            // Budget breakdown by category
            budgetByCategory: budgetItems.reduce((acc, item) => {
                acc[item.category] = (acc[item.category] || 0) + item.actual_cost;
                return acc;
            }, {}),
            // Vendor status breakdown
            vendorsByStatus: vendors.reduce((acc, vendor) => {
                acc[vendor.status] = (acc[vendor.status] || 0) + 1;
                return acc;
            }, {}),
        };
    },
});
exports.getRecentActivity = (0, server_1.query)({
    args: { clientId: values_1.v.id('clients'), limit: values_1.v.optional(values_1.v.number()) },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const limit = args.limit || 10;
        const activityLog = await ctx.db
            .query('activity_log')
            .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
            .order('desc')
            .take(limit);
        return activityLog;
    },
});
exports.getUpcomingEvents = (0, server_1.query)({
    args: { clientId: values_1.v.id('clients'), limit: values_1.v.optional(values_1.v.number()) },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const limit = args.limit || 5;
        const now = Date.now();
        const events = await ctx.db
            .query('event_brief')
            .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
            .collect();
        // Filter upcoming events and sort by date
        const upcomingEvents = events
            .filter((event) => event.date >= now)
            .sort((a, b) => a.date - b.date)
            .slice(0, limit);
        return upcomingEvents;
    },
});
exports.getAlerts = (0, server_1.query)({
    args: { clientId: values_1.v.id('clients') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const alerts = [];
        // Get client info
        const client = await ctx.db.get(args.clientId);
        if (!client) {
            return alerts;
        }
        // Check budget warnings
        const budgetItems = await ctx.db
            .query('event_budget')
            .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
            .collect();
        const totalBudget = budgetItems.reduce((sum, item) => sum + item.budget, 0);
        const budgetSpent = budgetItems.reduce((sum, item) => sum + item.actual_cost, 0);
        const budgetPercentage = totalBudget > 0 ? (budgetSpent / totalBudget) * 100 : 0;
        if (budgetPercentage > 90) {
            alerts.push({
                id: 'budget-warning',
                type: 'warning',
                title: 'Budget Alert',
                description: `You've spent ${budgetPercentage.toFixed(1)}% of your total budget`,
                action: 'View Budget',
            });
        }
        // Check days until wedding
        const daysUntilWedding = Math.ceil((client.wedding_date - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysUntilWedding <= 30 && daysUntilWedding > 0) {
            alerts.push({
                id: 'wedding-approaching',
                type: 'info',
                title: 'Wedding Approaching',
                description: `Only ${daysUntilWedding} days until the big day!`,
            });
        }
        // Check for unconfirmed vendors
        const weddings = await ctx.db
            .query('weddings')
            .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
            .collect();
        const weddingIds = weddings.map(w => w._id);
        const allVendors = await Promise.all(weddingIds.map(weddingId => ctx.db
            .query('vendors')
            .withIndex('by_wedding', (q) => q.eq('weddingId', weddingId))
            .collect()));
        const vendors = allVendors.flat();
        const unconfirmedVendors = vendors.filter((v) => v.status === 'quoted' || v.status === 'contacted').length;
        if (unconfirmedVendors > 0) {
            alerts.push({
                id: 'unconfirmed-vendors',
                type: 'warning',
                title: 'Pending Vendors',
                description: `${unconfirmedVendors} vendor${unconfirmedVendors > 1 ? 's' : ''} need${unconfirmedVendors > 1 ? '' : 's'} confirmation`,
                action: 'View Vendors',
            });
        }
        // Check for pending RSVPs
        const guests = await ctx.db
            .query('guests')
            .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
            .collect();
        const pendingRSVPs = guests.filter((g) => !g.form_submitted).length;
        if (pendingRSVPs > 0 && daysUntilWedding <= 60) {
            alerts.push({
                id: 'pending-rsvps',
                type: 'warning',
                title: 'Pending RSVPs',
                description: `${pendingRSVPs} guest${pendingRSVPs > 1 ? 's haven\'t' : ' hasn\'t'} responded yet`,
                action: 'View Guests',
            });
        }
        return alerts;
    },
});
