'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Link, usePathname } from '@/lib/navigation'
import { useTranslations } from 'next-intl'
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
  Bot,
  Calculator,
  Mail,
  Zap,
  CreditCard,
  Receipt,
  Globe,
  Palette,
  Image,
  LayoutGrid,
  CheckSquare,
  Wallet,
  GitBranch,
  GiftIcon,
  Trophy,
  Share2,
  Activity,
  Sparkles,
  UsersRound,
  ClipboardList,
  Car,
  Kanban,
  MailCheck,
  FolderKanban,
} from 'lucide-react'
import { useIsSuperAdmin } from '@/lib/permissions/can'

// localStorage key for persisting selected client (must match ClientSelector)
const SELECTED_CLIENT_KEY = 'weddingflo_selected_client'

export function Sidebar() {
  const pathname = usePathname()
  const params = useParams()
  const urlClientId = params?.clientId as string | undefined
  const isSuperAdmin = useIsSuperAdmin()
  const t = useTranslations('navigation')

  // State for persisted client selection
  const [storedClientId, setStoredClientId] = useState<string | undefined>(undefined)

  // On mount and when URL changes, sync with localStorage
  useEffect(() => {
    const stored = localStorage.getItem(SELECTED_CLIENT_KEY)
    if (stored) {
      setStoredClientId(stored)
    }
  }, [pathname]) // Re-check when navigating

  // When URL has clientId, update localStorage and state
  useEffect(() => {
    if (urlClientId) {
      localStorage.setItem(SELECTED_CLIENT_KEY, urlClientId)
      setStoredClientId(urlClientId)
    }
  }, [urlClientId])

  // Use URL clientId if available, otherwise use stored
  const clientId = urlClientId || storedClientId

  // Base navigation items (always visible) - Company level only
  const baseNavigation = [
    {
      name: t('dashboard'),
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: t('clients'),
      href: '/dashboard/clients',
      icon: Users,
    },
    {
      name: t('pipeline'),
      href: '/dashboard/pipeline',
      icon: Kanban,
    },
    {
      name: t('calendar'),
      href: '/dashboard/calendar',
      icon: Calendar,
    },
    {
      name: t('team'),
      href: '/dashboard/team',
      icon: UsersRound,
    },
    {
      name: t('tasks'),
      href: '/dashboard/my-tasks',
      icon: ClipboardList,
    },
    {
      name: t('analytics'),
      href: '/dashboard/analytics',
      icon: BarChart3,
    },
  ]

  // AI Features navigation
  const aiNavigation = [
    {
      name: t('chat'),
      href: '/dashboard/ai/chat',
      icon: Sparkles,
    },
    {
      name: t('budgetPrediction'),
      href: '/dashboard/ai/budget-prediction',
      icon: Calculator,
    },
    {
      name: t('emailGenerator'),
      href: '/dashboard/ai/email-generator',
      icon: Mail,
    },
    {
      name: t('timelineOptimizer'),
      href: '/dashboard/ai/timeline-optimizer',
      icon: Zap,
    },
  ]

  // Engagement navigation
  const engagementNavigation = [
    {
      name: t('gamification'),
      href: '/dashboard/gamification',
      icon: Trophy,
    },
    {
      name: t('referrals'),
      href: '/dashboard/referrals',
      icon: Share2,
    },
    {
      name: t('activityFeed'),
      href: '/dashboard/activity',
      icon: Activity,
    },
  ]

  // Financial navigation
  const financialNavigation = [
    {
      name: t('payments'),
      href: '/dashboard/payments',
      icon: CreditCard,
    },
    {
      name: t('invoices'),
      href: '/dashboard/invoices',
      icon: Receipt,
    },
  ]

  // Client-specific AI navigation (only show when client selected)
  const clientAiNavigation = clientId
    ? [
        {
          name: t('chat'),
          href: `/dashboard/clients/${clientId}/ai/chat`,
          icon: Sparkles,
        },
        {
          name: t('budgetPrediction'),
          href: `/dashboard/clients/${clientId}/ai/budget-prediction`,
          icon: Calculator,
        },
        {
          name: t('emailGenerator'),
          href: `/dashboard/clients/${clientId}/ai/email-generator`,
          icon: Mail,
        },
        {
          name: t('timelineOptimizer'),
          href: `/dashboard/clients/${clientId}/ai/timeline-optimizer`,
          icon: Zap,
        },
      ]
    : []

  // Client-specific Financial navigation (only show when client selected)
  const clientFinancialNavigation = clientId
    ? [
        {
          name: t('budget'),
          href: `/dashboard/clients/${clientId}/budget`,
          icon: DollarSign,
        },
        {
          name: t('internalBudget'),
          href: `/dashboard/clients/${clientId}/internal-budget`,
          icon: Wallet,
        },
        {
          name: t('payments'),
          href: `/dashboard/clients/${clientId}/payments`,
          icon: CreditCard,
        },
        {
          name: t('invoices'),
          href: `/dashboard/clients/${clientId}/invoices`,
          icon: Receipt,
        },
      ]
    : []

  // Client-specific navigation items (only show when client selected)
  // Note: Budget and Internal Budget are now in clientFinancialNavigation
  const clientNavigation = clientId
    ? [
        {
          name: t('events'),
          href: `/dashboard/clients/${clientId}/events`,
          icon: Calendar,
        },
        {
          name: t('timeline'),
          href: `/dashboard/clients/${clientId}/timeline`,
          icon: Clock,
        },
        {
          name: t('guests'),
          href: `/dashboard/clients/${clientId}/guests`,
          icon: UserPlus,
        },
        {
          name: t('vendors'),
          href: `/dashboard/clients/${clientId}/vendors`,
          icon: Briefcase,
        },
        {
          name: t('gifts'),
          href: `/dashboard/clients/${clientId}/gifts`,
          icon: Gift,
        },
        {
          name: t('hotels'),
          href: `/dashboard/clients/${clientId}/hotels`,
          icon: Hotel,
        },
        {
          name: t('documents'),
          href: `/dashboard/clients/${clientId}/documents`,
          icon: FileText,
        },
        {
          name: t('creatives'),
          href: `/dashboard/clients/${clientId}/creatives`,
          icon: Image,
        },
        {
          name: t('website'),
          href: `/dashboard/clients/${clientId}/website`,
          icon: Globe,
        },
        {
          name: t('seating'),
          href: `/dashboard/clients/${clientId}/seating`,
          icon: LayoutGrid,
        },
        {
          name: t('tasks'),
          href: `/dashboard/clients/${clientId}/tasks`,
          icon: CheckSquare,
        },
        {
          name: t('eventFlow'),
          href: `/dashboard/clients/${clientId}/event-flow`,
          icon: GitBranch,
        },
        {
          name: t('guestGifts'),
          href: `/dashboard/clients/${clientId}/guest-gifts`,
          icon: GiftIcon,
        },
        {
          name: t('transport'),
          href: `/dashboard/clients/${clientId}/transport`,
          icon: Car,
        },
        {
          name: t('team'),
          href: `/dashboard/clients/${clientId}/team`,
          icon: UsersRound,
        },
      ]
    : []

  // Client-specific Communication navigation (only show when client selected)
  const clientCommunicationNavigation = clientId
    ? [
        {
          name: t('messages'),
          href: `/dashboard/clients/${clientId}/messages`,
          icon: MessageSquare,
        },
        {
          name: t('whatsapp'),
          href: `/dashboard/clients/${clientId}/whatsapp`,
          icon: MessageCircle,
        },
        {
          name: t('emailSequences'),
          href: `/dashboard/clients/${clientId}/sequences`,
          icon: MailCheck,
        },
      ]
    : []

  // Bottom navigation (always visible) - Company-level settings only
  const bottomNavigation = [
    {
      name: t('notifications'),
      href: '/dashboard/settings/notifications',
      icon: Bell,
    },
    {
      name: t('preferences'),
      href: '/dashboard/settings/preferences',
      icon: Palette,
    },
    {
      name: t('settings'),
      href: '/dashboard/settings',
      icon: Settings,
    },
  ]

  // Admin navigation
  const adminNavigation = [
    { name: t('companies'), href: '/admin/companies', icon: Building2 },
    { name: t('adminAnalytics'), href: '/admin/analytics', icon: Shield },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <aside className="relative hidden w-64 border-r border-mocha-200 bg-gradient-to-b from-cloud-50 via-white to-cloud-100 dark:from-mocha-950 dark:via-mocha-900 dark:to-mocha-950 dark:border-mocha-800 lg:block">
      <div className="flex h-full flex-col">
        {/* Logo - 2026 Teal & Gold Design */}
        <div className="flex h-16 items-center border-b border-mocha-200/50 dark:border-mocha-800/50 px-6 bg-white/50 dark:bg-mocha-900/50 backdrop-blur-sm">
          <Link href="/dashboard" className="flex items-center space-x-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 via-teal-600 to-gold-500 shadow-lg shadow-teal-500/30 ring-2 ring-teal-200/50 dark:ring-teal-800/50 group-hover:scale-110 group-hover:shadow-teal-500/50 transition-all duration-300">
              <span className="text-xl font-black text-white">W</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold bg-gradient-to-r from-teal-600 to-gold-600 bg-clip-text text-transparent">
                WeddingFlo
              </span>
              <span className="text-[10px] text-mocha-500 font-semibold tracking-widest uppercase">Pro Suite</span>
            </div>
          </Link>
        </div>

        {/* Client Selector */}
        <div className="border-b border-mocha-200/50 dark:border-mocha-800/50 py-2">
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
                    'flex items-center space-x-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    active
                      ? 'bg-gradient-to-r from-teal-500/10 to-gold-500/5 text-teal-600 dark:text-teal-400 shadow-sm border border-teal-200/50 dark:border-teal-800/50'
                      : 'text-mocha-600 dark:text-mocha-300 hover:bg-teal-50/50 hover:text-teal-600 dark:hover:bg-teal-950/30 dark:hover:text-teal-400'
                  )}
                >
                  <Icon className={cn('h-5 w-5', active && 'text-teal-500')} />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* AI Features Navigation */}
          <div>
            <div className="px-3 py-1.5 mb-1">
              <h3 className="text-[10px] font-bold text-gold-600 dark:text-gold-400 uppercase tracking-widest flex items-center gap-2">
                <Bot className="h-3 w-3" />
                {t('aiFeatures')}
              </h3>
            </div>
            <div className="space-y-1">
              {aiNavigation.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      active
                        ? 'bg-gradient-to-r from-teal-500/10 to-gold-500/5 text-teal-600 dark:text-teal-400 shadow-sm border border-teal-200/50 dark:border-teal-800/50'
                        : 'text-mocha-600 dark:text-mocha-300 hover:bg-teal-50/50 hover:text-teal-600 dark:hover:bg-teal-950/30 dark:hover:text-teal-400'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', active && 'text-teal-500')} />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Financial Navigation */}
          <div>
            <div className="px-3 py-1.5 mb-1">
              <h3 className="text-[10px] font-bold text-sage-600 dark:text-sage-400 uppercase tracking-widest flex items-center gap-2">
                <DollarSign className="h-3 w-3" />
                {t('financial')}
              </h3>
            </div>
            <div className="space-y-1">
              {financialNavigation.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      active
                        ? 'bg-gradient-to-r from-teal-500/10 to-gold-500/5 text-teal-600 dark:text-teal-400 shadow-sm border border-teal-200/50 dark:border-teal-800/50'
                        : 'text-mocha-600 dark:text-mocha-300 hover:bg-teal-50/50 hover:text-teal-600 dark:hover:bg-teal-950/30 dark:hover:text-teal-400'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', active && 'text-teal-500')} />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Engagement Navigation */}
          <div>
            <div className="px-3 py-1.5 mb-1">
              <h3 className="text-[10px] font-bold text-gold-600 dark:text-gold-400 uppercase tracking-widest flex items-center gap-2">
                <Trophy className="h-3 w-3" />
                {t('engagement')}
              </h3>
            </div>
            <div className="space-y-1">
              {engagementNavigation.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      active
                        ? 'bg-gradient-to-r from-teal-500/10 to-gold-500/5 text-teal-600 dark:text-teal-400 shadow-sm border border-teal-200/50 dark:border-teal-800/50'
                        : 'text-mocha-600 dark:text-mocha-300 hover:bg-teal-50/50 hover:text-teal-600 dark:hover:bg-teal-950/30 dark:hover:text-teal-400'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', active && 'text-teal-500')} />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Client Navigation */}
          {clientId ? (
            <>
              {/* Client AI Features */}
              <div>
                <div className="px-3 py-1.5 mb-1">
                  <h3 className="text-[10px] font-bold text-gold-600 dark:text-gold-400 uppercase tracking-widest flex items-center gap-2">
                    <Bot className="h-3 w-3" />
                    {t('clientAiFeatures')}
                  </h3>
                </div>
                <div className="space-y-1">
                  {clientAiNavigation.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center space-x-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                          active
                            ? 'bg-gradient-to-r from-teal-500/10 to-gold-500/5 text-teal-600 dark:text-teal-400 shadow-sm border border-teal-200/50 dark:border-teal-800/50'
                            : 'text-mocha-600 dark:text-mocha-300 hover:bg-teal-50/50 hover:text-teal-600 dark:hover:bg-teal-950/30 dark:hover:text-teal-400'
                        )}
                      >
                        <Icon className={cn('h-5 w-5', active && 'text-teal-500')} />
                        <span>{item.name}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Client Financial */}
              <div>
                <div className="px-3 py-1.5 mb-1">
                  <h3 className="text-[10px] font-bold text-sage-600 dark:text-sage-400 uppercase tracking-widest flex items-center gap-2">
                    <DollarSign className="h-3 w-3" />
                    {t('clientFinancial')}
                  </h3>
                </div>
                <div className="space-y-1">
                  {clientFinancialNavigation.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center space-x-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                          active
                            ? 'bg-gradient-to-r from-teal-500/10 to-gold-500/5 text-teal-600 dark:text-teal-400 shadow-sm border border-teal-200/50 dark:border-teal-800/50'
                            : 'text-mocha-600 dark:text-mocha-300 hover:bg-teal-50/50 hover:text-teal-600 dark:hover:bg-teal-950/30 dark:hover:text-teal-400'
                        )}
                      >
                        <Icon className={cn('h-5 w-5', active && 'text-teal-500')} />
                        <span>{item.name}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Client Planning Modules */}
              <div>
                <div className="px-3 py-1.5 mb-1">
                  <h3 className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">
                    {t('clientModules')}
                  </h3>
                </div>
                <div className="space-y-1">
                  {clientNavigation.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center space-x-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                          active
                            ? 'bg-gradient-to-r from-teal-500/10 to-gold-500/5 text-teal-600 dark:text-teal-400 shadow-sm border border-teal-200/50 dark:border-teal-800/50'
                            : 'text-mocha-600 dark:text-mocha-300 hover:bg-teal-50/50 hover:text-teal-600 dark:hover:bg-teal-950/30 dark:hover:text-teal-400'
                        )}
                      >
                        <Icon className={cn('h-5 w-5', active && 'text-teal-500')} />
                        <span>{item.name}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Client Communication Section */}
              {clientCommunicationNavigation.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 mb-1">
                    <h3 className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest">
                      {t('communication')}
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {clientCommunicationNavigation.map((item) => {
                      const Icon = item.icon
                      const active = isActive(item.href)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'flex items-center space-x-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                            active
                              ? 'bg-gradient-to-r from-teal-500/10 to-gold-500/5 text-teal-600 dark:text-teal-400 shadow-sm border border-teal-200/50 dark:border-teal-800/50'
                              : 'text-mocha-600 dark:text-mocha-300 hover:bg-teal-50/50 hover:text-teal-600 dark:hover:bg-teal-950/30 dark:hover:text-teal-400'
                          )}
                        >
                          <Icon className={cn('h-5 w-5', active && 'text-teal-500')} />
                          <span>{item.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="px-3 py-4 text-center">
              <p className="text-xs text-mocha-500">
                {t('selectClientPrompt')}
              </p>
            </div>
          )}

          {/* Bottom Navigation */}
          <div className="border-t border-mocha-200/50 dark:border-mocha-800/50 pt-4 space-y-1">
            {bottomNavigation.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    active
                      ? 'bg-gradient-to-r from-teal-500/10 to-gold-500/5 text-teal-600 dark:text-teal-400 shadow-sm border border-teal-200/50 dark:border-teal-800/50'
                      : 'text-mocha-600 dark:text-mocha-300 hover:bg-teal-50/50 hover:text-teal-600 dark:hover:bg-teal-950/30 dark:hover:text-teal-400'
                  )}
                >
                  <Icon className={cn('h-5 w-5', active && 'text-teal-500')} />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Admin Section - Only visible to super admins */}
          {isSuperAdmin && (
            <div className="border-t border-mocha-200/50 dark:border-mocha-800/50 pt-4">
              <div className="px-3 py-1.5 mb-1">
                <h3 className="text-[10px] font-bold text-cobalt-600 dark:text-cobalt-400 uppercase tracking-widest flex items-center gap-2">
                  <Shield className="h-3 w-3" />
                  {t('superAdmin')}
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
                        'flex items-center space-x-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                        active
                          ? 'bg-gradient-to-r from-cobalt-500/10 to-cobalt-400/5 text-cobalt-600 dark:text-cobalt-400 shadow-sm border border-cobalt-200/50 dark:border-cobalt-800/50'
                          : 'text-mocha-600 dark:text-mocha-300 hover:bg-cobalt-50/50 hover:text-cobalt-600 dark:hover:bg-cobalt-950/30 dark:hover:text-cobalt-400'
                      )}
                    >
                      <Icon className={cn('h-5 w-5', active && 'text-cobalt-500')} />
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
