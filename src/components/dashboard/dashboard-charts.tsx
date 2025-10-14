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

const COLORS = {
  primary: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'],
  status: {
    booked: '#10b981',
    confirmed: '#3b82f6',
    quoted: '#f59e0b',
    contacted: '#8b5cf6',
    prospect: '#6b7280',
    completed: '#10b981',
    cancelled: '#ef4444',
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
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {guestConfirmationData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? '#10b981' : '#e5e7eb'}
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
                    `${name}: ${(percent * 100).toFixed(0)}%`
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
                  formatter={(value: number) =>
                    `$${value.toLocaleString()}`
                  }
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
            <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  budgetProgress > 90
                    ? 'bg-red-500'
                    : budgetProgress > 75
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
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
                <span className="text-red-600 font-medium">
                  Warning: Over 90% of budget used
                </span>
              ) : budgetProgress > 75 ? (
                <span className="text-yellow-600 font-medium">
                  Approaching budget limit
                </span>
              ) : (
                <span className="text-green-600 font-medium">
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
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
