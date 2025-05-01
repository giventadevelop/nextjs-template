import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { initStripeConfig, getStripeEnvVar } from '@/lib/stripe/init';
import getConfig from 'next/config';

// Force Node.js runtime
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { serverRuntimeConfig } = getConfig() || { serverRuntimeConfig: {} };

  // Skip processing during build phase
  if (process.env.NEXT_PHASE === 'build') {
    console.log('[STRIPE-WEBHOOK] Skipping during build phase');
    return new NextResponse(
      JSON.stringify({ error: 'Not available during build' }),
      { status: 503 }
    );
  }

  try {
    // Log environment state for debugging
    console.log('[STRIPE-WEBHOOK] Environment state:', {
      phase: process.env.NEXT_PHASE,
      nodeEnv: process.env.NODE_ENV,
      isLambda: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
      hasSecretKey: !!getStripeEnvVar('STRIPE_SECRET_KEY'),
      hasWebhookSecret: !!getStripeEnvVar('STRIPE_WEBHOOK_SECRET'),
      hasAppUrl: !!getStripeEnvVar('NEXT_PUBLIC_APP_URL'),
      runtime: typeof window === 'undefined' ? 'server' : 'client',
      // Log some environment variable keys for debugging (DO NOT log values)
      envKeys: Object.keys(process.env).filter(key =>
        key.includes('STRIPE') ||
        key.includes('NEXT_PUBLIC') ||
        key.includes('AWS_') ||
        key.includes('AMPLIFY_')
      )
    });

    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('[STRIPE-WEBHOOK] Missing stripe-signature header');
      return new NextResponse('Missing stripe-signature', { status: 400 });
    }

    // Initialize Stripe with environment variable checks
    const stripe = initStripeConfig();
    if (!stripe) {
      throw new Error('[STRIPE-WEBHOOK] Failed to initialize Stripe configuration');
    }

    // Get webhook secret from Next.js config or environment variables
    const webhookSecret = serverRuntimeConfig.STRIPE_WEBHOOK_SECRET || getStripeEnvVar('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('[STRIPE-WEBHOOK] Available config:', {
        serverConfig: Object.keys(serverRuntimeConfig),
        envKeys: Object.keys(process.env).filter(k => k.includes('WEBHOOK') || k.includes('AMPLIFY'))
      });
      throw new Error('[STRIPE-WEBHOOK] Stripe webhook secret is not configured');
    }

    try {
      // Verify webhook signature and construct event
      const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log('[STRIPE-WEBHOOK] Successfully verified webhook signature');

      // Process the event
      switch (event.type) {
        case 'checkout.session.completed':
          // Handle successful checkout
          console.log('[STRIPE-WEBHOOK] Processing checkout.session.completed:', {
            eventId: event.data.object.metadata?.eventId,
            customerId: event.data.object.customer,
            amount: event.data.object.amount_total,
          });
          // Add your checkout completion logic here
          break;

        case 'payment_intent.succeeded':
          // Handle successful payment
          console.log('[STRIPE-WEBHOOK] Processing payment_intent.succeeded:', {
            intentId: event.data.object.id,
            amount: event.data.object.amount,
            status: event.data.object.status,
          });
          // Add your payment success logic here
          break;

        default:
          console.log(`[STRIPE-WEBHOOK] Unhandled event type: ${event.type}`);
      }

      return new NextResponse(JSON.stringify({ received: true }), {
        status: 200,
      });
    } catch (err) {
      console.error('[STRIPE-WEBHOOK] Error verifying webhook signature:', err);
      return new NextResponse(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[STRIPE-WEBHOOK] Webhook error:', error);
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500 }
    );
  }
}
