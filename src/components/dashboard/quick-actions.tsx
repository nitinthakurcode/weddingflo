import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/lib/navigation';
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

  // Theme-aware colors using CSS variables from design tokens
  const actions = [
    {
      title: 'Add Guest',
      icon: UserPlus,
      href: '/dashboard/guests',
      iconColor: 'var(--cobalt-500, #2563EB)',
      bgColor: 'var(--cobalt-50, #EFF6FF)',
      hoverBgColor: 'var(--cobalt-100, #DBEAFE)',
    },
    {
      title: 'Add Vendor',
      icon: Users,
      href: '/dashboard/vendors',
      iconColor: 'var(--rose-500, #E11D48)',
      bgColor: 'var(--rose-50, #FFF5F6)',
      hoverBgColor: 'var(--rose-100, #FFE4E8)',
    },
    {
      title: 'Add Event',
      icon: Calendar,
      href: '/dashboard/events',
      iconColor: 'var(--gold-600, #B8923E)',
      bgColor: 'var(--gold-50, #FFFEF7)',
      hoverBgColor: 'var(--gold-100, #FEFCE8)',
    },
    {
      title: 'Add Expense',
      icon: DollarSign,
      href: '/dashboard/budget',
      iconColor: 'var(--teal-500, #14B8A6)',
      bgColor: 'var(--teal-50, #F0FDFA)',
      hoverBgColor: 'var(--teal-100, #CCFBF1)',
    },
    {
      title: 'Add Creative',
      icon: FileText,
      href: '/dashboard/creatives',
      iconColor: 'var(--rose-500, #E11D48)',
      bgColor: 'var(--rose-50, #FFF5F6)',
      hoverBgColor: 'var(--rose-100, #FFE4E8)',
    },
    {
      title: 'Add Gift',
      icon: Gift,
      href: '/dashboard/gifts',
      iconColor: 'var(--gold-600, #B8923E)',
      bgColor: 'var(--gold-50, #FFFEF7)',
      hoverBgColor: 'var(--gold-100, #FEFCE8)',
    },
    {
      title: 'Add Hotel',
      icon: Hotel,
      href: '/dashboard/hotels',
      iconColor: 'var(--cobalt-500, #2563EB)',
      bgColor: 'var(--cobalt-50, #EFF6FF)',
      hoverBgColor: 'var(--cobalt-100, #DBEAFE)',
    },
  ];

  return (
    <Card className="border-2 shadow-md">
      <CardHeader
        className="border-b-2"
        style={{
          background: 'linear-gradient(to right, var(--teal-50, #F0FDFA), var(--gold-50, #FFFEF7))',
          borderBottomColor: 'var(--teal-200, #99F6E4)',
        }}
      >
        <CardTitle className="text-xl font-bold text-foreground">
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
              <span className="text-sm font-semibold text-foreground">{action.title}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
