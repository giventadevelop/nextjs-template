import { NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";

// Force Node.js runtime - Edge runtime is not compatible with Prisma
export const runtime = 'nodejs';

// Disable body parsing for Stripe webhooks
export const bodyParser = false;

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

if (!process.env.API_BASE_URL) {
  throw new Error('API_BASE_URL is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-03-31.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headersList = headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return new NextResponse(
        JSON.stringify({ error: "Missing stripe signature" }),
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error("Error verifying webhook signature:", err);
      return new NextResponse(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400 }
      );
    }

    // Handle event ticket purchase completion
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Handle successful payment for event tickets
      if (session.mode === "payment" && session.metadata?.eventId) {
        const { eventId, ticketDetails } = session.metadata;
        const parsedTickets = JSON.parse(ticketDetails);

        // Debug logging for session metadata
        console.log('Session metadata:', session.metadata);
        console.log('Full session object:', session);

        // Get userId from metadata, defaulting to null if not present
        const userId = session.metadata?.userId || null;
        console.log('Extracted userId:', userId);

        try {
          // Create transaction records using the REST API
          const transactions = await Promise.all(
            parsedTickets.map(async (ticket: any) => {
              console.log('Creating transaction with userId:', userId);
              const response = await fetch(`${process.env.API_BASE_URL}/api/ticket-transactions`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  email: session.customer_email || "",
                  ticketType: ticket.type,
                  quantity: ticket.quantity,
                  pricePerUnit: ticket.price,
                  totalAmount: ticket.price * ticket.quantity,
                  status: "completed",
                  purchaseDate: new Date().toISOString(),
                  eventId: eventId,
                  userId: userId
                }),
              });

              if (!response.ok) {
                throw new Error(`Failed to create ticket transaction: ${response.statusText}`);
              }

              const result = await response.json();
              console.log('Created transaction:', result);
              return result;
            })
          );

          // Store the first transaction ID in the session metadata
          // We'll use this to fetch transaction details in the success page
          if (transactions.length > 0) {
            await stripe.checkout.sessions.update(session.id, {
              metadata: {
                ...session.metadata,
                transactionId: transactions[0].id.toString()
              }
            });
          }

          console.log(`Successfully created ticket transactions for session: ${session.id}`);
        } catch (error) {
          console.error("Error creating ticket transactions:", error);
          throw error;
        }
      }
    }

    // For other event types, just acknowledge receipt
    console.log(`Successfully received webhook event: ${event.type} (ID: ${event.id})`);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    // Return 200 for general errors to prevent retries
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 200 }
    );
  }
}
