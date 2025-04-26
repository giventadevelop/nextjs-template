import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Force Node.js runtime
export const runtime = 'nodejs';

// Initialize Stripe lazily to prevent build-time errors
const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(secretKey, {
    apiVersion: '2025-03-31.basil',
  });
};

export async function POST(request: Request) {
  try {
    const stripe = getStripe(); // Initialize Stripe only when needed
    const body = await request.json();
    const { email, tickets, eventId } = body;

    // Validate input
    if (!email || !tickets || !tickets.length || !eventId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create line items for Stripe
    const lineItems = tickets
      .filter((ticket: any) => ticket.quantity > 0)
      .map((ticket: any) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: ticket.ticketType,
            description: `Ticket for Kanj Cine Star Nite 2025`,
          },
          unit_amount: Math.round(ticket.pricePerUnit * 100), // Convert to cents
        },
        quantity: ticket.quantity,
      }));

    console.log('Creating checkout session with line items:', lineItems);
    console.log('Metadata:', {
      eventId,
      ticketDetails: JSON.stringify(tickets),
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/event/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/event`,
      customer_email: email,
      metadata: {
        eventId,
        ticketDetails: JSON.stringify(tickets),
      },
      payment_intent_data: {
        metadata: {
          eventId,
          ticketDetails: JSON.stringify(tickets),
        },
      },
    });

    console.log('Created checkout session:', {
      id: session.id,
      url: session.url,
      metadata: session.metadata,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}