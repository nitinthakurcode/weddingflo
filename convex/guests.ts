import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Get a guest by ID
 */
export const get = query({
  args: { guestId: v.id('guests') },
  handler: async (ctx, args) => {
    const guest = await ctx.db.get(args.guestId);
    if (!guest) throw new Error('Guest not found');
    return guest;
  },
});

/**
 * List guests for a client
 */
export const list = query({
  args: { clientId: v.id('clients') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    // TEMPORARY WORKAROUND: Allow queries for testing
    if (!identity) throw new Error('Not authenticated');

    const guests = await ctx.db
      .query('guests')
      .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
      .collect();

    return guests;
  },
});

/**
 * Search guests by name
 */
export const search = query({
  args: {
    clientId: v.id('clients'),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    // TEMPORARY WORKAROUND: Allow queries for testing
    if (!identity) throw new Error('Not authenticated');

    const results = await ctx.db
      .query('guests')
      .withSearchIndex('search_guests', (q) =>
        q.search('guest_name', args.query).eq('client_id', args.clientId)
      )
      .collect();

    return results;
  },
});

/**
 * Get guest by QR token
 */
export const getByQRToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const guest = await ctx.db
      .query('guests')
      .withIndex('by_qr_token', (q) => q.eq('qr_code_token', args.token))
      .first();

    return guest;
  },
});

/**
 * Get check-in statistics for a client
 */
export const getCheckInStats = query({
  args: { clientId: v.id('clients') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    // TEMPORARY WORKAROUND: Allow queries for testing
    if (!identity) throw new Error('Not authenticated');

    const allGuests = await ctx.db
      .query('guests')
      .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
      .collect();

    const checkedInGuests = allGuests.filter((g) => g.checked_in);

    return {
      total: allGuests.length,
      checked_in: checkedInGuests.length,
      pending: allGuests.length - checkedInGuests.length,
      percentage: allGuests.length > 0 ? (checkedInGuests.length / allGuests.length) * 100 : 0,
    };
  },
});

/**
 * Create a new guest
 */
export const create = mutation({
  args: {
    company_id: v.id('companies'),
    client_id: v.id('clients'),
    guest_name: v.string(),
    guest_email: v.optional(v.string()),
    guest_phone: v.optional(v.string()),
    guest_category: v.string(),
    guest_side: v.union(v.literal('bride'), v.literal('groom'), v.literal('neutral')),
    plus_one_allowed: v.boolean(),
    plus_one_name: v.optional(v.string()),
    invite_status: v.union(
      v.literal('not_invited'),
      v.literal('save_the_date_sent'),
      v.literal('invited'),
      v.literal('attending'),
      v.literal('declined'),
      v.literal('maybe')
    ),
    meal_preference: v.optional(v.string()),
    dietary_restrictions: v.optional(v.string()),
    accommodation_needed: v.boolean(),
    seating_preference: v.optional(v.string()),
    special_requests: v.optional(v.string()),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    // TEMPORARY WORKAROUND: Allow queries for testing
    if (!identity) throw new Error('Not authenticated');

    const now = Date.now();

    // Get next serial number
    const existingGuests = await ctx.db
      .query('guests')
      .withIndex('by_client', (q) => q.eq('client_id', args.client_id))
      .collect();
    const serial_number = existingGuests.length + 1;

    // Generate unique QR token
    const qrToken = `${args.client_id}-${serial_number}-${now}`;

    // Map form fields to schema fields
    const special_needs_parts = [];
    if (args.meal_preference) special_needs_parts.push(`Meal: ${args.meal_preference}`);
    if (args.special_requests) special_needs_parts.push(args.special_requests);
    if (args.accommodation_needed) special_needs_parts.push('Accommodation needed');
    if (args.invite_status) special_needs_parts.push(`Invite status: ${args.invite_status}`);
    if (args.tags.length > 0) special_needs_parts.push(`Tags: ${args.tags.join(', ')}`);

    const guestId = await ctx.db.insert('guests', {
      company_id: args.company_id,
      client_id: args.client_id,
      serial_number,
      guest_name: args.guest_name,
      phone_number: args.guest_phone,
      email: args.guest_email,
      number_of_packs: args.plus_one_allowed ? 2 : 1,
      additional_guest_names: args.plus_one_name ? [args.plus_one_name] : [],
      relationship_to_family: args.guest_side, // Map guest_side to relationship_to_family
      guest_category: args.guest_category,
      dietary_restrictions: args.dietary_restrictions ? [args.dietary_restrictions] : [],
      seating_preferences: args.seating_preference ? [args.seating_preference] : [],
      special_needs: special_needs_parts.length > 0 ? special_needs_parts.join(' | ') : undefined,
      events_attending: [],
      qr_code_token: qrToken,
      qr_scan_count: 0,
      form_submitted: false,
      checked_in: false,
      created_at: now,
      updated_at: now,
    });

    return guestId;
  },
});

