import { NextResponse } from "next/server";
import Stripe from "stripe";

// Force Node.js runtime
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    console.log('Starting checkout process...');

    const body = await request.json();
    console.log('Request body:', JSON.stringify({
      tickets: body.tickets,
      eventId: body.eventId,
      email: body.email,
      hasUserId: !!body.userId
    }));

    // Log Stripe configuration (DO NOT log actual keys)
    console.log('Stripe configuration check:', {
      hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      environment: process.env.NODE_ENV,
      isLiveMode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')
    });

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe secret key is not configured');
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-03-31.basil' as Stripe.LatestApiVersion,
    });

    const { tickets, eventId, email, userId } = body;

    // Log the received userId
    console.log('Received userId in checkout:', userId);

    // Basic validation
    if (!tickets?.length || !email) {
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

    // Log the metadata we're about to set
    const metadata = {
      eventId,
      ticketDetails: JSON.stringify(tickets),
      userId: userId || null,
      transactionId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Add unique transaction ID
    };
    console.log('Setting session metadata:', metadata);

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

    // Log the created session
    console.log('Created session with metadata:', session.metadata);

    return new NextResponse(
      JSON.stringify({ url: session.url }),
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Detailed checkout error:', {
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
      JSON.stringify({ error: 'Failed to create checkout session' }),
      { status: 500 }
    );
  }
}