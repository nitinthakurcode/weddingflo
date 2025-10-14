import { BudgetItem, BudgetStats, CategoryBreakdown, SpendingTimeline } from '@/types/budget';

export function calculateBudgetStats(items: BudgetItem[]): BudgetStats {
  const totalBudget = items.reduce((sum, item) => sum + item.budget, 0);
  const totalSpent = items.reduce((sum, item) => sum + item.actual_cost, 0);
  const totalPaid = items.reduce((sum, item) => sum + item.paid_amount, 0);
  const totalRemaining = totalBudget - totalSpent;
  const variance = totalBudget - totalSpent;
  const variancePercentage = totalBudget > 0 ? (variance / totalBudget) * 100 : 0;
  const paidCount = items.filter((item) => item.payment_status === 'paid').length;
  const overdueCount = items.filter((item) => item.payment_status === 'overdue').length;

  return {
    totalBudget,
    totalSpent,
    totalPaid,
    totalRemaining,
    variance,
    variancePercentage,
    itemCount: items.length,
    paidCount,
    overdueCount,
  };
}

export function calculateCategoryBreakdown(items: BudgetItem[]): CategoryBreakdown[] {
  const categoryMap = new Map<string, { budget: number; spent: number }>();

  items.forEach((item) => {
    const existing = categoryMap.get(item.category) || { budget: 0, spent: 0 };
    categoryMap.set(item.category, {
      budget: existing.budget + item.budget,
      spent: existing.spent + item.actual_cost,
    });
  });

  const totalBudget = items.reduce((sum, item) => sum + item.budget, 0);

  return Array.from(categoryMap.entries()).map(([category, data]) => ({
    category: category as any,
    budget: data.budget,
    spent: data.spent,
    variance: data.budget - data.spent,
    percentage: totalBudget > 0 ? (data.budget / totalBudget) * 100 : 0,
  }));
}

export function calculateSpendingTimeline(items: BudgetItem[]): SpendingTimeline[] {
  const dateMap = new Map<string, number>();

  items.forEach((item) => {
    if (item.paid_date && item.paid_amount > 0) {
      const date = item.paid_date.split('T')[0]; // Get YYYY-MM-DD
      const existing = dateMap.get(date) || 0;
      dateMap.set(date, existing + item.paid_amount);
    }
  });

  const sorted = Array.from(dateMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  let cumulative = 0;
  return sorted.map(([date, amount]) => {
    cumulative += amount;
    return { date, amount, cumulative };
  });
}

export function getVarianceColor(variance: number, budget: number): string {
  if (budget === 0) return 'text-gray-500';
  const percentage = (variance / budget) * 100;

  if (percentage > 10) return 'text-green-600';
  if (percentage > 0) return 'text-yellow-600';
  if (percentage > -10) return 'text-orange-600';
  return 'text-red-600';
}

export function getVarianceBgColor(variance: number, budget: number): string {
  if (budget === 0) return 'bg-gray-100';
  const percentage = (variance / budget) * 100;

  if (percentage > 10) return 'bg-green-100';
  if (percentage > 0) return 'bg-yellow-100';
  if (percentage > -10) return 'bg-orange-100';
  return 'bg-red-100';
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