/**
 * Bulk create guests
 */
export const bulkCreate = mutation({
  args: {
    company_id: v.id('companies'),
    client_id: v.id('clients'),
    guests: v.array(
      v.object({
        serial_number: v.number(),
        guest_name: v.string(),
        phone_number: v.optional(v.string()),
        email: v.optional(v.string()),
        number_of_packs: v.number(),
        additional_guest_names: v.array(v.string()),
        guest_category: v.optional(v.string()),
        events_attending: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    // TEMPORARY WORKAROUND: Allow queries for testing
    if (!identity) throw new Error('Not authenticated');

    const now = Date.now();
    const guestIds = [];

    for (const guest of args.guests) {
      const qrToken = `${args.client_id}-${guest.serial_number}-${now}`;

      const guestId = await ctx.db.insert('guests', {
        company_id: args.company_id,
        client_id: args.client_id,
        serial_number: guest.serial_number,
        guest_name: guest.guest_name,
        phone_number: guest.phone_number,
        email: guest.email,
        number_of_packs: guest.number_of_packs,
        additional_guest_names: guest.additional_guest_names,
        guest_category: guest.guest_category,
        events_attending: guest.events_attending,
        dietary_restrictions: [],
        seating_preferences: [],
        qr_code_token: qrToken,
        qr_scan_count: 0,
        form_submitted: false,
        checked_in: false,
        created_at: now,
        updated_at: now,
      });

      guestIds.push(guestId);
    }

    return { count: guestIds.length, guestIds };
  },
});

/**
 * Update guest information
 */
export const update = mutation({
  args: {
    guestId: v.id('guests'),
    // Form fields (using form naming)
    guest_name: v.optional(v.string()),
    guest_email: v.optional(v.string()),
    guest_phone: v.optional(v.string()),
    guest_category: v.optional(v.string()),
    guest_side: v.optional(v.union(v.literal('bride'), v.literal('groom'), v.literal('neutral'))),
    plus_one_allowed: v.optional(v.boolean()),
    plus_one_name: v.optional(v.string()),
    invite_status: v.optional(v.union(
      v.literal('not_invited'),
      v.literal('save_the_date_sent'),
      v.literal('invited'),
      v.literal('attending'),
      v.literal('declined'),
      v.literal('maybe')
    )),
    meal_preference: v.optional(v.string()),
    dietary_restrictions: v.optional(v.array(v.string())),
    accommodation_needed: v.optional(v.boolean()),
    seating_preferences: v.optional(v.array(v.string())),
    special_requests: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    // Schema fields (for direct updates)
    phone_number: v.optional(v.string()),
    email: v.optional(v.string()),
    number_of_packs: v.optional(v.number()),
    additional_guest_names: v.optional(v.array(v.string())),
    mode_of_arrival: v.optional(v.string()),
    arrival_date_time: v.optional(v.number()),
    mode_of_departure: v.optional(v.string()),
    departure_date_time: v.optional(v.number()),
    relationship_to_family: v.optional(v.string()),
    events_attending: v.optional(v.array(v.string())),
    special_needs: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    // TEMPORARY WORKAROUND: Allow queries for testing
    if (!identity) throw new Error('Not authenticated');

    const guest = await ctx.db.get(args.guestId);
    if (!guest) throw new Error('Guest not found');

    // Map form fields to schema fields
    const updateData: any = {};

    // Basic info - prefer form fields, fallback to schema fields
    if (args.guest_name) updateData.guest_name = args.guest_name;
    if (args.guest_email !== undefined || args.email !== undefined) {
      updateData.email = args.guest_email || args.email;
    }
    if (args.guest_phone !== undefined || args.phone_number !== undefined) {
      updateData.phone_number = args.guest_phone || args.phone_number;
    }
    if (args.guest_category !== undefined) updateData.guest_category = args.guest_category;

    // Map guest_side to relationship_to_family
    if (args.guest_side !== undefined || args.relationship_to_family !== undefined) {
      updateData.relationship_to_family = args.guest_side || args.relationship_to_family;
    }

    // Plus one handling
    if (args.plus_one_allowed !== undefined) {
      updateData.number_of_packs = args.plus_one_allowed ? 2 : 1;
    }
    if (args.number_of_packs !== undefined) {
      updateData.number_of_packs = args.number_of_packs;
    }
    if (args.plus_one_name !== undefined) {
      updateData.additional_guest_names = args.plus_one_name ? [args.plus_one_name] : [];
    }
    if (args.additional_guest_names !== undefined) {
      updateData.additional_guest_names = args.additional_guest_names;
    }

    // Dietary and preferences
    if (args.dietary_restrictions !== undefined) {
      updateData.dietary_restrictions = args.dietary_restrictions;
    }
    if (args.seating_preferences !== undefined) {
      updateData.seating_preferences = args.seating_preferences;
    }

    // Special needs - combine multiple fields
    const special_needs_parts = [];
    if (args.meal_preference) special_needs_parts.push(`Meal: ${args.meal_preference}`);
    if (args.special_requests) special_needs_parts.push(args.special_requests);
    if (args.accommodation_needed) special_needs_parts.push('Accommodation needed');
    if (args.invite_status) special_needs_parts.push(`Invite status: ${args.invite_status}`);
    if (args.tags && args.tags.length > 0) special_needs_parts.push(`Tags: ${args.tags.join(', ')}`);

    if (special_needs_parts.length > 0) {
      updateData.special_needs = special_needs_parts.join(' | ');
    } else if (args.special_needs !== undefined) {
      updateData.special_needs = args.special_needs;
    }

    // Travel fields
    if (args.mode_of_arrival !== undefined) updateData.mode_of_arrival = args.mode_of_arrival;
    if (args.arrival_date_time !== undefined) updateData.arrival_date_time = args.arrival_date_time;
    if (args.mode_of_departure !== undefined) updateData.mode_of_departure = args.mode_of_departure;
    if (args.departure_date_time !== undefined) updateData.departure_date_time = args.departure_date_time;

    // Events
    if (args.events_attending !== undefined) updateData.events_attending = args.events_attending;

    // Always update timestamp
    updateData.updated_at = Date.now();

    await ctx.db.patch(args.guestId, updateData);

    return args.guestId;
  },
});

/**
 * Delete a guest
 */
export const deleteGuest = mutation({
  args: { guestId: v.id('guests') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    // TEMPORARY WORKAROUND: Allow queries for testing
    if (!identity) throw new Error('Not authenticated');

    await ctx.db.delete(args.guestId);
    return { success: true };
  },
});

/**
 * Check in a guest
 */
export const checkIn = mutation({
  args: {
    guestId: v.id('guests'),
    checked_in_by: v.id('users'),
    location: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const guest = await ctx.db.get(args.guestId);
    if (!guest) throw new Error('Guest not found');

    await ctx.db.patch(args.guestId, {
      checked_in: true,
      checked_in_at: Date.now(),
      checked_in_by: args.checked_in_by,
      checked_in_location: args.location,
      updated_at: Date.now(),
    });

    return args.guestId;
  },
});

/**
 * Update RSVP status
 */
export const updateRSVP = mutation({
  args: {
    guestId: v.id('guests'),
    form_submitted: v.boolean(),
    form_ip_address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const guest = await ctx.db.get(args.guestId);
    if (!guest) throw new Error('Guest not found');

    await ctx.db.patch(args.guestId, {
      form_submitted: args.form_submitted,
      form_submitted_at: args.form_submitted ? Date.now() : undefined,
      form_ip_address: args.form_ip_address,
      updated_at: Date.now(),
    });

    return args.guestId;
  },
});

/**
 * Generate new QR code
 */
export const generateQRCode = mutation({
  args: { guestId: v.id('guests') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    // TEMPORARY WORKAROUND: Allow queries for testing
    if (!identity) throw new Error('Not authenticated');

    const guest = await ctx.db.get(args.guestId);
    if (!guest) throw new Error('Guest not found');

    const newToken = `${guest.client_id}-${guest.serial_number}-${Date.now()}`;

    await ctx.db.patch(args.guestId, {
      qr_code_token: newToken,
      qr_scan_count: 0,
      updated_at: Date.now(),
    });

    return newToken;
  },
});

/**
 * Record QR code scan
 */
export const recordQRScan = mutation({
  args: { guestId: v.id('guests') },
  handler: async (ctx, args) => {
    const guest = await ctx.db.get(args.guestId);
    if (!guest) throw new Error('Guest not found');

    await ctx.db.patch(args.guestId, {
      qr_scan_count: guest.qr_scan_count + 1,
      qr_last_scanned: Date.now(),
      updated_at: Date.now(),
    });

    return args.guestId;
  },
});
