import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * NOVEMBER 2025 MIDDLEWARE PATTERN (MINIMAL)
 *
 * Minimal middleware: ONLY JWT verification
 * NO database queries in middleware
 * NO i18n logic in middleware
 * NO additional processing
 *
 * Session claims in tRPC context (<5ms) ⚡
 */

// Public paths that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/(.*)sign-in(.*)",
  "/(.*)sign-up(.*)",
  "/(.*)portal(.*)",
  "/api/webhooks(.*)",
  "/api/health(.*)",
  "/manifest.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
]);

export default clerkMiddleware(async (auth, req) => {
  // ONLY JWT verification - no database queries, no i18n logic
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
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
