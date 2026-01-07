'use client';

import { Link, usePathname } from '@/lib/navigation';
import { Suspense } from 'react';
import { cn } from '@/lib/utils';
import {
  User,
  Building2,
  Palette,
  Users,
  CreditCard,
  Plug,
  Brain,
  Settings as SettingsIcon,
  Shield
} from 'lucide-react';
import { useIsSuperAdmin, useIsAdmin } from '@/lib/permissions/can';

interface SettingsNavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  adminOnly?: boolean;
}

const settingsNav: SettingsNavItem[] = [
  {
    title: 'Profile',
    href: '/settings/profile',
    icon: User,
    description: 'Manage your personal information',
  },
  {
    title: 'Security',
    href: '/settings/security',
    icon: Shield,
    description: 'Passkeys, 2FA, and account security',
  },
  {
    title: 'Company',
    href: '/settings/company',
    icon: Building2,
    description: 'Company details and settings',
    adminOnly: true,
  },
  {
    title: 'Branding',
    href: '/settings/branding',
    icon: Palette,
    description: 'Customize your brand appearance',
    adminOnly: true,
  },
  {
    title: 'Team',
    href: '/settings/team',
    icon: Users,
    description: 'Manage team members and roles',
    adminOnly: true,
  },
  {
    title: 'Billing',
    href: '/settings/billing',
    icon: CreditCard,
    description: 'Subscription and payment',
    adminOnly: true,
  },
  {
    title: 'Integrations',
    href: '/settings/integrations',
    icon: Plug,
    description: 'Connect external services',
    adminOnly: true,
  },
  {
    title: 'AI Config',
    href: '/settings/ai-config',
    icon: Brain,
    description: 'Configure AI features',
    adminOnly: true,
  },
  {
    title: 'Preferences',
    href: '/settings/preferences',
    icon: SettingsIcon,
    description: 'Personal preferences',
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();
  const isSuperAdmin = useIsSuperAdmin();

  // Filter navigation based on permissions
  const filteredNav = settingsNav.filter((item) => {
    if (item.adminOnly && !isAdmin && !isSuperAdmin) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex min-h-screen flex-col">
      <div className="container flex-1 items-start md:grid md:grid-cols-[240px_1fr] md:gap-6 lg:grid-cols-[280px_1fr] lg:gap-10 py-8">
        {/* Settings Sidebar */}
        <aside className="fixed top-20 z-30 hidden h-[calc(100vh-5rem)] w-full shrink-0 overflow-y-auto border-r md:sticky md:block">
          <div className="space-y-4 py-4">
            <div className="px-3 py-2">
              <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                Settings
              </h2>
              <div className="space-y-1">
                {filteredNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'transparent'
                      )}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Settings Nav */}
        <div className="md:hidden mb-6">
          <select
            value={pathname}
            onChange={(e) => {
              window.location.href = e.target.value;
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {filteredNav.map((item) => (
              <option key={item.href} value={item.href}>
                {item.title}
              </option>
            ))}
          </select>
        </div>

        {/* Settings Content */}
        <main className="flex w-full flex-col overflow-hidden">
          <Suspense fallback={<div className="flex items-center justify-center p-8">Loading...</div>}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
