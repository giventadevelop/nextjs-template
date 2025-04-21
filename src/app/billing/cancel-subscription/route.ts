import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

// Force Node.js runtime - Edge runtime is not compatible with Prisma
export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16" as Stripe.LatestApiVersion,
});

export async function POST(req: Request) {
  try {
    const { userId } = auth();

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
      // Cancel the subscription with Stripe
      const subscription = await stripe.subscriptions.update(
        body.stripeSubscriptionId,
        { cancel_at_period_end: true }
      );

      // Update our database
      await prisma.subscription.update({
        where: { userId },
        data: {
          status: 'canceled',
          stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return NextResponse.json(
        { error: 'Failed to cancel subscription' },
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