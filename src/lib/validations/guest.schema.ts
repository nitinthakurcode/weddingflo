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

export const guestSideSchema = z.enum(['bride', 'groom', 'neutral']);

export const inviteStatusSchema = z.enum([
  'invited',
  'not_invited',
  'save_the_date_sent',
]);

export const mealPreferenceSchema = z.enum([
  'veg',
  'non_veg',
  'vegan',
  'jain',
  'custom',
]);

export const guestFormSchema = z.object({
  guest_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  guest_email: z.string().email('Invalid email address').optional().or(z.literal('')),
  guest_phone: z.string().optional(),
  guest_category: guestCategorySchema,
  guest_side: guestSideSchema,
  plus_one_allowed: z.boolean().default(false),
  plus_one_name: z.string().optional(),
  invite_status: inviteStatusSchema.default('not_invited'),
  meal_preference: mealPreferenceSchema.optional(),
  dietary_restrictions: z.string().optional(),
  accommodation_needed: z.boolean().default(false),
  special_requests: z.string().optional(),
  seating_preference: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const bulkImportSchema = z.object({
  guest_name: z.string().min(2),
  guest_email: z.string().email().optional().or(z.literal('')),
  guest_phone: z.string().optional(),
  guest_category: z.string(),
  guest_side: z.string(),
  plus_one_allowed: z.string(),
  plus_one_name: z.string().optional(),
  meal_preference: z.string().optional(),
  accommodation_needed: z.string(),
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

export type GuestFormValues = z.infer<typeof guestFormSchema>;
export type BulkImportValues = z.infer<typeof bulkImportSchema>;
export type CheckInValues = z.infer<typeof checkInSchema>;
