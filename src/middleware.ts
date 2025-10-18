import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  "/",
  "/sign-in",
  "/sign-up",
  "/api/webhooks",
  "/qr",
  "/check-in",
];

export default clerkMiddleware((auth, req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));

  if (!isPublic) {
    // Hard-fail on protected paths without a session
    auth().protect();
  }
  return NextResponse.next();
});

// Cover app pages & API routes, skip static files and Next internals
export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api)(.*)"],
};
