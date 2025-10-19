'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CheckSquare, MessageSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Home', href: '/portal', icon: Home },
  { name: 'Checklist', href: '/portal/checklist', icon: CheckSquare },
  { name: 'Messages', href: '/portal/messages', icon: MessageSquare },
  { name: 'Profile', href: '/portal/profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 pb-safe">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center min-h-[44px] transition-colors',
                isActive
                  ? 'text-purple-600 font-semibold'
                  : 'text-gray-600 hover:text-purple-500'
              )}
            >
              <Icon className="size-6" />
              <span className="text-xs mt-0.5">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
