import Stripe from 'stripe';
import { env } from '@/lib/env.mjs';

const requiredStripeEnvVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_APP_URL'
] as const;

// Helper to get environment variables in AWS Lambda context
const getStripeEnvVar = (key: string): string | undefined => {
  try {
    // For AWS Lambda, try process.env with various prefixes
    if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
      // Try AWS Lambda environment variables with different prefixes
      const prefixes = ['', 'AMPLIFY_', 'AWS_'];
      for (const prefix of prefixes) {
        const value = process.env[`${prefix}${key}`];
        if (value) {
          return value;
        }
      }
    }

    // Fallback to direct process.env access
    return process.env[key];
  } catch (error) {
    console.error(`[STRIPE] Error getting environment variable ${key}:`, error);
    return process.env[key];
  }
};

export const initStripeConfig = () => {
  try {
    // Skip checks during build phase
    if (process.env.NEXT_PHASE === 'build') {
      console.log('[STRIPE] Skipping environment checks during build phase');
      return null;
    }

    // Log AWS Lambda context for debugging
    if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
      console.log('[STRIPE] AWS Lambda context:', {
        functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
        functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
        region: process.env.AWS_REGION,
        runtime: process.env.AWS_EXECUTION_ENV,
      });
    }

    // Get required environment variables
    const secretKey = getStripeEnvVar('STRIPE_SECRET_KEY');
    const webhookSecret = getStripeEnvVar('STRIPE_WEBHOOK_SECRET');
    const appUrl = getStripeEnvVar('NEXT_PUBLIC_APP_URL');

    // Log environment state for debugging
    console.log('[STRIPE] Environment state:', {
      phase: process.env.NEXT_PHASE,
      nodeEnv: process.env.NODE_ENV,
      isLambda: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
      hasSecretKey: !!secretKey,
      hasWebhookSecret: !!webhookSecret,
      hasAppUrl: !!appUrl,
      runtime: typeof window === 'undefined' ? 'server' : 'client',
      // Log some environment variable keys for debugging (DO NOT log values)
      envKeys: Object.keys(process.env).filter(key =>
        key.includes('STRIPE') ||
        key.includes('NEXT_PUBLIC') ||
        key.includes('AWS_') ||
        key.includes('AMPLIFY_')
      )
    });

    // Validate required environment variables
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    // Initialize Stripe with the secret key
    return new Stripe(secretKey, {
      apiVersion: '2025-03-31.basil' as Stripe.LatestApiVersion,
    });
  } catch (error) {
    console.error('[STRIPE] Failed to initialize Stripe:', error);
    throw error;
  }
};

// Export the list of required env vars for use in other parts of the app
export const REQUIRED_STRIPE_ENV_VARS = requiredStripeEnvVars;

// Export the helper for use in other parts of the app
export { getStripeEnvVar };