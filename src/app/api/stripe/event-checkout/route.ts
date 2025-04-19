import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tickets, eventId, email } = body;

    // Validate input
    if (!tickets || !tickets.length || !eventId || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
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
        unit_amount: ticket.price * 100, // Convert to cents
      },
      quantity: ticket.quantity,
    }));

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      line_items,
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/event/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/event`,
      metadata: {
        eventId,
        userId,
        tickets: JSON.stringify(tickets),
        email,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}