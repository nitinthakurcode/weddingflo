import { z } from 'zod';

export const guestCategorySchema = z.enum([
  'bride_family',
  'groom_family',
  'bride_friends',
  'groom_friends',
  'colleagues',
  'relatives',
  'vip',
]);

export const rsvpStatusSchema = z.enum(['pending', 'accepted', 'declined']);

export const mealPreferenceSchema = z.enum([
  'veg',
  'non_veg',
  'vegan',
  'jain',
  'custom',
]);

export const travelModeSchema = z.enum(['flight', 'car', 'train', 'bus', 'other']);

export const guestSideSchema = z.enum(['bride_side', 'groom_side', 'mutual']);

export const guestFormSchema = z.object({
  // Basic info
  guest_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  guest_email: z.string().email('Invalid email address').optional().or(z.literal('')),
  guest_phone: z.string().optional(),

  // Party info
  party_size: z.number().min(1).optional().default(1),
  additional_guest_names: z.array(z.string()).optional().default([]),

  // Travel info
  arrival_datetime: z.string().optional(),
  arrival_mode: travelModeSchema.optional(),
  departure_datetime: z.string().optional(),
  departure_mode: travelModeSchema.optional(),

  // Relationship
  relationship_to_family: z.string().optional(),
  group_name: z.string().optional(),
  guest_side: guestSideSchema.optional().default('mutual'),
  attending_events: z.array(z.string()).optional().default([]),

  // RSVP and preferences
  rsvp_status: rsvpStatusSchema.optional().default('pending'),
  meal_preference: mealPreferenceSchema.optional(),
  dietary_restrictions: z.string().optional(),

  // Plus one
  plus_one_allowed: z.boolean().optional().default(false),
  plus_one_name: z.string().optional(),

  // Accommodation
  hotel_required: z.boolean().optional().default(false),
  hotel_name: z.string().optional(),
  hotel_check_in: z.string().optional(),
  hotel_check_out: z.string().optional(),
  hotel_room_type: z.string().optional(),

  // Transport
  transport_required: z.boolean().optional().default(false),
  transport_type: z.string().optional(),
  transport_pickup_location: z.string().optional(),
  transport_pickup_time: z.string().optional(),
  transport_notes: z.string().optional(),

  // Planner-only fields
  gift_to_give: z.string().optional(),
  notes: z.string().optional(),
});

export const bulkImportSchema = z.object({
  guest_name: z.string().min(2),
  guest_email: z.string().email().optional().or(z.literal('')),
  guest_phone: z.string().optional(),
  party_size: z.string().optional(),
  additional_guest_names: z.string().optional(),
  arrival_datetime: z.string().optional(),
  arrival_mode: z.string().optional(),
  departure_datetime: z.string().optional(),
  departure_mode: z.string().optional(),
  relationship_to_family: z.string().optional(),
  group_name: z.string().optional(),
  attending_events: z.string().optional(),
  rsvp_status: z.string().optional(),
  meal_preference: z.string().optional(),
  dietary_restrictions: z.string().optional(),
  hotel_required: z.string().optional(),
  transport_required: z.string().optional(),
  gift_to_give: z.string().optional(),
  notes: z.string().optional(),
});

export const checkInSchema = z.object({
  guestId: z.string(),
  checked_in_by: z.string(),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
});

export type GuestFormValues = z.input<typeof guestFormSchema>;
export type BulkImportValues = z.infer<typeof bulkImportSchema>;
export type CheckInValues = z.infer<typeof checkInSchema>;
