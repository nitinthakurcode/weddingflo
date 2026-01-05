import { z } from 'zod';

export const creativeSchema = z.object({
  type: z.enum([
    'invitation',
    'save_the_date',
    'program',
    'menu',
    'place_card',
    'table_number',
    'signage',
    'thank_you_card',
    'website',
    'photo_album',
    'video',
    'other',
  ]),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z
    .enum(['pending', 'in_progress', 'review', 'approved', 'completed', 'cancelled'])
    .optional()
    .default('pending'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  assigned_to: z.string().optional(),
  vendor_id: z.string().optional(),
  due_date: z.string().optional(),
  budget: z.number().min(0).optional(),
  actual_cost: z.number().min(0).optional(),
  feedback: z.string().optional(),
  notes: z.string().optional(),
});

export type CreativeFormData = z.input<typeof creativeSchema>;
