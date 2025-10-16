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
  Shield,
  Building2,
} from 'lucide-react';
import { useIsSuperAdmin } from '@/lib/permissions/can';

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

const adminNavigation = [
  { name: 'Companies', href: '/admin/companies', icon: Building2 },
  { name: 'Analytics', href: '/admin/analytics', icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();
  const isSuperAdmin = useIsSuperAdmin();

  return (
    <aside className="hidden w-64 border-r-2 border-primary/10 bg-gradient-to-b from-white via-primary/5 to-white lg:block shadow-md">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b-2 border-primary/10 px-6 bg-gradient-to-r from-primary/5 to-secondary/10">
          <Link href="/dashboard" className="flex items-center space-x-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/30 group-hover:shadow-xl group-hover:shadow-primary/40 transition-all duration-300">
              <span className="text-xl font-extrabold text-primary-foreground">W</span>
            </div>
            <span className="text-xl font-extrabold text-primary-900">
              WeddingFlow
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;

            if (!item.available) {
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between space-x-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground cursor-not-allowed"
                  title="Coming soon"
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </div>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">Soon</span>
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center space-x-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 group',
                  isActive
                    ? 'bg-gradient-to-r from-primary/15 to-secondary/10 text-primary shadow-sm border-2 border-primary/20'
                    : 'text-foreground hover:bg-gradient-to-r hover:from-muted hover:to-muted/50 hover:text-foreground hover:shadow-sm border-2 border-transparent'
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  isActive ? "text-primary scale-110" : "group-hover:scale-110"
                )} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* Admin Section - Only visible to super admins */}
          {isSuperAdmin && (
            <>
              <div className="pt-4 pb-2">
                <div className="px-3 py-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Super Admin
                  </h3>
                </div>
              </div>
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 group',
                      isActive
                        ? 'bg-gradient-to-r from-primary/15 to-secondary/10 text-primary shadow-sm border-2 border-primary/20'
                        : 'text-foreground hover:bg-gradient-to-r hover:from-muted hover:to-muted/50 hover:text-foreground hover:shadow-sm border-2 border-transparent'
                    )}
                  >
                    <item.icon className={cn(
                      "h-5 w-5 transition-transform duration-200",
                      isActive ? "text-primary scale-110" : "group-hover:scale-110"
                    )} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>
      </div>
    </aside>
  );
}
