"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteHotel = exports.getAvailableRooms = exports.updateRoomInventory = exports.update = exports.create = exports.list = exports.get = void 0;
const values_1 = require("convex/values");
const server_1 = require("./_generated/server");
exports.get = (0, server_1.query)({
    args: { hotelId: values_1.v.id('hotels') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        // TEMPORARY WORKAROUND: Allow queries for testing
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.db.get(args.hotelId);
    },
});
exports.list = (0, server_1.query)({
    args: { clientId: values_1.v.id('clients') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        // TEMPORARY WORKAROUND: Allow queries for testing
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.db
            .query('hotels')
            .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
            .collect();
    },
});
exports.create = (0, server_1.mutation)({
    args: {
        company_id: values_1.v.id('companies'),
        client_id: values_1.v.id('clients'),
        hotel_name: values_1.v.string(),
        address: values_1.v.string(),
        coordinates: values_1.v.optional(values_1.v.object({
            lat: values_1.v.number(),
            lng: values_1.v.number(),
        })),
        phone: values_1.v.string(),
        email: values_1.v.optional(values_1.v.string()),
        website: values_1.v.optional(values_1.v.string()),
        room_types: values_1.v.array(values_1.v.object({
            type: values_1.v.string(),
            capacity: values_1.v.number(),
            rate_per_night: values_1.v.number(),
            total_rooms: values_1.v.number(),
            blocked_rooms: values_1.v.number(),
            available_rooms: values_1.v.number(),
        })),
        amenities: values_1.v.array(values_1.v.string()),
        rating: values_1.v.optional(values_1.v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        // TEMPORARY WORKAROUND: Allow queries for testing
        if (!identity)
            throw new Error('Not authenticated');
        const now = Date.now();
        return await ctx.db.insert('hotels', {
            ...args,
            created_at: now,
            updated_at: now,
        });
    },
});
exports.update = (0, server_1.mutation)({
    args: {
        hotelId: values_1.v.id('hotels'),
        hotel_name: values_1.v.optional(values_1.v.string()),
        phone: values_1.v.optional(values_1.v.string()),
        email: values_1.v.optional(values_1.v.string()),
        amenities: values_1.v.optional(values_1.v.array(values_1.v.string())),
        rating: values_1.v.optional(values_1.v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        // TEMPORARY WORKAROUND: Allow queries for testing
        if (!identity)
            throw new Error('Not authenticated');
        const { hotelId, ...updates } = args;
        await ctx.db.patch(hotelId, { ...updates, updated_at: Date.now() });
        return hotelId;
    },
});
exports.updateRoomInventory = (0, server_1.mutation)({
    args: {
        hotelId: values_1.v.id('hotels'),
        room_types: values_1.v.array(values_1.v.object({
            type: values_1.v.string(),
            capacity: values_1.v.number(),
            rate_per_night: values_1.v.number(),
            total_rooms: values_1.v.number(),
            blocked_rooms: values_1.v.number(),
            available_rooms: values_1.v.number(),
        })),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        // TEMPORARY WORKAROUND: Allow queries for testing
        if (!identity)
            throw new Error('Not authenticated');
        await ctx.db.patch(args.hotelId, {
            room_types: args.room_types,
            updated_at: Date.now(),
        });
        return args.hotelId;
    },
});
exports.getAvailableRooms = (0, server_1.query)({
    args: { hotelId: values_1.v.id('hotels') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        // TEMPORARY WORKAROUND: Allow queries for testing
        if (!identity)
            throw new Error('Not authenticated');
        const hotel = await ctx.db.get(args.hotelId);
        if (!hotel)
            throw new Error('Hotel not found');
        return hotel.room_types.filter((rt) => rt.available_rooms > 0);
    },
});
exports.deleteHotel = (0, server_1.mutation)({
    args: { hotelId: values_1.v.id('hotels') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        // TEMPORARY WORKAROUND: Allow queries for testing
        if (!identity)
            throw new Error('Not authenticated');
        await ctx.db.delete(args.hotelId);
        return { success: true };
    },
});
