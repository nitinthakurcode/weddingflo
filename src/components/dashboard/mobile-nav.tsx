'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Calendar,
  UserCheck,
  Gift,
  MessageSquare,
  FileText,
  Settings,
  Hotel,
  DollarSign,
  Briefcase,
  Palette,
  Clock,
  X,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, available: true },
  { name: 'Clients', href: '/dashboard/clients', icon: Users, available: false },
  { name: 'Events', href: '/dashboard/events', icon: Calendar, available: true },
  { name: 'Timeline', href: '/dashboard/timeline', icon: Clock, available: true },
  { name: 'Guests', href: '/dashboard/guests', icon: UserCheck, available: true },
  { name: 'Vendors', href: '/dashboard/vendors', icon: Briefcase, available: true },
  { name: 'Budget', href: '/dashboard/budget', icon: DollarSign, available: true },
  { name: 'Creatives', href: '/dashboard/creatives', icon: Palette, available: true },
  { name: 'Gifts', href: '/dashboard/gifts', icon: Gift, available: true },
  { name: 'Hotels', href: '/dashboard/hotels', icon: Hotel, available: true },
  { name: 'Messages', href: '/messages', icon: MessageSquare, available: true },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText, available: false },
  { name: 'Settings', href: '/settings/billing', icon: Settings, available: true },
];

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b p-6">
          <SheetTitle>
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600">
                <span className="text-lg font-bold text-white">W</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                WeddingFlow
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>
        <nav className="space-y-1 p-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;

            if (!item.available) {
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
                  title="Coming soon"
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </div>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">Soon</span>
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
