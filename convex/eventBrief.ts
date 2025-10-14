import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const get = query({
  args: { eventBriefId: v.id('event_brief') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    return await ctx.db.get(args.eventBriefId);
  },
});

export const list = query({
  args: { clientId: v.id('clients') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    return await ctx.db
      .query('event_brief')
      .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
      .collect();
  },
});

export const getByDate = query({
  args: { clientId: v.id('clients'), date: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    return await ctx.db
      .query('event_brief')
      .withIndex('by_date', (q) => q.eq('client_id', args.clientId).eq('date', args.date))
      .collect();
  },
});

export const create = mutation({
  args: {
    company_id: v.id('companies'),
    client_id: v.id('clients'),
    event_name: v.string(),
    event_type: v.string(),
    date: v.number(),
    start_time: v.string(),
    end_time: v.string(),
    duration_hours: v.number(),
    venue: v.string(),
    venue_address: v.optional(v.string()),
    venue_coordinates: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),
    venue_capacity: v.optional(v.number()),
    activity: v.string(),
    activity_description: v.optional(v.string()),
    required_vendors: v.array(v.id('vendors')),
    required_equipment: v.array(v.string()),
    already_booked: v.boolean(),
    booking_confirmation: v.optional(v.string()),
    backup_plan: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const now = Date.now();
    return await ctx.db.insert('event_brief', {
      ...args,
      created_at: now,
      updated_at: now,
    });
  },
});

export const update = mutation({
  args: {
    eventBriefId: v.id('event_brief'),
    event_name: v.optional(v.string()),
    start_time: v.optional(v.string()),
    end_time: v.optional(v.string()),
    venue: v.optional(v.string()),
    activity: v.optional(v.string()),
    required_vendors: v.optional(v.array(v.id('vendors'))),
    required_equipment: v.optional(v.array(v.string())),
    already_booked: v.optional(v.boolean()),
    booking_confirmation: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const { eventBriefId, ...updates } = args;
    await ctx.db.patch(eventBriefId, { ...updates, updated_at: Date.now() });
    return eventBriefId;
  },
});

export const updateWeatherForecast = mutation({
  args: {
    eventBriefId: v.id('event_brief'),
    weather_forecast: v.object({
      temperature: v.number(),
      condition: v.string(),
      rain_probability: v.number(),
      fetched_at: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    await ctx.db.patch(args.eventBriefId, {
      weather_forecast: args.weather_forecast,
      updated_at: Date.now(),
    });
    return args.eventBriefId;
  },
});

export const deleteEventBrief = mutation({
  args: { eventBriefId: v.id('event_brief') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    await ctx.db.delete(args.eventBriefId);
    return { success: true };
  },
});
