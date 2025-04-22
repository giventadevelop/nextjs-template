import { NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";

// Configure for Node.js runtime
export const runtime = 'nodejs';

// Disable Next.js body parsing
export const bodyParser = false;

interface TicketDetails {
  quantity: number;
  ticketType: string;
  pricePerUnit: number;
  totalAmount?: number;
}

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
          const userId = session.metadata?.userId;

          // Handle subscription checkout completion
          if (session.mode === 'subscription' && userId) {
            console.log('Processing subscription checkout completion:', {
              userId,
              customerEmail: session.customer_email,
            });

            // Get the subscription ID from the session
            const subscriptionId = session.subscription as string;
            const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;
            const currentPeriodEnd = subscription.items.data[0].current_period_end;

            // Update the subscription in our database
            await prisma.subscription.update({
              where: { userId },
              data: {
                status: subscription.status,
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: subscriptionId,
                stripePriceId: subscription.items.data[0]?.price.id,
                stripeCurrentPeriodEnd: new Date(currentPeriodEnd * 1000),
              },
            });
            console.log('Subscription updated successfully after checkout');
          }

          // Handle ticket purchase (existing code)
          const { eventId, ticketDetails } = session.metadata || {};
          if (eventId && ticketDetails) {
            console.log('Processing ticket purchase:', {
              eventId,
              customerEmail: session.customer_email,
            });

            const tickets = JSON.parse(ticketDetails) as TicketDetails[];

            // Create transaction records for each ticket type
            await Promise.all(
              tickets
                .filter((ticket: TicketDetails) => ticket.quantity > 0)
                .map((ticket: TicketDetails) =>
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

          // Get subscription details
          const subscriptionDetails = await stripe.subscriptions.retrieve(subscription.id) as Stripe.Subscription;
          const newCurrentPeriodEnd = subscriptionDetails.items.data[0].current_period_end;

          // Update the subscription
          await prisma.subscription.update({
            where: {
              userId: userId,
            },
            data: {
              status: subscriptionDetails.status,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscription.id,
              stripePriceId: subscriptionDetails.items.data[0]?.price.id,
              stripeCurrentPeriodEnd: new Date(newCurrentPeriodEnd * 1000), // Convert Unix timestamp to Date
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
