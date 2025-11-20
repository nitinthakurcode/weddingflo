import { clerkMiddleware } from "@clerk/nextjs/server";
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

/**
 * NOVEMBER 2025 MIDDLEWARE PATTERN (CORRECT - NO REDIRECT LOOPS)
 *
 * Critical insight: DON'T use auth.protect() in middleware with next-intl
 * - Both async and sync auth.protect() cause redirect loops
 * - Middleware should ONLY handle i18n routing
 * - Authentication is handled at PAGE/LAYOUT level instead
 *
 * Why this works:
 * 1. Middleware only adds locale prefix (/dashboard → /en/dashboard)
 * 2. Page-level auth checks handle protection (no middleware redirects)
 * 3. No conflicting redirects between Clerk and next-intl
 * 4. Simpler, cleaner, follows separation of concerns
 *
 * Sources:
 * - https://clerk.com/docs/reference/nextjs/clerk-middleware
 * - https://github.com/clerkinc/javascript/discussions/2543
 * - https://next-intl.dev/docs/routing/middleware#composing-other-middlewares
 *
 * Performance: ~1-3ms (i18n only, no auth checks)
 * Compatible with: Next.js 15.5+, @clerk/nextjs ^6.0.0, next-intl ^4.3+
 */

// Create i18n routing handler
const handleI18nRouting = createMiddleware(routing);

export default clerkMiddleware((auth, req) => {
  // Skip i18n routing for API routes
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/api') || pathname.startsWith('/trpc')) {
    return;
  }

  // ONLY handle internationalization routing for non-API routes
  // No auth checks here - those happen at page/layout level
  return handleI18nRouting(req);
});

// Cover app pages & API routes, skip static files and Next internals
export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
