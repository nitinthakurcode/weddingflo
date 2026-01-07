'use client';

import { Link, usePathname } from '@/lib/navigation';
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
  Shield,
  Building2,
  BarChart3,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsSuperAdmin } from '@/lib/permissions/can';
import { useTranslations } from 'next-intl';

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const isSuperAdmin = useIsSuperAdmin();
  const t = useTranslations('navigation');
  const tc = useTranslations('common');

  const navigation = [
    { name: t('dashboard'), href: '/dashboard', icon: LayoutDashboard, available: true },
    { name: t('clients'), href: '/dashboard/clients', icon: Users, available: true },
    { name: t('analytics'), href: '/dashboard/analytics', icon: BarChart3, available: true },
    { name: t('events'), href: '/dashboard/events', icon: Calendar, available: true },
    { name: t('timeline'), href: '/dashboard/timeline', icon: Clock, available: true },
    { name: t('guests'), href: '/dashboard/guests', icon: UserCheck, available: true },
    { name: t('vendors'), href: '/dashboard/vendors', icon: Briefcase, available: true },
    { name: t('budget'), href: '/dashboard/budget', icon: DollarSign, available: true },
    { name: t('creatives'), href: '/dashboard/creatives', icon: Palette, available: true },
    { name: t('gifts'), href: '/dashboard/gifts', icon: Gift, available: true },
    { name: t('hotels'), href: '/dashboard/hotels', icon: Hotel, available: true },
    { name: t('messages'), href: '/dashboard/messages', icon: MessageSquare, available: true },
    { name: t('reports'), href: '/dashboard/reports', icon: FileText, available: false },
    { name: t('settings'), href: '/dashboard/settings', icon: Settings, available: true },
  ];

  const adminNavigation = [
    { name: t('companies'), href: '/admin/companies', icon: Building2 },
    { name: t('adminAnalytics'), href: '/admin/analytics', icon: Shield },
  ];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-72 p-0 bg-gradient-to-b from-background via-teal-50/30 to-background dark:from-background dark:via-teal-950/10 dark:to-background border-r-0">
        <SheetHeader className="border-b border-border/30 p-6 bg-background/80 backdrop-blur-xl">
          <SheetTitle>
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 via-teal-600 to-gold-500 shadow-lg shadow-teal-500/30 ring-2 ring-teal-200/50 dark:ring-teal-800/50">
                <span className="text-lg font-black text-white">W</span>
              </div>
              <span className="text-xl font-extrabold bg-gradient-to-r from-teal-600 to-gold-600 bg-clip-text text-transparent">
                WeddingFlo
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>
        <nav className="space-y-1.5 p-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;

            if (!item.available) {
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground/50 cursor-not-allowed"
                  title="Coming soon"
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </div>
                  <span className="text-[10px] font-semibold bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full uppercase tracking-wider">{tc('soon')}</span>
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center space-x-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-teal-500/10 to-gold-500/10 text-teal-600 dark:text-teal-400 shadow-sm border border-teal-200/50 dark:border-teal-800/50'
                    : 'text-foreground/80 hover:bg-teal-50/50 hover:text-teal-600 dark:hover:bg-teal-950/30 dark:hover:text-teal-400 active:scale-[0.98]'
                )}
              >
                <item.icon className={cn("h-5 w-5 transition-transform", isActive && "text-teal-500")} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* Admin Section - Only visible to super admins */}
          {isSuperAdmin && (
            <>
              <div className="pt-6 pb-2">
                <div className="px-4 py-2">
                  <h3 className="text-[10px] font-bold text-cobalt-600 dark:text-cobalt-400 uppercase tracking-widest flex items-center gap-2">
                    <Shield className="h-3 w-3" />
                    {t('superAdmin')}
                  </h3>
                </div>
              </div>
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center space-x-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-cobalt-500/10 to-cobalt-400/10 text-cobalt-600 dark:text-cobalt-400 shadow-sm border border-cobalt-200/50 dark:border-cobalt-800/50'
                        : 'text-foreground/80 hover:bg-cobalt-50/50 hover:text-cobalt-600 dark:hover:bg-cobalt-950/30 dark:hover:text-cobalt-400 active:scale-[0.98]'
                    )}
                  >
                    <item.icon className={cn("h-5 w-5 transition-transform", isActive && "text-cobalt-500")} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
