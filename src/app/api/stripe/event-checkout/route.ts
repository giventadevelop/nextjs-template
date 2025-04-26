import { NextResponse } from "next/server";
import Stripe from "stripe";

// Force Node.js runtime
export const runtime = 'nodejs';

// Initialize Stripe lazily to prevent build-time errors
const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(secretKey, {
    apiVersion: "2023-10-16" as Stripe.LatestApiVersion,
  });
};

export async function POST(request: Request) {
  try {
    const stripe = getStripe(); // Initialize Stripe only when needed
    const body = await request.json();
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
  } catch (error: any) {
    console.error('Stripe error:', error);
    return new NextResponse(
      JSON.stringify({ error: error.message || "Failed to create checkout session" }),
      { status: 500 }
    );
  }
}