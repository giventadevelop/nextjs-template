import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

// Force Node.js runtime - Edge runtime is not compatible with Prisma
export const runtime = 'nodejs';

// Disable body parsing for Stripe webhooks
export const bodyParser = false;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16" as Stripe.LatestApiVersion,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.error("No stripe signature found in headers");
      return NextResponse.json(
        { error: "No stripe signature found" },
        { status: 400 }
      );
    }

    const rawBody = await req.text();

    if (!rawBody) {
      console.error("Empty request body received");
      return NextResponse.json(
        { error: "Empty request body" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
      console.log(`Webhook received: ${event.type} (ID: ${event.id})`);
    } catch (err) {
      const error = err as Error;
      console.error('Webhook signature verification failed:', {
        error: error.message,
        signature: signature.slice(0, 10) + '...',
        bodyLength: rawBody.length,
      });
      return NextResponse.json(
        { error: `Webhook Error: ${error.message}` },
        { status: 400 }
      );
    }

    // Check if we've already processed this event
    const processedEvent = await prisma.processedStripeEvent.findUnique({
      where: { eventId: event.id },
    });

    if (processedEvent) {
      console.log(`Event ${event.id} already processed, skipping`);
      return NextResponse.json({ received: true });
    }

    // Handle subscription events
    if (event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const userId = subscription.metadata.userId;

      if (!userId) {
        console.error('No userId found in subscription metadata', {
          subscriptionId: subscription.id,
          customerId,
        });
        return NextResponse.json(
          { error: "No userId found in subscription metadata" },
          { status: 200 }
        );
      }

      console.log(`Processing subscription event: ${event.type}`, {
        customerId,
        userId,
        eventId: event.id,
        subscriptionStatus: subscription.status
      });

      try {
        // Use a transaction to ensure both operations succeed or fail together
        await prisma.$transaction([
          // Update the subscription
          prisma.subscription.update({
            where: { userId },
            data: {
              status: subscription.status,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscription.id,
              stripePriceId: subscription.items.data[0]?.price.id,
              stripeCurrentPeriodEnd: new Date(
                (subscription as any).current_period_end * 1000
              ),
            },
          }),
          // Mark the event as processed
          prisma.processedStripeEvent.create({
            data: {
              eventId: event.id,
              type: event.type,
              processedAt: new Date(),
            },
          }),
        ]);

        console.log(`Successfully processed subscription event ${event.id}`);
        return NextResponse.json({ received: true });
      } catch (dbError) {
        console.error("Database operation failed:", dbError);
        return NextResponse.json(
          { error: "Failed to update subscription in database" },
          { status: 200 }
        );
      }
    }

    // Handle event ticket purchase completion
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Handle successful payment for event tickets
      if (session.mode === "payment" && session.metadata?.eventId) {
        const { eventId, ticketDetails } = session.metadata;
        const parsedTickets = JSON.parse(ticketDetails);

        try {
          await prisma.$transaction([
            ...parsedTickets.map((ticket: any) =>
              prisma.ticketTransaction.create({
                data: {
                  eventId: eventId,
                  email: session.customer_email || '',
                  ticketType: ticket.type,
                  quantity: ticket.quantity,
                  pricePerUnit: ticket.price,
                  totalAmount: ticket.price * ticket.quantity,
                  status: 'completed',
                  purchaseDate: new Date(),
                }
              })
            )
          ]);
        } catch (error) {
          console.error('Error creating ticket transactions:', error);
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
