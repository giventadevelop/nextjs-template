import { NextResponse } from "next/server";
import { initStripeConfig, getStripeEnvVar } from "@/lib/stripe/init";

// Force Node.js runtime
export const runtime = 'nodejs';

export async function POST(request: Request) {
  // Skip processing during build phase
  if (process.env.NEXT_PHASE === 'build') {
    console.log('[STRIPE-CHECKOUT] Skipping during build phase');
    return new NextResponse(
      JSON.stringify({ error: 'Not available during build' }),
      { status: 503 }
    );
  }

  try {
    console.log('[STRIPE-CHECKOUT] Starting checkout process...');

    const body = await request.json();
    console.log('[STRIPE-CHECKOUT] Request body:', {
      tickets: body.tickets,
      eventId: body.eventId,
      email: body.email,
      hasUserId: !!body.userId
    });

    // Log environment state for debugging
    console.log('[STRIPE-CHECKOUT] Environment state:', {
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

    // Initialize Stripe with environment variable checks
    const stripe = initStripeConfig();
    if (!stripe) {
      throw new Error('[STRIPE-CHECKOUT] Failed to initialize Stripe configuration');
    }

    const { tickets, eventId, email, userId } = body;

    // Basic validation
    if (!tickets?.length) {
      return new NextResponse(
        JSON.stringify({ error: 'No tickets provided' }),
        { status: 400 }
      );
    }

    if (!email) {
      return new NextResponse(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400 }
      );
    }

    if (!eventId) {
      return new NextResponse(
        JSON.stringify({ error: 'Event ID is required' }),
        { status: 400 }
      );
    }

    // Get the app URL for success/cancel URLs
    const appUrl = getStripeEnvVar('NEXT_PUBLIC_APP_URL');
    if (!appUrl) {
      throw new Error('[STRIPE-CHECKOUT] App URL is not configured');
    }

    try {
      // Create line items for Stripe
      const line_items = tickets.map((ticket: any) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: ticket.type,
            description: `Ticket for ${eventId}`,
          },
          unit_amount: Math.round(ticket.price * 100), // Convert to cents
        },
        quantity: ticket.quantity,
      }));

      console.log('[STRIPE-CHECKOUT] Line items:', line_items);

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: line_items,
        mode: 'payment',
        success_url: `${appUrl}/event/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/event`,
        customer_email: email,
        metadata: {
          eventId,
          userId: userId || '',
          tickets: JSON.stringify(tickets),
        },
      });

      return new NextResponse(
        JSON.stringify({ url: session.url }),
        { status: 200 }
      );
    } catch (err) {
      console.error('[STRIPE-CHECKOUT] Error creating checkout session:', err);
      return new NextResponse(
        JSON.stringify({ error: 'Failed to create checkout session' }),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[STRIPE-CHECKOUT] Checkout error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
}