import { authMiddleware } from "@clerk/nextjs";
import { NextRequest } from "next/server";

// Define protected routes that require authentication
const protectedPaths = ['/dashboard(.*)'];

// Define public routes that don't require authentication
const publicPaths = [
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/profile(.*)',
  '/api/webhooks(.*)', // Keep webhooks public
];

export default authMiddleware({
  publicRoutes: publicPaths,
  ignoredRoutes: [
    '/api/webhooks/stripe',
    '/api/webhooks/clerk',
  ]
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.[\\w]+$|_next).*)',
    // Optional: Protect API routes
    '/(api|trpc)(.*)',
  ],
};