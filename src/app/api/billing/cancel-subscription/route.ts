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

export async function POST(req: Request) {
  /* try {
    const { userId } = auth();
    const stripe = getStripe(); // Initialize Stripe only when needed

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const body = await req.json();

    if (!body.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "Missing required field: stripeSubscriptionId" },
        { status: 400 }
      );
    }

    try {
      // Verify that the subscription belongs to the user
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId: userId,
          stripeSubscriptionId: body.stripeSubscriptionId,
        },
      });

      if (!subscription) {
        return NextResponse.json(
          { error: "Subscription not found or unauthorized" },
          { status: 404 }
        );
      }

      // Cancel the subscription in Stripe
      const canceledSubscription = await stripe.subscriptions.cancel(
        body.stripeSubscriptionId
      );

      const periodEnd = canceledSubscription.current_period_end
        ? new Date(canceledSubscription.current_period_end * 1000)
        : null;

      // Update the subscription status in our database
      await prisma.subscription.update({
        where: { userId },
        data: {
          status: canceledSubscription.status,
          stripeCurrentPeriodEnd: periodEnd,
        },
      });

      return NextResponse.json({
        success: true,
        status: canceledSubscription.status,
        currentPeriodEnd: canceledSubscription.current_period_end
      });
    } catch (stripeError) {
      console.error('Stripe API error:', stripeError);
      return NextResponse.json(
        { error: stripeError instanceof Error ? stripeError.message : 'Failed to cancel subscription' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  } */
}