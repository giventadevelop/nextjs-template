import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-03-31.basil',
});

export async function POST(request: Request) {
  console.log('Webhook received');
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('Missing signature or webhook secret');
    return NextResponse.json(
      { error: 'Missing required headers or configuration' },
      { status: 400 }
    );
  }

  try {
    console.log('Constructing Stripe event');
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log('Event type:', event.type);

    if (event.type === 'checkout.session.completed') {
      console.log('Processing completed checkout session');
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('Session metadata:', session.metadata);
      const { eventId, ticketDetails } = session.metadata || {};
      const tickets = ticketDetails ? JSON.parse(ticketDetails) : [];
      console.log('Parsed tickets:', tickets);

      // Create transaction records for each ticket type
      const createdTransactions = await Promise.all(
        tickets
          .filter((ticket: any) => ticket.quantity > 0)
          .map(async (ticket: any) => {
            console.log('Creating transaction for ticket:', ticket);
            try {
              const transaction = await prisma.ticketTransaction.create({
                data: {
                  email: session.customer_email || '',
                  eventId,
                  ticketType: ticket.ticketType,
                  quantity: ticket.quantity,
                  pricePerUnit: ticket.pricePerUnit,
                  totalAmount: ticket.pricePerUnit * ticket.quantity,
                  status: 'completed',
                },
              });
              console.log('Created transaction:', transaction);
              return transaction;
            } catch (error) {
              console.error('Error creating transaction:', error);
              throw error;
            }
          })
      );

      console.log('Created transactions:', createdTransactions);

      // Store the processed Stripe event
      await prisma.processedStripeEvent.create({
        data: {
          eventId: event.id,
          type: event.type,
        },
      });
      console.log('Stored Stripe event');
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}