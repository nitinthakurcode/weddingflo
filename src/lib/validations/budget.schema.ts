import { z } from 'zod';

export const budgetSchema = z.object({
  category: z.enum([
    'venue',
    'catering',
    'photography',
    'videography',
    'florist',
    'music',
    'decor',
    'transportation',
    'stationery',
    'attire',
    'hair_makeup',
    'cake',
    'entertainment',
    'gifts',
    'other',
  ]),
  item_name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  budget: z.number().min(0, 'Budget must be positive'),
  actual_cost: z.number().min(0, 'Actual cost must be positive').default(0),
  paid_amount: z.number().min(0, 'Paid amount must be positive').default(0),
  vendor_id: z.string().optional(),
  payment_status: z.enum(['unpaid', 'partial', 'paid', 'overdue']).default('unpaid'),
  due_date: z.string().optional(),
  paid_date: z.string().optional(),
  notes: z.string().optional(),
});

export type BudgetFormData = z.infer<typeof budgetSchema>;
