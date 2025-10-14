import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/stripe/webhook',
  '/check-in(.*)',
  '/qr/(.*)',
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { userId, orgId } = await auth();
  const url = req.nextUrl.clone();

  // Extract subdomain from host
  const hostname = req.headers.get('host') || '';
  const subdomain = hostname.split('.')[0];

  // If not a public route and user is not authenticated, redirect to sign-in
  if (!isPublicRoute(req) && !userId) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Handle subdomain routing (for multi-tenant setup)
  if (subdomain && subdomain !== 'localhost' && subdomain !== 'www') {
    // Store subdomain in header for use in app
    const response = NextResponse.next();
    response.headers.set('x-subdomain', subdomain);
    return response;
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
