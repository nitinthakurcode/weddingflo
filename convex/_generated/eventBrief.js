"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEventBrief = exports.updateWeatherForecast = exports.update = exports.create = exports.getByDate = exports.list = exports.get = void 0;
const values_1 = require("convex/values");
const server_1 = require("./_generated/server");
exports.get = (0, server_1.query)({
    args: { eventBriefId: values_1.v.id('event_brief') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.db.get(args.eventBriefId);
    },
});
exports.list = (0, server_1.query)({
    args: { clientId: values_1.v.id('clients') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.db
            .query('event_brief')
            .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
            .collect();
    },
});
exports.getByDate = (0, server_1.query)({
    args: { clientId: values_1.v.id('clients'), date: values_1.v.number() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.db
            .query('event_brief')
            .withIndex('by_date', (q) => q.eq('client_id', args.clientId).eq('date', args.date))
            .collect();
    },
});
exports.create = (0, server_1.mutation)({
    args: {
        company_id: values_1.v.id('companies'),
        client_id: values_1.v.id('clients'),
        event_name: values_1.v.string(),
        event_type: values_1.v.string(),
        date: values_1.v.number(),
        start_time: values_1.v.string(),
        end_time: values_1.v.string(),
        duration_hours: values_1.v.number(),
        venue: values_1.v.string(),
        venue_address: values_1.v.optional(values_1.v.string()),
        venue_coordinates: values_1.v.optional(values_1.v.object({
            lat: values_1.v.number(),
            lng: values_1.v.number(),
        })),
        venue_capacity: values_1.v.optional(values_1.v.number()),
        activity: values_1.v.string(),
        activity_description: values_1.v.optional(values_1.v.string()),
        required_vendors: values_1.v.array(values_1.v.id('vendors')),
        required_equipment: values_1.v.array(values_1.v.string()),
        already_booked: values_1.v.boolean(),
        booking_confirmation: values_1.v.optional(values_1.v.string()),
        backup_plan: values_1.v.optional(values_1.v.string()),
        notes: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const now = Date.now();
        return await ctx.db.insert('event_brief', {
            ...args,
            created_at: now,
            updated_at: now,
        });
    },
});
exports.update = (0, server_1.mutation)({
    args: {
        eventBriefId: values_1.v.id('event_brief'),
        event_name: values_1.v.optional(values_1.v.string()),
        start_time: values_1.v.optional(values_1.v.string()),
        end_time: values_1.v.optional(values_1.v.string()),
        venue: values_1.v.optional(values_1.v.string()),
        activity: values_1.v.optional(values_1.v.string()),
        required_vendors: values_1.v.optional(values_1.v.array(values_1.v.id('vendors'))),
        required_equipment: values_1.v.optional(values_1.v.array(values_1.v.string())),
        already_booked: values_1.v.optional(values_1.v.boolean()),
        booking_confirmation: values_1.v.optional(values_1.v.string()),
        notes: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const { eventBriefId, ...updates } = args;
        await ctx.db.patch(eventBriefId, { ...updates, updated_at: Date.now() });
        return eventBriefId;
    },
});
exports.updateWeatherForecast = (0, server_1.mutation)({
    args: {
        eventBriefId: values_1.v.id('event_brief'),
        weather_forecast: values_1.v.object({
            temperature: values_1.v.number(),
            condition: values_1.v.string(),
            rain_probability: values_1.v.number(),
            fetched_at: values_1.v.number(),
        }),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        await ctx.db.patch(args.eventBriefId, {
            weather_forecast: args.weather_forecast,
            updated_at: Date.now(),
        });
        return args.eventBriefId;
    },
});
exports.deleteEventBrief = (0, server_1.mutation)({
    args: { eventBriefId: values_1.v.id('event_brief') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        await ctx.db.delete(args.eventBriefId);
        return { success: true };
    },
});
