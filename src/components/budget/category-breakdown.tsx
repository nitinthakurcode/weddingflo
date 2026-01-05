'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CategoryBreakdown } from '@/types/budget';
import { BUDGET_CATEGORIES } from '@/types/budget';
import { formatCurrency } from '@/lib/budget-calculations';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

interface CategoryBreakdownProps {
  data: CategoryBreakdown[];
  isLoading?: boolean;
}

// Theme-aware chart colors using CSS variables
const COLORS = [
  'var(--teal-500, #14B8A6)',
  'var(--teal-400, #2DD4BF)',
  'var(--teal-300, #5EEAD4)',
  'var(--teal-200, #99F6E4)',
  'var(--sage-500, #5A9A49)',
  'var(--cobalt-500, #2563EB)',
  'var(--gold-500, #D4A853)',
  'var(--rose-500, #E11D48)',
  'var(--rose-400, #FB7185)',
  'var(--teal-600, #0D9488)',
  'var(--cobalt-400, #60A5FA)',
  'var(--sage-400, #7BAF6B)',
  'var(--gold-400, #FACC15)',
  'var(--cobalt-600, #1D4ED8)',
  'var(--teal-700, #0F766E)',
];

export function CategoryBreakdown({ data, isLoading }: CategoryBreakdownProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget by Category</CardTitle>
          <CardDescription>Distribution of your budget across categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading chart...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget by Category</CardTitle>
          <CardDescription>Distribution of your budget across categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No budget data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    name: BUDGET_CATEGORIES[item.category as keyof typeof BUDGET_CATEGORIES] || item.category,
    value: item.budget,
    spent: item.spent,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Budget: {formatCurrency(data.value)}
          </p>
          <p className="text-sm text-muted-foreground">
            Spent: {formatCurrency(data.payload.spent)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget by Category</CardTitle>
        <CardDescription>Distribution of your budget across categories</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
