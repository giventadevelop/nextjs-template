import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { getPrismaClient } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16" as Stripe.LatestApiVersion,
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

    // Initialize Prisma client
    const prisma = getPrismaClient();

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
      const canceledSubscription = await stripe.subscriptions.cancel(body.stripeSubscriptionId);

      // Update the subscription status in our database
      await prisma.subscription.update({
        where: { userId },
        data: {
          status: canceledSubscription.status,
          stripeCurrentPeriodEnd: canceledSubscription.current_period_end
            ? new Date(canceledSubscription.current_period_end * 1000)
            : null,
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
  }
}