import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

// Configure for Node.js runtime
export const runtime = 'nodejs';

// Disable Next.js body parsing
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

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const { eventId, ticketDetails } = session.metadata || {};

          // Check if this is a ticket purchase (has eventId and ticketDetails)
          if (eventId && ticketDetails) {
            console.log('Processing ticket purchase:', {
              eventId,
              customerEmail: session.customer_email,
            });

            const tickets = JSON.parse(ticketDetails);

            // Create transaction records for each ticket type
            await Promise.all(
              tickets
                .filter((ticket: any) => ticket.quantity > 0)
                .map((ticket: any) =>
                  prisma.ticketTransaction.create({
                    data: {
                      email: session.customer_email || '',
                      eventId,
                      ticketType: ticket.ticketType,
                      quantity: ticket.quantity,
                      pricePerUnit: ticket.pricePerUnit,
                      totalAmount: ticket.pricePerUnit * ticket.quantity,
                      status: 'completed',
                    },
                  })
                )
            );
            console.log('Ticket transactions created successfully');
          }
          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;
          const userId = subscription.metadata.userId;

          if (!userId) {
            console.error('No userId found in subscription metadata', {
              subscriptionId: subscription.id,
              customerId,
            });
            break;
          }

          console.log(`Processing subscription event: ${event.type}`, {
            customerId,
            userId,
            eventId: event.id,
            subscriptionStatus: subscription.status
          });

          // Find the subscription using userId
          const existingSubscription = await prisma.subscription.findUnique({
            where: { userId },
          });

          if (!existingSubscription) {
            console.error(`No subscription found for user ID: ${userId}`);
            break;
          }

          // Update the subscription
          await prisma.subscription.update({
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
          });
          console.log('Subscription updated successfully');
          break;
        }
      }

      // Mark the event as processed
      await prisma.processedStripeEvent.create({
        data: {
          eventId: event.id,
          type: event.type,
          processedAt: new Date(),
        },
      });

      return NextResponse.json({ received: true });
    } catch (dbError) {
      console.error("Database operation failed:", dbError);
      throw dbError; // Let the outer catch handle the error response
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
