import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

import Stripe from 'stripe';

// Force Node.js runtime - Edge runtime is not compatible with Prisma
export const runtime = 'nodejs';

// Disable body parsing for Stripe webhooks
export const bodyParser = false;

if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL is not set');
}

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

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

interface UserSubscriptionDTO {
  id?: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  stripeCurrentPeriodEnd?: string;
  status: string;
  userProfile?: UserProfileDTO;
}

interface UserProfileDTO {
  id: number;
  userId: string;
  // Add other fields as needed
}



export async function POST(req: Request) {
  try {
    const stripe = getStripe(); // Initialize Stripe only when needed
    const body = await req.text();
    const headersList = await headers();
    const sig = headersList.get('stripe-signature');

    if (!sig) {
      return new NextResponse('No signature', { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: any) {
      console.error('Error verifying webhook signature:', err.message);
      return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // Handle event ticket purchase completion
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // Handle successful payment for event tickets
      if (session.mode === 'payment' && session.metadata?.eventId) {
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
              const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/ticket-transactions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  email: session.customer_email || '',
                  ticketType: ticket.type,
                  quantity: ticket.quantity,
                  pricePerUnit: ticket.price,
                  totalAmount: ticket.price * ticket.quantity,
                  status: 'completed',
                  purchaseDate: new Date().toISOString(),
                  eventId: eventId,
                  userId: userId,
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
                transactionId: transactions[0].id.toString(),
              },
            });
          }

          console.log(`Successfully created ticket transactions for session: ${session.id}`);
        } catch (error) {
          console.error('Error creating ticket transactions:', error);
          throw error;
        }
      }

      // Handle subscription checkout completion
      if (session.mode === 'subscription') {
        console.log('Processing subscription checkout completion');
        console.log('Session:', session);

        try {
          const userId = session.metadata?.userId;
          if (!userId) {
            throw new Error('No userId found in session metadata');
          }

          // Get the subscription from Stripe to get the subscription ID and current period end
          const subscription = (await stripe.subscriptions.retrieve(
            session.subscription as string
          )) as Stripe.Subscription;

          const subscriptionItem = subscription.items.data[0];
          const currentPeriodEnd = new Date(subscriptionItem.current_period_end * 1000);

          // Get user profile to get the subscription
          const profileResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user-profiles/by-user/${userId}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          if (!profileResponse.ok) {
            throw new Error(`Failed to fetch user profile: ${profileResponse.statusText}`);
          }

          const userProfile = await profileResponse.json();

          // Get base URL from environment or request
          let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
          if (!baseUrl) {
            // Extract base URL from the request
            const url = new URL(req.url);
            baseUrl = `${url.protocol}//${url.host}`;
            console.warn('NEXT_PUBLIC_APP_URL not set, using request URL:', baseUrl);
          }

          // Get existing subscription
          let existingSubscription: UserSubscriptionDTO | null = null;
          try {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user-subscriptions/by-profile/${userProfile.id}`,
              {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );

            if (response.ok) {
              const data = await response.json();
              // Check if response is an array and get first item
              if (Array.isArray(data)) {
                existingSubscription = data[0] || null;
                console.log('Found subscription array, using first item:', existingSubscription);
              } else {
                existingSubscription = data;
                console.log('Found single subscription:', existingSubscription);
              }
            }
          } catch (error) {
            console.error('Error fetching subscription:', error);
          }

          // Prepare subscription data
          const subscriptionData: UserSubscriptionDTO = {
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscriptionItem.price.id,
            stripeCurrentPeriodEnd: currentPeriodEnd.toISOString(),
            status: 'active',
            userProfile: userProfile,
          };

          // Merge new data with existing subscription data
          if (existingSubscription) {
            existingSubscription = {
              ...existingSubscription,
              ...subscriptionData,
            };
          }

          // Update or create subscription
          if (existingSubscription && existingSubscription.id) {
            try {
              const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user-subscriptions/${existingSubscription.id}`,
                {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(existingSubscription),
                }
              );

              if (!response.ok) {
                throw new Error(`Failed to update subscription: ${response.statusText}`);
              }

              existingSubscription = await response.json();
            } catch (error) {
              console.error('Error updating subscription:', error);
              throw new Error('Failed to update subscription');
            }
          } else {
            try {
              const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user-subscriptions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(existingSubscription),
              });

              if (!response.ok) {
                throw new Error(`Failed to create subscription: ${response.statusText}`);
              }

              existingSubscription = await response.json();
            } catch (error) {
              console.error('Error creating subscription:', error);
              throw new Error('Failed to create subscription');
            }
          }

          // Redirect to success page
          return NextResponse.redirect(`${baseUrl}/dashboard?subscription=success`, { status: 303 });

          console.log('Successfully updated subscription status to active');
        } catch (error) {
          console.error('Error processing subscription webhook:', error);
          throw error;
        }
      }
    }

    // For other event types, just acknowledge receipt
    console.log(`Successfully received webhook event: ${event.type} (ID: ${event.id})`);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Return 200 for general errors to prevent retries
    return NextResponse.json({ error: 'Internal server error' }, { status: 200 });
  }
}
