import Stripe from 'stripe';

const requiredStripeEnvVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_APP_URL'
] as const;

export const initStripeConfig = () => {
  try {
    // Only check env vars in production runtime
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'build') {
      const missingEnvVars = requiredStripeEnvVars.filter(
        (envVar) => !process.env[envVar]
      );

      if (missingEnvVars.length > 0) {
        throw new Error(
          `Missing required Stripe environment variables: ${missingEnvVars.join(', ')}`
        );
      }
    }

    // Initialize Stripe only if secret key is available
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn('Stripe secret key not found. Stripe functionality will be limited.');
      return null;
    }

    return new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-03-31.basil' as Stripe.LatestApiVersion,
    });
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
    throw error;
  }
};

// Export the list of required env vars for use in other parts of the app
export const REQUIRED_STRIPE_ENV_VARS = requiredStripeEnvVars;