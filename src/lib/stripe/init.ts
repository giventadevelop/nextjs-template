import Stripe from 'stripe';

const requiredStripeEnvVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_APP_URL'
] as const;

export const initStripeConfig = () => {
  try {
    // Skip environment checks during build phase
    if (process.env.NEXT_PHASE === 'build') {
      console.log('[STRIPE] Skipping environment checks during build phase');
      return null;
    }

    // Log environment state in production for debugging
    if (process.env.NODE_ENV === 'production') {
      console.log('[STRIPE] Environment check:', {
        hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
        hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
        hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
        phase: process.env.NEXT_PHASE,
        nodeEnv: process.env.NODE_ENV
      });

      const missingEnvVars = requiredStripeEnvVars.filter(
        (envVar) => !process.env[envVar]
      );

      if (missingEnvVars.length > 0) {
        console.error('[STRIPE] Missing required environment variables:', missingEnvVars);
        throw new Error(
          `Missing required Stripe environment variables: ${missingEnvVars.join(', ')}`
        );
      }
    }

    // Initialize Stripe only if secret key is available
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn('[STRIPE] Secret key not found. Stripe functionality will be limited.');
      return null;
    }

    // Initialize Stripe with the secret key
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-03-31.basil' as Stripe.LatestApiVersion,
    });

    return stripe;
  } catch (error) {
    console.error('[STRIPE] Failed to initialize:', error);
    throw error;
  }
};

// Export the list of required env vars for use in other parts of the app
export const REQUIRED_STRIPE_ENV_VARS = requiredStripeEnvVars;