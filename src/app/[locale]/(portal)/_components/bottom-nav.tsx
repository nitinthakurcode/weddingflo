'use client';

import { Link, usePathname } from '@/lib/navigation';
import { Home, CheckSquare, MessageSquare, User, Heart, Sparkles, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { PulsingDot } from '@/components/ui/micro-interactions';

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations('portalNav');

  const navItems = [
    { key: 'home', href: '/portal', icon: Home, badge: false },
    { key: 'timeline', href: '/portal/timeline', icon: Clock, badge: false },
    { key: 'checklist', href: '/portal/checklist', icon: CheckSquare, badge: false },
    { key: 'chat', href: '/portal/chat', icon: MessageSquare, badge: true },
    { key: 'profile', href: '/portal/profile', icon: User, badge: false },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 backdrop-blur-xl bg-background/80 border-t border-white/10 dark:border-white/5 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]" style={{ height: 'var(--bottom-nav-height, 72px)' }}>
      {/* Top gradient accent line */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-rose-400/40 to-transparent" />

      <div className="grid grid-cols-5 h-full px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 relative py-2',
                'transition-all duration-300 active:scale-95',
                isActive
                  ? 'text-rose-500'
                  : 'text-muted-foreground hover:text-rose-400'
              )}
            >
              {/* Active indicator - Aura glow pill */}
              {isActive && (
                <span className="absolute -top-0.5 w-12 h-1 rounded-full bg-gradient-to-r from-rose-400 via-pink-500 to-lavender-400 shadow-lg shadow-rose-500/50" />
              )}

              {/* Icon container with glow effect when active */}
              <span className={cn(
                'relative flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-300',
                isActive && 'bg-rose-500/10 dark:bg-rose-500/20'
              )}>
                <Icon
                  className={cn(
                    "size-5 transition-transform duration-300",
                    isActive && 'scale-110'
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />

                {/* Notification badge with glow */}
                {item.badge && (
                  <span className="absolute -top-0.5 -right-0.5">
                    <PulsingDot color="error" size="sm" />
                  </span>
                )}
              </span>

              {/* Label */}
              <span className={cn(
                'text-[10px] font-semibold tracking-wider uppercase transition-opacity duration-200',
                isActive ? 'opacity-100' : 'opacity-60'
              )}>
                {t(item.key)}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Bottom safe area gradient fade */}
      <div className="absolute inset-x-0 -bottom-8 h-8 bg-gradient-to-b from-transparent to-background pointer-events-none" />
    </nav>
  );
}

/**
 * FloatingActionButton - Gen Z style FAB for quick actions
 */
export function FloatingActionButton({
  onClick,
  icon,
  label,
  variant = 'primary',
}: {
  onClick: () => void;
  icon?: React.ReactNode;
  label?: string;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-24 right-4 z-40',
        'flex items-center gap-2 px-5 py-3.5 rounded-2xl',
        'shadow-xl transition-all duration-300',
        'hover:scale-110 active:scale-95',
        variant === 'primary'
          ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-lavender-500 text-white shadow-rose-500/40 hover:shadow-rose-500/60'
          : 'backdrop-blur-xl bg-background/80 text-rose-500 border border-rose-200/30 dark:border-rose-800/30'
      )}
    >
      {icon || <Heart className="size-5 fill-current" />}
      {label && <span className="font-semibold text-sm">{label}</span>}
      {/* Sparkle effect for primary variant */}
      {variant === 'primary' && (
        <Sparkles className="size-4 animate-pulse" style={{ animationDuration: '2s' }} />
      )}
    </button>
  );
}
