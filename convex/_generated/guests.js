"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordQRScan = exports.generateQRCode = exports.updateRSVP = exports.checkIn = exports.deleteGuest = exports.update = exports.bulkCreate = exports.create = exports.getCheckInStats = exports.getByQRToken = exports.search = exports.list = exports.get = void 0;
const values_1 = require("convex/values");
const server_1 = require("./_generated/server");
/**
 * Get a guest by ID
 */
exports.get = (0, server_1.query)({
    args: { guestId: values_1.v.id('guests') },
    handler: async (ctx, args) => {
        const guest = await ctx.db.get(args.guestId);
        if (!guest)
            throw new Error('Guest not found');
        return guest;
    },
});
/**
 * List guests for a client
 */
exports.list = (0, server_1.query)({
    args: { clientId: values_1.v.id('clients') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        // TEMPORARY WORKAROUND: Allow queries for testing
        if (!identity)
            throw new Error('Not authenticated');
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
exports.search = (0, server_1.query)({
    args: {
        clientId: values_1.v.id('clients'),
        query: values_1.v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        // TEMPORARY WORKAROUND: Allow queries for testing
        if (!identity)
            throw new Error('Not authenticated');
        const results = await ctx.db
            .query('guests')
            .withSearchIndex('search_guests', (q) => q.search('guest_name', args.query).eq('client_id', args.clientId))
            .collect();
        return results;
    },
});
/**
 * Get guest by QR token
 */
exports.getByQRToken = (0, server_1.query)({
    args: { token: values_1.v.string() },
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
exports.getCheckInStats = (0, server_1.query)({
    args: { clientId: values_1.v.id('clients') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        // TEMPORARY WORKAROUND: Allow queries for testing
        if (!identity)
            throw new Error('Not authenticated');
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
exports.create = (0, server_1.mutation)({
    args: {
        company_id: values_1.v.id('companies'),
        client_id: values_1.v.id('clients'),
        guest_name: values_1.v.string(),
        guest_email: values_1.v.optional(values_1.v.string()),
        guest_phone: values_1.v.optional(values_1.v.string()),
        guest_category: values_1.v.string(),
        guest_side: values_1.v.union(values_1.v.literal('bride'), values_1.v.literal('groom'), values_1.v.literal('neutral')),
        plus_one_allowed: values_1.v.boolean(),
        plus_one_name: values_1.v.optional(values_1.v.string()),
        invite_status: values_1.v.union(values_1.v.literal('not_invited'), values_1.v.literal('save_the_date_sent'), values_1.v.literal('invited'), values_1.v.literal('attending'), values_1.v.literal('declined'), values_1.v.literal('maybe')),
        meal_preference: values_1.v.optional(values_1.v.string()),
        dietary_restrictions: values_1.v.optional(values_1.v.string()),
        accommodation_needed: values_1.v.boolean(),
        seating_preference: values_1.v.optional(values_1.v.string()),
        special_requests: values_1.v.optional(values_1.v.string()),
        tags: values_1.v.array(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        // TEMPORARY WORKAROUND: Allow queries for testing
        if (!identity)
            throw new Error('Not authenticated');
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
        if (args.meal_preference)
            special_needs_parts.push(`Meal: ${args.meal_preference}`);
        if (args.special_requests)
            special_needs_parts.push(args.special_requests);
        if (args.accommodation_needed)
            special_needs_parts.push('Accommodation needed');
        if (args.invite_status)
            special_needs_parts.push(`Invite status: ${args.invite_status}`);
        if (args.tags.length > 0)
            special_needs_parts.push(`Tags: ${args.tags.join(', ')}`);
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
 * Bulk create or update guests (upsert)
 */
exports.bulkCreate = (0, server_1.mutation)({
    args: {
        company_id: values_1.v.id('companies'),
        client_id: values_1.v.id('clients'),
        guests: values_1.v.array(values_1.v.object({
            serial_number: values_1.v.number(),
            guest_name: values_1.v.string(),
            phone_number: values_1.v.optional(values_1.v.string()),
            email: values_1.v.optional(values_1.v.string()),
            number_of_packs: values_1.v.number(),
            additional_guest_names: values_1.v.array(values_1.v.string()),
            guest_category: values_1.v.optional(values_1.v.string()),
            events_attending: values_1.v.array(values_1.v.string()),
        })),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        // TEMPORARY WORKAROUND: Allow queries for testing
        if (!identity)
            throw new Error('Not authenticated');
        // Get all existing guests for this client
        const existingGuests = await ctx.db
            .query('guests')
            .withIndex('by_client', (q) => q.eq('client_id', args.client_id))
            .collect();
        const now = Date.now();
        const created = [];
        const updated = [];
        for (const guest of args.guests) {
            // Find existing guest by name (case-insensitive), email, or phone
            const existingGuest = existingGuests.find((existing) => {
                const nameMatch = existing.guest_name.toLowerCase() === guest.guest_name.toLowerCase();
                const emailMatch = guest.email && existing.email &&
                    existing.email.toLowerCase() === guest.email.toLowerCase();
                const phoneMatch = guest.phone_number && existing.phone_number &&
                    existing.phone_number === guest.phone_number;
                return nameMatch || emailMatch || phoneMatch;
            });
            if (existingGuest) {
                // UPDATE existing guest
                await ctx.db.patch(existingGuest._id, {
                    guest_name: guest.guest_name, // Update name in case of case changes
                    phone_number: guest.phone_number,
                    email: guest.email,
                    number_of_packs: guest.number_of_packs,
                    additional_guest_names: guest.additional_guest_names,
                    guest_category: guest.guest_category,
                    events_attending: guest.events_attending,
                    updated_at: now,
                });
                updated.push(guest.guest_name);
            }
            else {
                // CREATE new guest
                const qrToken = `${args.client_id}-${guest.serial_number}-${now}`;
                await ctx.db.insert('guests', {
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
                created.push(guest.guest_name);
            }
        }
        return {
            created: created.length,
            createdNames: created,
            updated: updated.length,
            updatedNames: updated,
            total: created.length + updated.length,
        };
    },
});
/**
 * Update guest information
 */
exports.update = (0, server_1.mutation)({
    args: {
        guestId: values_1.v.id('guests'),
        // Form fields (using form naming)
        guest_name: values_1.v.optional(values_1.v.string()),
        guest_email: values_1.v.optional(values_1.v.string()),
        guest_phone: values_1.v.optional(values_1.v.string()),
        guest_category: values_1.v.optional(values_1.v.string()),
        guest_side: values_1.v.optional(values_1.v.union(values_1.v.literal('bride'), values_1.v.literal('groom'), values_1.v.literal('neutral'))),
        plus_one_allowed: values_1.v.optional(values_1.v.boolean()),
        plus_one_name: values_1.v.optional(values_1.v.string()),
        invite_status: values_1.v.optional(values_1.v.union(values_1.v.literal('not_invited'), values_1.v.literal('save_the_date_sent'), values_1.v.literal('invited'), values_1.v.literal('attending'), values_1.v.literal('declined'), values_1.v.literal('maybe'))),
        meal_preference: values_1.v.optional(values_1.v.string()),
        dietary_restrictions: values_1.v.optional(values_1.v.array(values_1.v.string())),
        accommodation_needed: values_1.v.optional(values_1.v.boolean()),
        seating_preferences: values_1.v.optional(values_1.v.array(values_1.v.string())),
        special_requests: values_1.v.optional(values_1.v.string()),
        tags: values_1.v.optional(values_1.v.array(values_1.v.string())),
        // Schema fields (for direct updates)
        phone_number: values_1.v.optional(values_1.v.string()),
        email: values_1.v.optional(values_1.v.string()),
        number_of_packs: values_1.v.optional(values_1.v.number()),
        additional_guest_names: values_1.v.optional(values_1.v.array(values_1.v.string())),
        mode_of_arrival: values_1.v.optional(values_1.v.string()),
        arrival_date_time: values_1.v.optional(values_1.v.number()),
        mode_of_departure: values_1.v.optional(values_1.v.string()),
        departure_date_time: values_1.v.optional(values_1.v.number()),
        relationship_to_family: values_1.v.optional(values_1.v.string()),
        events_attending: values_1.v.optional(values_1.v.array(values_1.v.string())),
        special_needs: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        // TEMPORARY WORKAROUND: Allow queries for testing
        if (!identity)
            throw new Error('Not authenticated');
        const guest = await ctx.db.get(args.guestId);
        if (!guest)
            throw new Error('Guest not found');
        // Map form fields to schema fields
        const updateData = {};
        // Basic info - prefer form fields, fallback to schema fields
        if (args.guest_name)
            updateData.guest_name = args.guest_name;
        if (args.guest_email !== undefined || args.email !== undefined) {
            updateData.email = args.guest_email || args.email;
        }
        if (args.guest_phone !== undefined || args.phone_number !== undefined) {
            updateData.phone_number = args.guest_phone || args.phone_number;
        }
        if (args.guest_category !== undefined)
            updateData.guest_category = args.guest_category;
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
        if (args.meal_preference)
            special_needs_parts.push(`Meal: ${args.meal_preference}`);
        if (args.special_requests)
            special_needs_parts.push(args.special_requests);
        if (args.accommodation_needed)
            special_needs_parts.push('Accommodation needed');
        if (args.invite_status)
            special_needs_parts.push(`Invite status: ${args.invite_status}`);
        if (args.tags && args.tags.length > 0)
            special_needs_parts.push(`Tags: ${args.tags.join(', ')}`);
        if (special_needs_parts.length > 0) {
            updateData.special_needs = special_needs_parts.join(' | ');
        }
        else if (args.special_needs !== undefined) {
            updateData.special_needs = args.special_needs;
        }
        // Travel fields
        if (args.mode_of_arrival !== undefined)
            updateData.mode_of_arrival = args.mode_of_arrival;
        if (args.arrival_date_time !== undefined)
            updateData.arrival_date_time = args.arrival_date_time;
        if (args.mode_of_departure !== undefined)
            updateData.mode_of_departure = args.mode_of_departure;
        if (args.departure_date_time !== undefined)
            updateData.departure_date_time = args.departure_date_time;
        // Events
        if (args.events_attending !== undefined)
            updateData.events_attending = args.events_attending;
        // Always update timestamp
        updateData.updated_at = Date.now();
        await ctx.db.patch(args.guestId, updateData);
        return args.guestId;
    },
});
/**
 * Delete a guest
 */
exports.deleteGuest = (0, server_1.mutation)({
    args: { guestId: values_1.v.id('guests') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        // TEMPORARY WORKAROUND: Allow queries for testing
        if (!identity)
            throw new Error('Not authenticated');
        await ctx.db.delete(args.guestId);
        return { success: true };
    },
});
/**
 * Check in a guest
 */
exports.checkIn = (0, server_1.mutation)({
    args: {
        guestId: values_1.v.id('guests'),
        checked_in_by: values_1.v.id('users'),
        location: values_1.v.optional(values_1.v.object({
            lat: values_1.v.number(),
            lng: values_1.v.number(),
        })),
    },
    handler: async (ctx, args) => {
        const guest = await ctx.db.get(args.guestId);
        if (!guest)
            throw new Error('Guest not found');
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
exports.updateRSVP = (0, server_1.mutation)({
    args: {
        guestId: values_1.v.id('guests'),
        form_submitted: values_1.v.boolean(),
        form_ip_address: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const guest = await ctx.db.get(args.guestId);
        if (!guest)
            throw new Error('Guest not found');
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
exports.generateQRCode = (0, server_1.mutation)({
    args: { guestId: values_1.v.id('guests') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        // TEMPORARY WORKAROUND: Allow queries for testing
        if (!identity)
            throw new Error('Not authenticated');
        const guest = await ctx.db.get(args.guestId);
        if (!guest)
            throw new Error('Guest not found');
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
exports.recordQRScan = (0, server_1.mutation)({
    args: { guestId: values_1.v.id('guests') },
    handler: async (ctx, args) => {
        const guest = await ctx.db.get(args.guestId);
        if (!guest)
            throw new Error('Guest not found');
        await ctx.db.patch(args.guestId, {
            qr_scan_count: guest.qr_scan_count + 1,
            qr_last_scanned: Date.now(),
            updated_at: Date.now(),
        });
        return args.guestId;
    },
});
