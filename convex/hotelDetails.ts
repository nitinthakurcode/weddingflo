import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const get = query({
  args: { hotelDetailId: v.id('hotel_details') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    return await ctx.db.get(args.hotelDetailId);
  },
});

export const listByClient = query({
  args: { clientId: v.id('clients') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    return await ctx.db
      .query('hotel_details')
      .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
      .collect();
  },
});

// Alias for compatibility
export const list = listByClient;

export const getByGuest = query({
  args: { guestId: v.id('guests') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    return await ctx.db
      .query('hotel_details')
      .withIndex('by_guest', (q) => q.eq('guest_id', args.guestId))
      .first();
  },
});

export const create = mutation({
  args: {
    company_id: v.id('companies'),
    client_id: v.id('clients'),
    guest_id: v.id('guests'),
    accommodation_status: v.boolean(),
    hotel_name: v.optional(v.string()),
    hotel_id: v.optional(v.id('hotels')),
    room_number: v.optional(v.string()),
    room_type: v.optional(v.string()),
    check_in_date: v.optional(v.number()),
    check_out_date: v.optional(v.number()),
    nightly_rate: v.optional(v.number()),
    paid_by: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const now = Date.now();
    const total_cost =
      args.nightly_rate && args.check_in_date && args.check_out_date
        ? args.nightly_rate *
          Math.ceil((args.check_out_date - args.check_in_date) / (1000 * 60 * 60 * 24))
        : undefined;

    return await ctx.db.insert('hotel_details', {
      ...args,
      total_cost,
      checked_in: false,
      checked_out: false,
      created_at: now,
      updated_at: now,
    });
  },
});

export const update = mutation({
  args: {
    hotelDetailId: v.id('hotel_details'),
    hotel_name: v.optional(v.string()),
    room_number: v.optional(v.string()),
    room_type: v.optional(v.string()),
    check_in_date: v.optional(v.number()),
    check_out_date: v.optional(v.number()),
    nightly_rate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const { hotelDetailId, ...updates } = args;
    const detail = await ctx.db.get(hotelDetailId);
    if (!detail) throw new Error('Hotel detail not found');

    const total_cost =
      (updates.nightly_rate || detail.nightly_rate) &&
      (updates.check_in_date || detail.check_in_date) &&
      (updates.check_out_date || detail.check_out_date)
        ? (updates.nightly_rate || detail.nightly_rate!) *
          Math.ceil(
            ((updates.check_out_date || detail.check_out_date!) -
              (updates.check_in_date || detail.check_in_date!)) /
              (1000 * 60 * 60 * 24)
          )
        : undefined;

    await ctx.db.patch(hotelDetailId, {
      ...updates,
      total_cost,
      updated_at: Date.now(),
    });
    return hotelDetailId;
  },
});

export const linkToHotel = mutation({
  args: {
    hotelDetailId: v.id('hotel_details'),
    hotel_id: v.id('hotels'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    await ctx.db.patch(args.hotelDetailId, {
      hotel_id: args.hotel_id,
      updated_at: Date.now(),
    });
    return args.hotelDetailId;
  },
});

export const checkIn = mutation({
  args: { hotelDetailId: v.id('hotel_details') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    await ctx.db.patch(args.hotelDetailId, {
      checked_in: true,
      updated_at: Date.now(),
    });
    return args.hotelDetailId;
  },
});

export const checkOut = mutation({
  args: { hotelDetailId: v.id('hotel_details') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    await ctx.db.patch(args.hotelDetailId, {
      checked_out: true,
      updated_at: Date.now(),
    });
    return args.hotelDetailId;
  },
});

export const deleteHotelDetail = mutation({
  args: { hotelDetailId: v.id('hotel_details') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    await ctx.db.delete(args.hotelDetailId);
    return { success: true };
  },
});
