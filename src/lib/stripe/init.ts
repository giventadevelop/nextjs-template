import Stripe from 'stripe';

const requiredStripeEnvVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_APP_URL'
] as const;

// Helper to safely get environment variables
const getEnvVar = (key: string): string | undefined => {
  // Try process.env first
  if (process.env[key]) {
    return process.env[key];
  }

  // For AWS Amplify, try global scope as fallback
  if (typeof global !== 'undefined' && (global as any)[key]) {
    return (global as any)[key];
  }

  // For browser environment, try window as fallback
  if (typeof window !== 'undefined' && (window as any)[key]) {
    return (window as any)[key];
  }

  return undefined;
};

export const initStripeConfig = () => {
  try {
    // Skip environment checks during build phase
    if (process.env.NEXT_PHASE === 'build') {
      console.log('[STRIPE] Skipping environment checks during build phase');
      return null;
    }

    // Log environment state for debugging
    const envState = {
      hasSecretKey: !!getEnvVar('STRIPE_SECRET_KEY'),
      hasWebhookSecret: !!getEnvVar('STRIPE_WEBHOOK_SECRET'),
      hasAppUrl: !!getEnvVar('NEXT_PUBLIC_APP_URL'),
      phase: process.env.NEXT_PHASE,
      nodeEnv: process.env.NODE_ENV,
      runtime: typeof window === 'undefined' ? 'server' : 'client'
    };
    console.log('[STRIPE] Environment check:', envState);

    // In production, check required environment variables
    if (process.env.NODE_ENV === 'production') {
      const missingEnvVars = requiredStripeEnvVars.filter(
        (envVar) => !getEnvVar(envVar)
      );

      if (missingEnvVars.length > 0) {
        console.error('[STRIPE] Missing required environment variables:', missingEnvVars);
        throw new Error(
          `Missing required Stripe environment variables: ${missingEnvVars.join(', ')}`
        );
      }
    }

    // Get Stripe secret key using the helper
    const stripeSecretKey = getEnvVar('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.warn('[STRIPE] Secret key not found. Stripe functionality will be limited.');
      return null;
    }

    // Initialize Stripe with the secret key
    const stripe = new Stripe(stripeSecretKey, {
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

// Export the helper for use in other parts of the app
export const getStripeEnvVar = getEnvVar;