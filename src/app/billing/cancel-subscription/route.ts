import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import Stripe from "stripe";

// Force Node.js runtime - Edge runtime is not compatible with Prisma
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

interface UserProfileDTO {
  id?: number;
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserSubscriptionDTO {
  id?: number;
  userId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  stripeCurrentPeriodEnd?: string;
  status: string;
  userProfile?: UserProfileDTO;
}

export async function POST(req: Request) {
  try {
    // Initialize auth at runtime, not build time
    const session = await auth();
    const userId = session?.userId;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    if (!body.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "Missing subscription ID" },
        { status: 400 }
      );
    }

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!apiBaseUrl) {
        throw new Error('API base URL not configured');
      }

      // First get the current subscription
      const getResponse = await fetch(`${apiBaseUrl}/api/user-subscriptions/by-profile/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!getResponse.ok) {
        throw new Error(`Failed to fetch subscription: ${getResponse.statusText}`);
      }

      const subscriptions: UserSubscriptionDTO[] = await getResponse.json();
      const subscription = subscriptions[0]; // Get the first subscription

      if (!subscription || !subscription.id) {
        return NextResponse.json(
          { error: "Subscription not found" },
          { status: 404 }
        );
      }

      // Initialize Stripe and cancel the subscription
      const stripe = getStripe();
      const stripeSubscription = await stripe.subscriptions.update(
        body.stripeSubscriptionId,
        { cancel_at_period_end: true }
      );

      // Update our subscription via API
      const updatedSubscription: UserSubscriptionDTO = {
        id: subscription.id,
        userId: userId,
        status: 'canceled',
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        stripeCurrentPeriodEnd: stripeSubscription.cancel_at ? new Date(stripeSubscription.cancel_at * 1000).toISOString() : undefined,
        stripePriceId: subscription.stripePriceId,
        stripeCustomerId: subscription.stripeCustomerId
      };

      const updateResponse = await fetch(`${apiBaseUrl}/api/user-subscriptions/${subscription.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSubscription),
      });

      if (!updateResponse.ok) {
        throw new Error(`Failed to update subscription: ${updateResponse.statusText}`);
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to cancel subscription' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in cancel subscription route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}