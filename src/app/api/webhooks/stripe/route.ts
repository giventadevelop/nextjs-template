import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { initStripeConfig } from '@/lib/stripe/init';

// Force Node.js runtime
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = headers().get('stripe-signature') as string | null;

    if (!signature) {
      console.error('[STRIPE-WEBHOOK] Missing stripe-signature header');
      return new NextResponse('Missing stripe-signature', { status: 400 });
    }

    // Initialize Stripe with environment variable checks
    const stripe = initStripeConfig();
    if (!stripe) {
      throw new Error('[STRIPE-WEBHOOK] Failed to initialize Stripe configuration');
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('[STRIPE-WEBHOOK] Stripe webhook secret is not configured');
    }

    // Verify webhook signature and construct event
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log('[STRIPE-WEBHOOK] Event received:', {
      type: event.type,
      id: event.id
    });

    // Handle specific event types
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('[STRIPE-WEBHOOK] Checkout completed:', {
          sessionId: session.id,
          customerId: session.customer,
          metadata: session.metadata
        });

        // Add your business logic here
        // For example, create tickets, send confirmation emails, etc.
        break;

      // Add other event types as needed
      default:
        console.log(`[STRIPE-WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return new NextResponse(JSON.stringify({ received: true }), {
      status: 200,
    });
  } catch (error: unknown) {
    console.error('[STRIPE-WEBHOOK] Error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : 'Unknown',
      code: (error as any)?.code,
      stripeError: (error as any)?.raw ? {
        type: (error as any)?.raw?.type,
        code: (error as any)?.raw?.code,
        message: (error as any)?.raw?.message
      } : null
    });

    return new NextResponse(
      JSON.stringify({
        error: 'Webhook handler failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500 }
    );
  }
}
