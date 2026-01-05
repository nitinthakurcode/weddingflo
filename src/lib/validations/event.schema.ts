import { z } from 'zod';

export const eventTypeSchema = z.enum([
  'ceremony',
  'reception',
  'sangeet',
  'mehendi',
  'haldi',
  'engagement',
  'cocktail',
  'rehearsal',
  'other',
]);

export const eventStatusSchema = z.enum([
  'draft',
  'confirmed',
  'completed',
  'cancelled',
]);

export const venueDetailsSchema = z.object({
  name: z.string().min(2, 'Venue name must be at least 2 characters'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  city: z.string().min(2, 'City must be at least 2 characters'),
  state: z.string().min(2, 'State must be at least 2 characters'),
  postal_code: z.string().optional(),
  country: z.string().min(2, 'Country must be at least 2 characters'),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email('Invalid email address').optional().or(z.literal('')),
  capacity: z.number().positive('Capacity must be positive').optional(),
  notes: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const eventFormSchema = z.object({
  event_name: z.string().min(2, 'Event name must be at least 2 characters').max(100),
  event_type: eventTypeSchema,
  event_date: z.number().positive('Event date is required'),
  event_start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  event_end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  event_status: eventStatusSchema.optional().default('draft'),
  venue_details: venueDetailsSchema,
  estimated_guests: z.number().positive('Must have at least 1 guest').int(),
  actual_guests: z.number().positive().int().optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  dress_code: z.string().max(100).optional(),
  special_instructions: z.string().max(500).optional(),
  budget_allocated: z.number().positive('Budget must be positive').optional(),
  tags: z.array(z.string()).optional().default([]),
}).refine(
  (data) => {
    const [startHour, startMin] = data.event_start_time.split(':').map(Number);
    const [endHour, endMin] = data.event_end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return endMinutes > startMinutes;
  },
  {
    message: 'End time must be after start time',
    path: ['event_end_time'],
  }
);

export type EventFormValues = z.input<typeof eventFormSchema>;
export type VenueDetailsValues = z.infer<typeof venueDetailsSchema>;
