import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tickets, eventId, email } = body;

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

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: line_items,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/event/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/event`,
      customer_email: email,
      metadata: {
        eventId,
        ticketDetails: JSON.stringify(tickets),
      },
    });

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