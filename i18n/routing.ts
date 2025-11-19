import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale } from './config';

/**
 * NOVEMBER 2025 i18n ROUTING CONFIGURATION
 *
 * Centralized routing config for next-intl v3.22+
 * Used by middleware and navigation APIs for type-safe routing
 */

export const routing = defineRouting({
  // All locales supported by your application
  locales,

  // Default locale used when no locale matches
  defaultLocale,

  // Prefix strategy: 'always' ensures consistent URLs like /en/dashboard
  // This matches your existing Clerk URLs (/en/sign-in, /en/dashboard)
  localePrefix: 'always',

  // Pathnames can be internationalized here (optional)
  // pathnames: {
  //   '/': '/',
  //   '/dashboard': {
  //     en: '/dashboard',
  //     es: '/panel',
  //     fr: '/tableau-de-bord'
  //   }
  // }
});
