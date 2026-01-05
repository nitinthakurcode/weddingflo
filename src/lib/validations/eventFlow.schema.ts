import { z } from 'zod';

export const activityTypeSchema = z.enum([
  'setup',
  'ceremony',
  'reception',
  'entertainment',
  'break',
  'photography',
  'catering',
  'cleanup',
  'other',
]);

export const activityStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'cancelled',
]);

export const activityDependencySchema = z.object({
  activity_id: z.string(),
  type: z.enum(['must_finish_before', 'must_start_after', 'must_overlap']),
});

export const activityFormSchema = z.object({
  activity_name: z.string().min(2, 'Activity name must be at least 2 characters').max(100),
  activity_type: activityTypeSchema,
  activity_status: activityStatusSchema.optional().default('pending'),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  duration_minutes: z.number().positive('Duration must be positive').int().min(1).max(1440),
  vendor_ids: z.array(z.string()).optional().default([]),
  location: z.string().max(200).optional(),
  assigned_to: z.array(z.string()).optional().default([]),
  dependencies: z.array(activityDependencySchema).optional().default([]),
  time_buffer_minutes: z.number().int().min(0).max(180).optional().default(0),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  description: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
});

export type ActivityFormValues = z.input<typeof activityFormSchema>;
export type ActivityDependencyValues = z.infer<typeof activityDependencySchema>;
