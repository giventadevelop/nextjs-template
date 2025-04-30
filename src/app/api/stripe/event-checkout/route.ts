import { NextResponse } from "next/server";
import Stripe from "stripe";

// Force Node.js runtime
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    console.log('[STRIPE-CHECKOUT] Starting checkout process...');

    const body = await request.json();
    console.log('[STRIPE-CHECKOUT] Request body:', {
      tickets: body.tickets,
      eventId: body.eventId,
      email: body.email,
      hasUserId: !!body.userId
    });

    // Log Stripe configuration (DO NOT log actual keys)
    console.log('[STRIPE-CHECKOUT] Configuration:', {
      hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      environment: process.env.NODE_ENV,
      isLiveMode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_'),
      appUrl: process.env.NEXT_PUBLIC_APP_URL
    });

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('[STRIPE-CHECKOUT] Stripe secret key is not configured');
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-03-31.basil' as Stripe.LatestApiVersion,
    });

    const { tickets, eventId, email, userId } = body;

    // Log the received userId
    console.log('Received userId in checkout:', userId);

    // Basic validation
    if (!tickets?.length || !email) {
      console.error('[STRIPE-CHECKOUT] Validation failed:', {
        hasTickets: !!tickets?.length,
        hasEmail: !!email
      });
      return new NextResponse(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

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

    // Log the metadata we're about to set
    const metadata = {
      eventId,
      ticketDetails: JSON.stringify(tickets),
      userId: userId || null,
      transactionId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    console.log('[STRIPE-CHECKOUT] Setting session metadata:', metadata);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: line_items,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/event/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/event`,
      customer_email: email,
      metadata: metadata,
    });

    console.log('[STRIPE-CHECKOUT] Session created successfully:', {
      sessionId: session.id,
      hasUrl: !!session.url
    });

    return new NextResponse(
      JSON.stringify({ url: session.url }),
      { status: 200 }
    );
  } catch (error: unknown) {
    // Enhanced error logging
    console.error('[STRIPE-CHECKOUT] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : 'Unknown',
      code: (error as any)?.code,
      stripeError: (error as any)?.raw ? {
        type: (error as any)?.raw?.type,
        code: (error as any)?.raw?.code,
        message: (error as any)?.raw?.message
      } : null,
      stack: error instanceof Error ? error.stack : undefined
    });

    return new NextResponse(
      JSON.stringify({
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500 }
    );
  }
}