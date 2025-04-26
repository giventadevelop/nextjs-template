import { authMiddleware } from "@clerk/nextjs";

// Define protected routes that require authentication
// Commented out since currently unused, but kept for future reference
// const protectedPaths = [
//   '/dashboard(.*)',
//   '/tasks(.*)',
//   '/profile(.*)',
// ];

// Define public routes that don't require authentication
const publicPaths = [
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/event(.*)',     // Make event pages public
  '/pricing(.*)',   // Make pricing page public
  '/api/webhooks(.*)', // Keep webhooks public
  '/api/stripe/event-checkout', // Make event checkout public
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