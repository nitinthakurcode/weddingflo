import { z } from 'zod';

/**
 * Budget Form Schema - December 2025 Standard (camelCase)
 *
 * Aligned with Drizzle ORM field naming conventions
 */
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
  itemName: z.string().min(1, 'Item name is required'),
  expenseDetails: z.string().optional(),
  estimatedCost: z.number().min(0, 'Budget must be positive'),
  actualCost: z.number().min(0, 'Actual cost must be positive').optional(),
  vendorId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  paymentStatus: z.enum(['pending', 'paid', 'overdue']).optional().default('pending'),
  transactionDate: z.string().optional(),
  paymentDate: z.string().optional(),
  notes: z.string().optional(),
  clientVisible: z.boolean().optional().default(true),
});

export type BudgetFormData = z.input<typeof budgetSchema>;
