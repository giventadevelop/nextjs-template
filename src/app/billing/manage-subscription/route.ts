import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

// Force Node.js runtime - Edge runtime is not compatible with Prisma
export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16" as Stripe.LatestApiVersion,
});

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
        { error: "Unauthorized" },
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
        { error: "Missing price ID" },
        { status: 400 }
      );
    }

    try {
      const clerkUser = await currentUser();
      if (!clerkUser?.emailAddresses?.[0]?.emailAddress) {
        return NextResponse.json(
          { error: "User email not found" },
          { status: 400 }
        );
      }

      const email = clerkUser.emailAddresses[0].emailAddress;

      // First, ensure we have a UserProfile
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!apiBaseUrl) {
        throw new Error('API base URL not configured');
      }

      // Try to get existing user profile
      let userProfile: UserProfileDTO | null = null;
      try {
        const response = await fetch(`${apiBaseUrl}/api/user-profiles/by-user/${userId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          userProfile = await response.json();
        } else if (response.status !== 404) {
          throw new Error(`Failed to fetch user profile: ${response.statusText}`);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }

      // Create user profile if it doesn't exist
      if (!userProfile) {
        const now = new Date().toISOString();
        const newUserProfile: UserProfileDTO = {
          userId,
          email,
          createdAt: now,
          updatedAt: now,
        };

        const response = await fetch(`${apiBaseUrl}/api/user-profiles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newUserProfile),
        });

        if (!response.ok) {
          throw new Error(`Failed to create user profile: ${response.statusText}`);
        }

        userProfile = await response.json();
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
          { error: 'Failed to process subscription' },
          { status: 400 }
        );
      }
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Subscription handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
