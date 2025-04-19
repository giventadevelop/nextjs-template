import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs";
import { getPrismaClient } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16" as Stripe.LatestApiVersion,
});

interface ManageStripeSubscriptionActionProps {
  userId: string;
  isSubscribed: boolean;
  isCurrentPlan: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string | null;
  stripePriceId: string;
  email: string;
}

export async function POST(req: Request) {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    // Get base URL from environment or request
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      // Extract base URL from the request
      const url = new URL(req.url);
      baseUrl = `${url.protocol}//${url.host}`;
      console.warn('NEXT_PUBLIC_APP_URL not set, using request URL:', baseUrl);
    }

    // Ensure baseUrl starts with http/https
    if (!baseUrl.startsWith('http')) {
      baseUrl = `https://${baseUrl}`;
    }

    const body = await req.json();

    if (!body.stripePriceId) {
      return NextResponse.json(
        { error: "Missing required field: stripePriceId" },
        { status: 400 }
      );
    }

    // Initialize Prisma client
    const prisma = getPrismaClient();

    try {
      const clerkUser = await currentUser();
      if (!clerkUser?.emailAddresses?.[0]?.emailAddress) {
        return NextResponse.json(
          { error: "User email not found - Please update your email in profile" },
          { status: 400 }
        );
      }

      const email = clerkUser.emailAddresses[0].emailAddress;

      // First, ensure we have a UserProfile
      let userProfile = await prisma.userProfile.findUnique({
        where: { userId },
      });

      if (!userProfile) {
        // Create UserProfile if it doesn't exist
        userProfile = await prisma.userProfile.create({
          data: {
            userId,
            email,
          },
        });
      }

      // Now we can safely work with the subscription
      let subscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription) {
        subscription = await prisma.subscription.create({
          data: {
            userId,
            status: 'pending',
          },
        });
      }

      // If user already has a Stripe customer ID, use it
      let customerId = body.stripeCustomerId;

      try {
        // If no customer ID, check if one exists for this user's email
        if (!customerId) {
          const customers = await stripe.customers.list({
            email,
            limit: 1,
          });

          if (customers.data.length > 0) {
            customerId = customers.data[0].id;
          } else {
            // Create a new customer if none exists
            const customer = await stripe.customers.create({
              email,
              metadata: {
                userId: userId,
              },
            });
            customerId = customer.id;
          }

          // Update subscription with the customer ID
          await prisma.subscription.update({
            where: { userId },
            data: { stripeCustomerId: customerId },
          });
        }

        let url: string;

        if (body.isSubscribed && body.stripeSubscriptionId && customerId) {
          const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${baseUrl}/dashboard`,
          });

          if (!session.url) {
            throw new Error('Failed to create billing portal session');
          }
          url = session.url;
        } else {
          const session = await stripe.checkout.sessions.create({
            success_url: `${baseUrl}/dashboard`,
            cancel_url: `${baseUrl}/dashboard`,
            payment_method_types: ['card'],
            mode: 'subscription',
            billing_address_collection: 'auto',
            customer: customerId,
            subscription_data: {
              metadata: {
                userId: userId,
              },
            },
        line_items: [
          {
                price: body.stripePriceId,
            quantity: 1,
          },
        ],
        metadata: {
              userId: userId,
        },
      });

          if (!session.url) {
            throw new Error('Failed to create checkout session');
          }
          url = session.url;
        }

        return NextResponse.json({ url });
      } catch (stripeError) {
        console.error('Stripe API error:', stripeError);
        return NextResponse.json(
          { error: stripeError instanceof Error ? stripeError.message : 'Failed to process subscription' },
          { status: 400 }
        );
      }
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      return NextResponse.json(
        { error: 'Failed to access database. Please try again later.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Subscription handler error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
