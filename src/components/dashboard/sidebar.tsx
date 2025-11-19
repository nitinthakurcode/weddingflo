'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ClientSelector } from '@/components/dashboard/ClientSelector'
import {
  LayoutDashboard,
  Users,
  Calendar,
  Clock,
  UserPlus,
  Briefcase,
  DollarSign,
  Gift,
  Hotel,
  MessageSquare,
  FileText,
  Settings,
  Building2,
  Shield,
  BarChart3,
  MessageCircle,
  Bell,
} from 'lucide-react'
import { useIsSuperAdmin } from '@/lib/permissions/can'

export function Sidebar() {
  const pathname = usePathname()
  const params = useParams()
  const clientId = params?.clientId as string | undefined
  const isSuperAdmin = useIsSuperAdmin()

  // Base navigation items (always visible)
  const baseNavigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Clients',
      href: '/dashboard/clients',
      icon: Users,
    },
    {
      name: 'Analytics',
      href: '/dashboard/analytics',
      icon: BarChart3,
    },
  ]

  // Client-specific navigation items (only show when client selected)
  const clientNavigation = clientId
    ? [
        {
          name: 'Events',
          href: `/dashboard/clients/${clientId}/events`,
          icon: Calendar,
        },
        {
          name: 'Timeline',
          href: `/dashboard/clients/${clientId}/timeline`,
          icon: Clock,
        },
        {
          name: 'Guests',
          href: `/dashboard/clients/${clientId}/guests`,
          icon: UserPlus,
        },
        {
          name: 'Vendors',
          href: `/dashboard/clients/${clientId}/vendors`,
          icon: Briefcase,
        },
        {
          name: 'Budget',
          href: `/dashboard/clients/${clientId}/budget`,
          icon: DollarSign,
        },
        {
          name: 'Gifts',
          href: `/dashboard/clients/${clientId}/gifts`,
          icon: Gift,
        },
        {
          name: 'Hotels',
          href: `/dashboard/clients/${clientId}/hotels`,
          icon: Hotel,
        },
        {
          name: 'Documents',
          href: `/dashboard/clients/${clientId}/documents`,
          icon: FileText,
        },
      ]
    : []

  // Bottom navigation (always visible)
  const bottomNavigation = [
    {
      name: 'Messages',
      href: '/messages',
      icon: MessageSquare,
    },
    {
      name: 'WhatsApp',
      href: '/dashboard/whatsapp',
      icon: MessageCircle,
    },
    {
      name: 'Calendar',
      href: '/dashboard/settings/calendar',
      icon: Calendar,
    },
    {
      name: 'Notifications',
      href: '/dashboard/settings/notifications',
      icon: Bell,
    },
    {
      name: 'Settings',
      href: '/settings/billing',
      icon: Settings,
    },
  ]

  // Admin navigation
  const adminNavigation = [
    { name: 'Companies', href: '/admin/companies', icon: Building2 },
    { name: 'Analytics', href: '/admin/analytics', icon: Shield },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

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

        {/* Client Selector */}
        <div className="border-b-2 border-primary/10 py-2">
          <ClientSelector />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Base Navigation */}
          <div className="space-y-1">
            {baseNavigation.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 group',
                    active
                      ? 'bg-gradient-to-r from-primary/15 to-secondary/10 text-primary shadow-sm border-2 border-primary/20'
                      : 'text-foreground hover:bg-gradient-to-r hover:from-muted hover:to-muted/50 hover:text-foreground hover:shadow-sm border-2 border-transparent'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 transition-transform duration-200',
                      active ? 'text-primary scale-110' : 'group-hover:scale-110'
                    )}
                  />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Client Navigation */}
          {clientId ? (
            <div>
              <div className="px-3 py-1 mb-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Client Modules
                </h3>
              </div>
              <div className="space-y-1">
                {clientNavigation.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center space-x-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 group',
                        active
                          ? 'bg-gradient-to-r from-primary/15 to-secondary/10 text-primary shadow-sm border-2 border-primary/20'
                          : 'text-foreground hover:bg-gradient-to-r hover:from-muted hover:to-muted/50 hover:text-foreground hover:shadow-sm border-2 border-transparent'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-5 w-5 transition-transform duration-200',
                          active ? 'text-primary scale-110' : 'group-hover:scale-110'
                        )}
                      />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="px-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Select a client above to view modules
              </p>
            </div>
          )}

          {/* Bottom Navigation */}
          <div className="border-t-2 border-primary/10 pt-4 space-y-1">
            {bottomNavigation.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 group',
                    active
                      ? 'bg-gradient-to-r from-primary/15 to-secondary/10 text-primary shadow-sm border-2 border-primary/20'
                      : 'text-foreground hover:bg-gradient-to-r hover:from-muted hover:to-muted/50 hover:text-foreground hover:shadow-sm border-2 border-transparent'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 transition-transform duration-200',
                      active ? 'text-primary scale-110' : 'group-hover:scale-110'
                    )}
                  />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Admin Section - Only visible to super admins */}
          {isSuperAdmin && (
            <div className="border-t-2 border-primary/10 pt-4">
              <div className="px-3 py-1 mb-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Super Admin
                </h3>
              </div>
              <div className="space-y-1">
                {adminNavigation.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center space-x-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 group',
                        active
                          ? 'bg-gradient-to-r from-primary/15 to-secondary/10 text-primary shadow-sm border-2 border-primary/20'
                          : 'text-foreground hover:bg-gradient-to-r hover:from-muted hover:to-muted/50 hover:text-foreground hover:shadow-sm border-2 border-transparent'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-5 w-5 transition-transform duration-200',
                          active ? 'text-primary scale-110' : 'group-hover:scale-110'
                        )}
                      />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </nav>
      </div>
    </aside>
  )
}
