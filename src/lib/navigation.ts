/**
 * NOVEMBER 2025 NAVIGATION APIs
 *
 * Type-safe navigation utilities using next-intl
 * Automatically handles locale prefixes
 */

import { createNavigation } from 'next-intl/navigation';
import { routing } from '@/i18n/routing';

/**
 * Type-safe navigation exports
 *
 * Usage:
 * ```tsx
 * import { Link, useRouter, redirect } from '@/lib/navigation';
 *
 * // Link automatically adds locale prefix
 * <Link href="/dashboard">Dashboard</Link>  // → /en/dashboard
 *
 * // Router respects current locale
 * const router = useRouter();
 * router.push('/settings');  // → /en/settings
 *
 * // Server-side redirect
 * redirect('/login');  // → /en/login
 * ```
 */

export const { Link, redirect, usePathname, useRouter, permanentRedirect } =
  createNavigation(routing);
