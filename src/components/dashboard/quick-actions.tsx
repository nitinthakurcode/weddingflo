import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  UserPlus,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Gift,
  Hotel,
} from 'lucide-react';

export function QuickActions() {
  const router = useRouter();

  const actions = [
    {
      title: 'Add Guest',
      icon: UserPlus,
      href: '/dashboard/guests',
      iconColor: '#4f46e5', // Indigo-600
      bgColor: '#e0e7ff', // Indigo-100
      hoverBgColor: '#c7d2fe', // Indigo-200
    },
    {
      title: 'Add Vendor',
      icon: Users,
      href: '/dashboard/vendors',
      iconColor: '#db2777', // Pink-600
      bgColor: '#fce7f3', // Pink-100
      hoverBgColor: '#fbcfe8', // Pink-200
    },
    {
      title: 'Add Event',
      icon: Calendar,
      href: '/dashboard/events',
      iconColor: '#d97706', // Amber-600
      bgColor: '#fef3c7', // Amber-100
      hoverBgColor: '#fde68a', // Amber-200
    },
    {
      title: 'Add Expense',
      icon: DollarSign,
      href: '/dashboard/budget',
      iconColor: '#4f46e5', // Indigo-600
      bgColor: '#e0e7ff', // Indigo-100
      hoverBgColor: '#c7d2fe', // Indigo-200
    },
    {
      title: 'Add Creative',
      icon: FileText,
      href: '/dashboard/creatives',
      iconColor: '#db2777', // Pink-600
      bgColor: '#fce7f3', // Pink-100
      hoverBgColor: '#fbcfe8', // Pink-200
    },
    {
      title: 'Add Gift',
      icon: Gift,
      href: '/dashboard/gifts',
      iconColor: '#d97706', // Amber-600
      bgColor: '#fef3c7', // Amber-100
      hoverBgColor: '#fde68a', // Amber-200
    },
    {
      title: 'Add Hotel',
      icon: Hotel,
      href: '/dashboard/hotels',
      iconColor: '#4f46e5', // Indigo-600
      bgColor: '#e0e7ff', // Indigo-100
      hoverBgColor: '#c7d2fe', // Indigo-200
    },
  ];

  return (
    <Card className="border-2 shadow-md">
      <CardHeader
        className="border-b-2"
        style={{
          background: 'linear-gradient(to right, #e0e7ff, #fce7f3)', // Indigo-100 to Pink-100
          borderBottomColor: '#a5b4fc', // Indigo-300
        }}
      >
        <CardTitle className="text-xl font-bold" style={{ color: '#1e1b4b' }}>
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {actions.map((action) => (
            <Button
              key={action.title}
              variant="outline"
              className="flex flex-col items-center gap-3 h-auto py-5 px-4 border-2 border-transparent hover:border-current transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 rounded-xl"
              style={{
                backgroundColor: action.bgColor,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = action.hoverBgColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = action.bgColor;
              }}
              onClick={() => router.push(action.href)}
            >
              <div className="p-3 rounded-xl bg-white shadow-sm">
                <action.icon className="h-6 w-6" style={{ color: action.iconColor }} />
              </div>
              <span className="text-sm font-semibold text-gray-700">{action.title}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
