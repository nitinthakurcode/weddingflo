"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUploadUrl = exports.batchUpdateThankYouStatus = exports.getGiftStats = exports.getGiftsByThankYouStatus = exports.getGiftsByDeliveryStatus = exports.deleteGift = exports.updateGift = exports.getGift = exports.getGiftsByWedding = exports.createGift = void 0;
const values_1 = require("convex/values");
const server_1 = require("./_generated/server");
// Create a new gift
exports.createGift = (0, server_1.mutation)({
    args: {
        weddingId: values_1.v.id('weddings'),
        guestId: values_1.v.optional(values_1.v.id('guests')),
        guestName: values_1.v.string(),
        description: values_1.v.string(),
        category: values_1.v.optional(values_1.v.string()),
        estimatedValue: values_1.v.optional(values_1.v.number()),
        receivedDate: values_1.v.string(),
        deliveryStatus: values_1.v.optional(values_1.v.union(values_1.v.literal('pending'), values_1.v.literal('in_transit'), values_1.v.literal('delivered'), values_1.v.literal('returned'))),
        deliveryTrackingNumber: values_1.v.optional(values_1.v.string()),
        deliveryNotes: values_1.v.optional(values_1.v.string()),
        thankYouStatus: values_1.v.optional(values_1.v.union(values_1.v.literal('not_sent'), values_1.v.literal('draft'), values_1.v.literal('sent'))),
        thankYouSentDate: values_1.v.optional(values_1.v.string()),
        thankYouNotes: values_1.v.optional(values_1.v.string()),
        photoStorageId: values_1.v.optional(values_1.v.id('_storage')),
        tags: values_1.v.optional(values_1.v.array(values_1.v.string())),
        notes: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const giftId = await ctx.db.insert('gifts', {
            weddingId: args.weddingId,
            guestId: args.guestId,
            guestName: args.guestName,
            description: args.description,
            category: args.category,
            estimatedValue: args.estimatedValue,
            receivedDate: args.receivedDate,
            deliveryStatus: args.deliveryStatus || 'pending',
            deliveryTrackingNumber: args.deliveryTrackingNumber,
            deliveryNotes: args.deliveryNotes,
            thankYouStatus: args.thankYouStatus || 'not_sent',
            thankYouSentDate: args.thankYouSentDate,
            thankYouNotes: args.thankYouNotes,
            photoStorageId: args.photoStorageId,
            tags: args.tags,
            notes: args.notes,
        });
        // Generate storage URL if photo exists
        if (args.photoStorageId) {
            const photoUrl = await ctx.storage.getUrl(args.photoStorageId);
            await ctx.db.patch(giftId, { photoUrl: photoUrl ?? undefined });
        }
        return giftId;
    },
});
// Get all gifts for a wedding
exports.getGiftsByWedding = (0, server_1.query)({
    args: {
        weddingId: values_1.v.id('weddings'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const gifts = await ctx.db
            .query('gifts')
            .withIndex('by_wedding', (q) => q.eq('weddingId', args.weddingId))
            .collect();
        // Enrich with photo URLs
        return Promise.all(gifts.map(async (gift) => {
            if (gift.photoStorageId && !gift.photoUrl) {
                const photoUrl = await ctx.storage.getUrl(gift.photoStorageId);
                return { ...gift, photoUrl: photoUrl ?? undefined };
            }
            return gift;
        }));
    },
});
// Get a single gift by ID
exports.getGift = (0, server_1.query)({
    args: {
        giftId: values_1.v.id('gifts'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const gift = await ctx.db.get(args.giftId);
        if (!gift) {
            return null;
        }
        // Generate photo URL if needed
        if (gift.photoStorageId && !gift.photoUrl) {
            const photoUrl = await ctx.storage.getUrl(gift.photoStorageId);
            return { ...gift, photoUrl: photoUrl ?? undefined };
        }
        return gift;
    },
});
// Update a gift
exports.updateGift = (0, server_1.mutation)({
    args: {
        giftId: values_1.v.id('gifts'),
        guestId: values_1.v.optional(values_1.v.id('guests')),
        guestName: values_1.v.optional(values_1.v.string()),
        description: values_1.v.optional(values_1.v.string()),
        category: values_1.v.optional(values_1.v.string()),
        estimatedValue: values_1.v.optional(values_1.v.number()),
        receivedDate: values_1.v.optional(values_1.v.string()),
        deliveryStatus: values_1.v.optional(values_1.v.union(values_1.v.literal('pending'), values_1.v.literal('in_transit'), values_1.v.literal('delivered'), values_1.v.literal('returned'))),
        deliveryTrackingNumber: values_1.v.optional(values_1.v.string()),
        deliveryNotes: values_1.v.optional(values_1.v.string()),
        thankYouStatus: values_1.v.optional(values_1.v.union(values_1.v.literal('not_sent'), values_1.v.literal('draft'), values_1.v.literal('sent'))),
        thankYouSentDate: values_1.v.optional(values_1.v.string()),
        thankYouNotes: values_1.v.optional(values_1.v.string()),
        photoStorageId: values_1.v.optional(values_1.v.id('_storage')),
        tags: values_1.v.optional(values_1.v.array(values_1.v.string())),
        notes: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const { giftId, ...updates } = args;
        // Get the current gift
        const gift = await ctx.db.get(giftId);
        if (!gift) {
            throw new Error('Gift not found');
        }
        // Update photo URL if photoStorageId changed
        let photoUrl = gift.photoUrl;
        if (updates.photoStorageId && updates.photoStorageId !== gift.photoStorageId) {
            photoUrl = (await ctx.storage.getUrl(updates.photoStorageId)) ?? undefined;
        }
        await ctx.db.patch(giftId, {
            ...updates,
            ...(photoUrl && { photoUrl }),
        });
        return giftId;
    },
});
// Delete a gift
exports.deleteGift = (0, server_1.mutation)({
    args: {
        giftId: values_1.v.id('gifts'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const gift = await ctx.db.get(args.giftId);
        if (!gift) {
            throw new Error('Gift not found');
        }
        // Delete the photo from storage if it exists
        if (gift.photoStorageId) {
            await ctx.storage.delete(gift.photoStorageId);
        }
        await ctx.db.delete(args.giftId);
        return { success: true };
    },
});
// Get gifts by delivery status
exports.getGiftsByDeliveryStatus = (0, server_1.query)({
    args: {
        weddingId: values_1.v.id('weddings'),
        deliveryStatus: values_1.v.union(values_1.v.literal('pending'), values_1.v.literal('in_transit'), values_1.v.literal('delivered'), values_1.v.literal('returned')),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.db
            .query('gifts')
            .withIndex('by_delivery_status', (q) => q.eq('weddingId', args.weddingId).eq('deliveryStatus', args.deliveryStatus))
            .collect();
    },
});
// Get gifts by thank you status
exports.getGiftsByThankYouStatus = (0, server_1.query)({
    args: {
        weddingId: values_1.v.id('weddings'),
        thankYouStatus: values_1.v.union(values_1.v.literal('not_sent'), values_1.v.literal('draft'), values_1.v.literal('sent')),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.db
            .query('gifts')
            .withIndex('by_thank_you_status', (q) => q.eq('weddingId', args.weddingId).eq('thankYouStatus', args.thankYouStatus))
            .collect();
    },
});
// Get gift statistics
exports.getGiftStats = (0, server_1.query)({
    args: {
        weddingId: values_1.v.id('weddings'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const gifts = await ctx.db
            .query('gifts')
            .withIndex('by_wedding', (q) => q.eq('weddingId', args.weddingId))
            .collect();
        const totalGifts = gifts.length;
        const deliveredGifts = gifts.filter((g) => g.deliveryStatus === 'delivered').length;
        const thankYousSent = gifts.filter((g) => g.thankYouStatus === 'sent').length;
        const pendingThankYous = gifts.filter((g) => g.thankYouStatus === 'not_sent').length;
        const totalValue = gifts.reduce((sum, g) => sum + (g.estimatedValue || 0), 0);
        return {
            totalGifts,
            deliveredGifts,
            thankYousSent,
            pendingThankYous,
            totalValue,
        };
    },
});
// Batch update thank you status
exports.batchUpdateThankYouStatus = (0, server_1.mutation)({
    args: {
        giftIds: values_1.v.array(values_1.v.id('gifts')),
        thankYouStatus: values_1.v.union(values_1.v.literal('not_sent'), values_1.v.literal('draft'), values_1.v.literal('sent')),
        thankYouSentDate: values_1.v.optional(values_1.v.string()),
        thankYouNotes: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const updates = args.giftIds.map((giftId) => ctx.db.patch(giftId, {
            thankYouStatus: args.thankYouStatus,
            thankYouSentDate: args.thankYouSentDate,
            thankYouNotes: args.thankYouNotes,
        }));
        await Promise.all(updates);
        return { success: true, updated: args.giftIds.length };
    },
});
// Generate upload URL for gift photo
exports.generateUploadUrl = (0, server_1.mutation)({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.storage.generateUploadUrl();
    },
});
