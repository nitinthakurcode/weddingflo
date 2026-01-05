import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DashboardChartsProps {
  guestsByCategory: Record<string, number>;
  budgetByCategory: Record<string, number>;
  vendorsByStatus: Record<string, number>;
  totalGuests: number;
  confirmedGuests: number;
  budgetSpent: number;
  totalBudget: number;
}

/**
 * Theme-aligned chart colors (2026 Design System)
 * These reference CSS variables from src/styles/tokens/colors.css
 * Note: Recharts requires hex values - we use CSS custom property fallbacks
 * When theme changes, these will automatically update via CSS variables
 */
const THEME_COLORS = {
  teal500: 'var(--teal-500, #14B8A6)',
  rose400: 'var(--rose-400, #FB7185)',
  gold400: 'var(--gold-400, #FACC15)',
  cobalt400: 'var(--cobalt-400, #60A5FA)',
  sage500: 'var(--sage-500, #7BAF6B)',
  mocha400: 'var(--mocha-400, #B8A089)',
  rose600: 'var(--rose-600, #BE123C)',
  mocha300: 'var(--mocha-300, #D4C4B7)',
} as const;

// Recharts color arrays - these will use the theme variables with fallbacks
const COLORS = {
  primary: [
    THEME_COLORS.teal500,
    THEME_COLORS.rose400,
    THEME_COLORS.gold400,
    THEME_COLORS.cobalt400,
    THEME_COLORS.sage500,
    THEME_COLORS.mocha400,
  ],
  status: {
    booked: THEME_COLORS.sage500,
    confirmed: THEME_COLORS.teal500,
    quoted: THEME_COLORS.gold400,
    contacted: THEME_COLORS.cobalt400,
    prospect: THEME_COLORS.mocha400,
    completed: THEME_COLORS.sage500,
    cancelled: THEME_COLORS.rose600,
  },
};

export function DashboardCharts({
  guestsByCategory,
  budgetByCategory,
  vendorsByStatus,
  totalGuests,
  confirmedGuests,
  budgetSpent,
  totalBudget,
}: DashboardChartsProps) {
  // Guest confirmation data for pie chart
  const guestConfirmationData = [
    { name: 'Confirmed', value: confirmedGuests },
    { name: 'Pending', value: totalGuests - confirmedGuests },
  ];

  // Budget breakdown for donut chart
  const budgetData = Object.entries(budgetByCategory).map(([category, value]) => ({
    name: category.charAt(0).toUpperCase() + category.slice(1),
    value,
  }));

  // Vendor status for bar chart
  const vendorData = Object.entries(vendorsByStatus).map(([status, count]) => ({
    status: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
    count,
  }));

  // Budget progress
  const budgetProgress = totalBudget > 0 ? (budgetSpent / totalBudget) * 100 : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Guest Confirmation Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Guest Confirmations</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={guestConfirmationData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {guestConfirmationData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? THEME_COLORS.sage500 : THEME_COLORS.mocha300}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Budget Breakdown Donut Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {budgetData.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
              No budget data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={budgetData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {budgetData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS.primary[index % COLORS.primary.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: string | number | (string | number)[] | undefined) => {
                    if (value === undefined) return '';
                    if (Array.isArray(value)) return value.join(', ');
                    return typeof value === 'number' ? `$${value.toLocaleString()}` : value;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Budget Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Spent</span>
              <span className="font-medium">
                ${budgetSpent.toLocaleString()} / ${totalBudget.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-mocha-200 rounded-full h-6 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  budgetProgress > 90
                    ? 'bg-rose-500'
                    : budgetProgress > 75
                    ? 'bg-gold-500'
                    : 'bg-sage-500'
                }`}
                style={{ width: `${Math.min(budgetProgress, 100)}%` }}
              >
                <span className="flex items-center justify-center h-full text-xs font-medium text-white">
                  {budgetProgress.toFixed(1)}%
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {budgetProgress > 90 ? (
                <span className="text-rose-600 font-medium">
                  Warning: Over 90% of budget used
                </span>
              ) : budgetProgress > 75 ? (
                <span className="text-gold-600 font-medium">
                  Approaching budget limit
                </span>
              ) : (
                <span className="text-sage-600 font-medium">
                  Budget on track
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Status Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Status</CardTitle>
        </CardHeader>
        <CardContent>
          {vendorData.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
              No vendor data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={vendorData}>
                <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill={THEME_COLORS.teal500} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
