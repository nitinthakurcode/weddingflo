import { Id } from '@/convex/_generated/dataModel';

export type BudgetCategory =
  | 'venue'
  | 'catering'
  | 'photography'
  | 'videography'
  | 'florist'
  | 'music'
  | 'decor'
  | 'transportation'
  | 'stationery'
  | 'attire'
  | 'hair_makeup'
  | 'cake'
  | 'entertainment'
  | 'gifts'
  | 'other';

export interface BudgetItem {
  _id: Id<'event_budget'>;
  weddingId: Id<'weddings'>;
  category: BudgetCategory;
  item_name: string;
  description?: string;
  budget: number;
  actual_cost: number;
  paid_amount: number;
  vendor_id?: Id<'vendors'>;
  payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue';
  due_date?: string;
  paid_date?: string;
  receipt_url?: string;
  notes?: string;
  created_at: number;
  updated_at: number;
}

export interface BudgetStats {
  totalBudget: number;
  totalSpent: number;
  totalPaid: number;
  totalRemaining: number;
  variance: number;
  variancePercentage: number;
  itemCount: number;
  paidCount: number;
  overdueCount: number;
}

export interface CategoryBreakdown {
  category: BudgetCategory;
  budget: number;
  spent: number;
  variance: number;
  percentage: number;
}

export interface SpendingTimeline {
  date: string;
  amount: number;
  cumulative: number;
}

export const BUDGET_CATEGORIES: Record<BudgetCategory, string> = {
  venue: 'Venue',
  catering: 'Catering',
  photography: 'Photography',
  videography: 'Videography',
  florist: 'Florist',
  music: 'Music & DJ',
  decor: 'Decor',
  transportation: 'Transportation',
  stationery: 'Stationery',
  attire: 'Attire',
  hair_makeup: 'Hair & Makeup',
  cake: 'Cake',
  entertainment: 'Entertainment',
  gifts: 'Gifts & Favors',
  other: 'Other',
};

export const PAYMENT_STATUS_LABELS = {
  unpaid: 'Unpaid',
  partial: 'Partial',
  paid: 'Paid',
  overdue: 'Overdue',
};
