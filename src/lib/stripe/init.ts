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
    // For AWS Lambda/Amplify, try environment variables with different prefixes
    if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
      // Define the prefixes to try, in order of preference
      const prefixes = [
        'AMPLIFY_',  // Amplify specific prefix
        'AWS_AMPLIFY_',  // Alternative Amplify prefix
        '',  // No prefix
      ];

      // Try each prefix
      for (const prefix of prefixes) {
        const value = process.env[`${prefix}${key}`];
        if (value) {
          console.log(`[STRIPE-ENV] Found ${key} with prefix: ${prefix}`);
          return value;
        }
      }

      // If not found with prefixes, try the original key
      const value = process.env[key];
      if (value) {
        console.log(`[STRIPE-ENV] Found ${key} without prefix`);
        return value;
      }

      console.log(`[STRIPE-ENV] Could not find ${key} with any prefix`);
      return undefined;
    }

    // Not in Lambda, use regular process.env
    return process.env[key];
  } catch (error) {
    console.error(`[STRIPE-ENV] Error getting environment variable ${key}:`, error);
    return undefined;
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

      // Log all available environment variables (keys only, not values)
      console.log('[STRIPE] Available environment variables:',
        Object.keys(process.env).filter(key =>
          !key.includes('AWS_SECRET') &&
          !key.includes('PASSWORD') &&
          !key.includes('TOKEN')
        )
      );
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
    });

    // Validate required environment variables
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured. Please check AWS Amplify environment variables.');
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