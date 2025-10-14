/**
 * QR Code Management Functions
 * Handles QR code generation, validation, and scan tracking
 */

import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Generate QR token for a guest
 */
export const generateGuestQRToken = mutation({
  args: {
    guestId: v.id('guests'),
  },
  handler: async (ctx, args) => {
    const guest = await ctx.db.get(args.guestId);
    if (!guest) {
      throw new Error('Guest not found');
    }

    // Generate unique token (in real implementation, use crypto)
    const token = `${args.guestId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Update guest with QR token
    await ctx.db.patch(args.guestId, {
      qr_code_token: token,
      updated_at: Date.now(),
    });

    return {
      token,
      guestId: args.guestId,
      guestName: guest.guest_name,
    };
  },
});

/**
 * Validate QR token and get guest info
 */
export const validateQRToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const guest = await ctx.db
      .query('guests')
      .withIndex('by_qr_token', (q) => q.eq('qr_code_token', args.token))
      .first();

    if (!guest) {
      return {
        valid: false,
        error: 'Invalid QR code token',
      };
    }

    return {
      valid: true,
      guest: {
        id: guest._id,
        name: guest.guest_name,
        email: guest.email,
        phone: guest.phone_number,
        numberOfPacks: guest.number_of_packs,
        additionalGuests: guest.additional_guest_names,
        checkedIn: guest.checked_in,
        checkedInAt: guest.checked_in_at,
        qrScanCount: guest.qr_scan_count,
        lastScanned: guest.qr_last_scanned,
        weddingId: guest.client_id,
      },
    };
  },
});

/**
 * Record QR code scan
 */
export const recordQRScan = mutation({
  args: {
    token: v.string(),
    location: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),
    scannedBy: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    const guest = await ctx.db
      .query('guests')
      .withIndex('by_qr_token', (q) => q.eq('qr_code_token', args.token))
      .first();

    if (!guest) {
      throw new Error('Invalid QR code token');
    }

    const now = Date.now();

    // Update scan count and timestamp
    await ctx.db.patch(guest._id, {
      qr_scan_count: guest.qr_scan_count + 1,
      qr_last_scanned: now,
      updated_at: now,
    });

    // Log activity
    await ctx.db.insert('activity_log', {
      company_id: guest.company_id,
      client_id: guest.client_id,
      user_id: args.scannedBy || 'system',
      action: 'qr_code_scanned',
      entity_type: 'guest',
      entity_id: guest._id,
      changes: {
        scan_count: guest.qr_scan_count + 1,
        location: args.location,
      },
      created_at: now,
    });

    return {
      success: true,
      guest: {
        id: guest._id,
        name: guest.guest_name,
        scanCount: guest.qr_scan_count + 1,
      },
    };
  },
});

/**
 * Check-in guest via QR code
 */
export const checkInGuestViaQR = mutation({
  args: {
    token: v.string(),
    location: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),
    checkedInBy: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    const guest = await ctx.db
      .query('guests')
      .withIndex('by_qr_token', (q) => q.eq('qr_code_token', args.token))
      .first();

    if (!guest) {
      throw new Error('Invalid QR code token');
    }

    if (guest.checked_in) {
      return {
        success: false,
        error: 'Guest already checked in',
        checkedInAt: guest.checked_in_at,
      };
    }

    const now = Date.now();

    // Check in the guest
    await ctx.db.patch(guest._id, {
      checked_in: true,
      checked_in_at: now,
      checked_in_by: args.checkedInBy,
      checked_in_location: args.location,
      qr_scan_count: guest.qr_scan_count + 1,
      qr_last_scanned: now,
      updated_at: now,
    });

    // Log activity
    await ctx.db.insert('activity_log', {
      company_id: guest.company_id,
      client_id: guest.client_id,
      user_id: args.checkedInBy || 'system',
      action: 'guest_checked_in_via_qr',
      entity_type: 'guest',
      entity_id: guest._id,
      changes: {
        checked_in: true,
        location: args.location,
      },
      created_at: now,
    });

    return {
      success: true,
      guest: {
        id: guest._id,
        name: guest.guest_name,
        numberOfPacks: guest.number_of_packs,
        checkedInAt: now,
      },
    };
  },
});

/**
 * Get QR scan statistics for a wedding
 */
export const getQRScanStats = query({
  args: {
    clientId: v.id('clients'),
  },
  handler: async (ctx, args) => {
    const guests = await ctx.db
      .query('guests')
      .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
      .collect();

    const totalGuests = guests.length;
    const guestsWithScans = guests.filter((g) => g.qr_scan_count > 0).length;
    const totalScans = guests.reduce((sum, g) => sum + g.qr_scan_count, 0);
    const checkedInGuests = guests.filter((g) => g.checked_in).length;

    // Calculate scan distribution
    const scanDistribution = {
      noScans: guests.filter((g) => g.qr_scan_count === 0).length,
      oneToThreeScans: guests.filter((g) => g.qr_scan_count >= 1 && g.qr_scan_count <= 3).length,
      fourToTenScans: guests.filter((g) => g.qr_scan_count >= 4 && g.qr_scan_count <= 10).length,
      moreThanTenScans: guests.filter((g) => g.qr_scan_count > 10).length,
    };

    // Recent scans (last 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentScans = guests.filter(
      (g) => g.qr_last_scanned && g.qr_last_scanned > oneDayAgo
    ).length;

    return {
      totalGuests,
      guestsWithScans,
      totalScans,
      averageScansPerGuest: totalGuests > 0 ? totalScans / totalGuests : 0,
      checkedInGuests,
      checkInPercentage: totalGuests > 0 ? (checkedInGuests / totalGuests) * 100 : 0,
      scanDistribution,
      recentScans,
    };
  },
});

/**
 * Get recent QR scans
 */
export const getRecentQRScans = query({
  args: {
    clientId: v.id('clients'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    const guests = await ctx.db
      .query('guests')
      .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
      .collect();

    // Filter guests with scans and sort by last scanned
    const guestsWithScans = guests
      .filter((g) => g.qr_last_scanned)
      .sort((a, b) => (b.qr_last_scanned || 0) - (a.qr_last_scanned || 0))
      .slice(0, limit);

    return guestsWithScans.map((guest) => ({
      id: guest._id,
      name: guest.guest_name,
      scanCount: guest.qr_scan_count,
      lastScanned: guest.qr_last_scanned,
      checkedIn: guest.checked_in,
      checkedInAt: guest.checked_in_at,
    }));
  },
});

/**
 * Regenerate QR token for a guest
 */
export const regenerateGuestQRToken = mutation({
  args: {
    guestId: v.id('guests'),
  },
  handler: async (ctx, args) => {
    const guest = await ctx.db.get(args.guestId);
    if (!guest) {
      throw new Error('Guest not found');
    }

    // Generate new token
    const token = `${args.guestId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Update guest
    await ctx.db.patch(args.guestId, {
      qr_code_token: token,
      qr_scan_count: 0,
      qr_last_scanned: undefined,
      updated_at: Date.now(),
    });

    // Log activity
    await ctx.db.insert('activity_log', {
      company_id: guest.company_id,
      client_id: guest.client_id,
      user_id: 'system',
      action: 'qr_token_regenerated',
      entity_type: 'guest',
      entity_id: guest._id,
      changes: {
        old_token: guest.qr_code_token,
        new_token: token,
      },
      created_at: Date.now(),
    });

    return {
      token,
      guestId: args.guestId,
      guestName: guest.guest_name,
    };
  },
});

/**
 * Bulk generate QR tokens for all guests in a wedding
 */
export const bulkGenerateQRTokens = mutation({
  args: {
    clientId: v.id('clients'),
    regenerateExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const guests = await ctx.db
      .query('guests')
      .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
      .collect();

    const updated: Array<{ guestId: string; token: string; name: string }> = [];

    for (const guest of guests) {
      // Skip if token exists and regenerate is false
      if (guest.qr_code_token && !args.regenerateExisting) {
        continue;
      }

      const token = `${guest._id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      await ctx.db.patch(guest._id, {
        qr_code_token: token,
        updated_at: Date.now(),
      });

      updated.push({
        guestId: guest._id,
        token,
        name: guest.guest_name,
      });
    }

    return {
      totalGuests: guests.length,
      tokensGenerated: updated.length,
      guests: updated,
    };
  },
});
