import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { db } from "@/lib/db";
import Stripe from "stripe";

// Force Node.js runtime - Edge runtime is not compatible with Prisma
export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
});

export async function POST(req: Request) {
  try {
    const { userId } = auth();

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
      const subscription = await db.subscription.findFirst({
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
      ) as Stripe.Subscription;

      // Get the subscription item's current period end
      const subscriptionItem = canceledSubscription.items.data[0];
      const currentPeriodEnd = subscriptionItem.current_period_end;

      // Update the subscription status in our database
      await db.subscription.update({
        where: { userId },
        data: {
          status: canceledSubscription.status,
          stripeCurrentPeriodEnd: new Date(currentPeriodEnd * 1000),
        },
      });

      return NextResponse.json({
        success: true,
        status: canceledSubscription.status,
        currentPeriodEnd: currentPeriodEnd
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
  }
}