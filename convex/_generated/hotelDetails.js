"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteHotelDetail = exports.checkOut = exports.checkIn = exports.linkToHotel = exports.update = exports.create = exports.getByGuest = exports.list = exports.listByClient = exports.get = void 0;
const values_1 = require("convex/values");
const server_1 = require("./_generated/server");
exports.get = (0, server_1.query)({
    args: { hotelDetailId: values_1.v.id('hotel_details') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.db.get(args.hotelDetailId);
    },
});
exports.listByClient = (0, server_1.query)({
    args: { clientId: values_1.v.id('clients') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.db
            .query('hotel_details')
            .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
            .collect();
    },
});
// Alias for compatibility
exports.list = exports.listByClient;
exports.getByGuest = (0, server_1.query)({
    args: { guestId: values_1.v.id('guests') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.db
            .query('hotel_details')
            .withIndex('by_guest', (q) => q.eq('guest_id', args.guestId))
            .first();
    },
});
exports.create = (0, server_1.mutation)({
    args: {
        company_id: values_1.v.id('companies'),
        client_id: values_1.v.id('clients'),
        guest_id: values_1.v.id('guests'),
        accommodation_status: values_1.v.boolean(),
        hotel_name: values_1.v.optional(values_1.v.string()),
        hotel_id: values_1.v.optional(values_1.v.id('hotels')),
        room_number: values_1.v.optional(values_1.v.string()),
        room_type: values_1.v.optional(values_1.v.string()),
        check_in_date: values_1.v.optional(values_1.v.number()),
        check_out_date: values_1.v.optional(values_1.v.number()),
        nightly_rate: values_1.v.optional(values_1.v.number()),
        paid_by: values_1.v.optional(values_1.v.string()),
        notes: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const now = Date.now();
        const total_cost = args.nightly_rate && args.check_in_date && args.check_out_date
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
exports.update = (0, server_1.mutation)({
    args: {
        hotelDetailId: values_1.v.id('hotel_details'),
        hotel_name: values_1.v.optional(values_1.v.string()),
        room_number: values_1.v.optional(values_1.v.string()),
        room_type: values_1.v.optional(values_1.v.string()),
        check_in_date: values_1.v.optional(values_1.v.number()),
        check_out_date: values_1.v.optional(values_1.v.number()),
        nightly_rate: values_1.v.optional(values_1.v.number()),
        notes: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const { hotelDetailId, ...updates } = args;
        const detail = await ctx.db.get(hotelDetailId);
        if (!detail)
            throw new Error('Hotel detail not found');
        const total_cost = (updates.nightly_rate || detail.nightly_rate) &&
            (updates.check_in_date || detail.check_in_date) &&
            (updates.check_out_date || detail.check_out_date)
            ? (updates.nightly_rate || detail.nightly_rate) *
                Math.ceil(((updates.check_out_date || detail.check_out_date) -
                    (updates.check_in_date || detail.check_in_date)) /
                    (1000 * 60 * 60 * 24))
            : undefined;
        await ctx.db.patch(hotelDetailId, {
            ...updates,
            total_cost,
            updated_at: Date.now(),
        });
        return hotelDetailId;
    },
});
exports.linkToHotel = (0, server_1.mutation)({
    args: {
        hotelDetailId: values_1.v.id('hotel_details'),
        hotel_id: values_1.v.id('hotels'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        await ctx.db.patch(args.hotelDetailId, {
            hotel_id: args.hotel_id,
            updated_at: Date.now(),
        });
        return args.hotelDetailId;
    },
});
exports.checkIn = (0, server_1.mutation)({
    args: { hotelDetailId: values_1.v.id('hotel_details') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        await ctx.db.patch(args.hotelDetailId, {
            checked_in: true,
            updated_at: Date.now(),
        });
        return args.hotelDetailId;
    },
});
exports.checkOut = (0, server_1.mutation)({
    args: { hotelDetailId: values_1.v.id('hotel_details') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        await ctx.db.patch(args.hotelDetailId, {
            checked_out: true,
            updated_at: Date.now(),
        });
        return args.hotelDetailId;
    },
});
exports.deleteHotelDetail = (0, server_1.mutation)({
    args: { hotelDetailId: values_1.v.id('hotel_details') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        await ctx.db.delete(args.hotelDetailId);
        return { success: true };
    },
});
