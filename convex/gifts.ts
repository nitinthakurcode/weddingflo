import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { Id } from './_generated/dataModel';

// Create a new gift
export const createGift = mutation({
  args: {
    weddingId: v.id('weddings'),
    guestId: v.optional(v.id('guests')),
    guestName: v.string(),
    description: v.string(),
    category: v.optional(v.string()),
    estimatedValue: v.optional(v.number()),
    receivedDate: v.string(),
    deliveryStatus: v.optional(
      v.union(
        v.literal('pending'),
        v.literal('in_transit'),
        v.literal('delivered'),
        v.literal('returned')
      )
    ),
    deliveryTrackingNumber: v.optional(v.string()),
    deliveryNotes: v.optional(v.string()),
    thankYouStatus: v.optional(
      v.union(v.literal('not_sent'), v.literal('draft'), v.literal('sent'))
    ),
    thankYouSentDate: v.optional(v.string()),
    thankYouNotes: v.optional(v.string()),
    photoStorageId: v.optional(v.id('_storage')),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

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
export const getGiftsByWedding = query({
  args: {
    weddingId: v.id('weddings'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const gifts = await ctx.db
      .query('gifts')
      .withIndex('by_wedding', (q) => q.eq('weddingId', args.weddingId))
      .collect();

    // Enrich with photo URLs
    return Promise.all(
      gifts.map(async (gift) => {
        if (gift.photoStorageId && !gift.photoUrl) {
          const photoUrl = await ctx.storage.getUrl(gift.photoStorageId);
          return { ...gift, photoUrl: photoUrl ?? undefined };
        }
        return gift;
      })
    );
  },
});

// Get a single gift by ID
export const getGift = query({
  args: {
    giftId: v.id('gifts'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

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
export const updateGift = mutation({
  args: {
    giftId: v.id('gifts'),
    guestId: v.optional(v.id('guests')),
    guestName: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    estimatedValue: v.optional(v.number()),
    receivedDate: v.optional(v.string()),
    deliveryStatus: v.optional(
      v.union(
        v.literal('pending'),
        v.literal('in_transit'),
        v.literal('delivered'),
        v.literal('returned')
      )
    ),
    deliveryTrackingNumber: v.optional(v.string()),
    deliveryNotes: v.optional(v.string()),
    thankYouStatus: v.optional(
      v.union(v.literal('not_sent'), v.literal('draft'), v.literal('sent'))
    ),
    thankYouSentDate: v.optional(v.string()),
    thankYouNotes: v.optional(v.string()),
    photoStorageId: v.optional(v.id('_storage')),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

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
export const deleteGift = mutation({
  args: {
    giftId: v.id('gifts'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

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
export const getGiftsByDeliveryStatus = query({
  args: {
    weddingId: v.id('weddings'),
    deliveryStatus: v.union(
      v.literal('pending'),
      v.literal('in_transit'),
      v.literal('delivered'),
      v.literal('returned')
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    return await ctx.db
      .query('gifts')
      .withIndex('by_delivery_status', (q) =>
        q.eq('weddingId', args.weddingId).eq('deliveryStatus', args.deliveryStatus)
      )
      .collect();
  },
});

// Get gifts by thank you status
export const getGiftsByThankYouStatus = query({
  args: {
    weddingId: v.id('weddings'),
    thankYouStatus: v.union(v.literal('not_sent'), v.literal('draft'), v.literal('sent')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    return await ctx.db
      .query('gifts')
      .withIndex('by_thank_you_status', (q) =>
        q.eq('weddingId', args.weddingId).eq('thankYouStatus', args.thankYouStatus)
      )
      .collect();
  },
});

// Get gift statistics
export const getGiftStats = query({
  args: {
    weddingId: v.id('weddings'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

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
export const batchUpdateThankYouStatus = mutation({
  args: {
    giftIds: v.array(v.id('gifts')),
    thankYouStatus: v.union(v.literal('not_sent'), v.literal('draft'), v.literal('sent')),
    thankYouSentDate: v.optional(v.string()),
    thankYouNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const updates = args.giftIds.map((giftId) =>
      ctx.db.patch(giftId, {
        thankYouStatus: args.thankYouStatus,
        thankYouSentDate: args.thankYouSentDate,
        thankYouNotes: args.thankYouNotes,
      })
    );

    await Promise.all(updates);
    return { success: true, updated: args.giftIds.length };
  },
});

// Generate upload URL for gift photo
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    return await ctx.storage.generateUploadUrl();
  },
});
