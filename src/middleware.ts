import { authMiddleware } from '@clerk/nextjs';

// Remove unused imports and variables
export default authMiddleware({
  publicRoutes: [
    '/',
    '/api/webhooks/stripe',
    '/events',
    '/events/(.*)',
    '/pricing',
    '/api/events/(.*)',
    '/api/profile',  // Allow public access but handle auth state in the route
    '/api/subscription/plans'  // Allow public access to pricing plans
  ],
  ignoredRoutes: [
    '/api/webhooks(.*)',
    '/_next/static/(.*)',
    '/favicon.ico',
  ]
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};