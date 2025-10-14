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
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 hover:bg-blue-200',
    },
    {
      title: 'Add Vendor',
      icon: Users,
      href: '/dashboard/vendors',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 hover:bg-purple-200',
    },
    {
      title: 'Add Event',
      icon: Calendar,
      href: '/dashboard/events',
      color: 'text-green-600',
      bgColor: 'bg-green-100 hover:bg-green-200',
    },
    {
      title: 'Add Expense',
      icon: DollarSign,
      href: '/dashboard/budget',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 hover:bg-yellow-200',
    },
    {
      title: 'Add Creative',
      icon: FileText,
      href: '/dashboard/creatives',
      color: 'text-pink-600',
      bgColor: 'bg-pink-100 hover:bg-pink-200',
    },
    {
      title: 'Add Gift',
      icon: Gift,
      href: '/dashboard/gifts',
      color: 'text-red-600',
      bgColor: 'bg-red-100 hover:bg-red-200',
    },
    {
      title: 'Add Hotel',
      icon: Hotel,
      href: '/dashboard/hotels',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100 hover:bg-indigo-200',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {actions.map((action) => (
            <Button
              key={action.title}
              variant="outline"
              className={`flex flex-col items-center gap-2 h-auto py-4 ${action.bgColor} border-none`}
              onClick={() => router.push(action.href)}
            >
              <action.icon className={`h-6 w-6 ${action.color}`} />
              <span className="text-sm font-medium">{action.title}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
