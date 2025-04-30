import { auth, currentUser } from "@clerk/nextjs";
import { headers, cookies } from 'next/headers';
import { Metadata } from 'next';
import { PricingPlans } from '@/components/subscription/PricingPlans';




const messages = {
  'subscription-required': {
    type: 'warning',
    text: 'A subscription is required to access the dashboard. Please subscribe to continue.',
    className: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  },
  'subscription-pending': {
    type: 'info',
    text: 'Your subscription is being processed. Please wait a moment and try accessing the dashboard again.',
    className: 'bg-blue-50 border-blue-200 text-blue-800',
  },
  'subscription-failed': {
    type: 'error',
    text: 'There was an issue activating your subscription. Please try again or contact support if the problem persists.',
    className: 'bg-red-50 border-red-200 text-red-800',
  },
} as const;

type MessageType = keyof typeof messages;

interface PageProps {
  searchParams: { message?: string };
}

export interface UserProfileDTO {
  id?: string;
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSubscriptionDTO {
  id?: string;
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  stripeCurrentPeriodEnd: Date | null;
  status: string;
  userProfile?: UserProfileDTO;
}

export const metadata: Metadata = {
  title: "Pricing - TaskMngr",
  description: "Choose the right plan for your needs",
};

// Force Node.js runtime
export const runtime = 'nodejs';

export default async function PricingPage({ searchParams }: PageProps) {
  try {
    // Initialize headers and auth at runtime
    await headers();
    await cookies(); // Ensure cookies are ready

    // Initialize auth at runtime
    const session = await auth();
    const userId = session?.userId;
    const clerkUser = await currentUser();

    if (!userId || !clerkUser?.emailAddresses?.[0]?.emailAddress) {
      throw new Error("User information not found - Please update your profile");
    }

    const email = clerkUser.emailAddresses[0].emailAddress;
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
    // Get subscription only if user is logged in
    // Try to get existing subscription
    let subscription: UserSubscriptionDTO | null = null;
    try {
      const response = await fetch(`${apiBaseUrl}/api/user-subscriptions/by-profile/${userProfile?.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const subscriptions: UserSubscriptionDTO[] = await response.json();
        subscription = subscriptions[0]; // Get the first subscription
      } else if (response.status !== 404) {
        throw new Error(`Failed to fetch subscription: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      throw new Error('Failed to fetch subscription data');
    }

    // Create subscription if it doesn't exist
    if (!subscription) {
      try {
        const newSubscription: UserSubscriptionDTO = {
          userId,
          status: 'pending',
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          stripePriceId: null,
          stripeCurrentPeriodEnd: null,
          userProfile: userProfile?.id

        };

        const response = await fetch(`${apiBaseUrl}/api/user-subscriptions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newSubscription),
        });

        if (!response.ok) {
          throw new Error(`Failed to create subscription: ${response.statusText}`);
        }

        const responseData = await response.json();
        subscription = {
          ...responseData,
          stripeCurrentPeriodEnd: responseData.stripeCurrentPeriodEnd ? new Date(responseData.stripeCurrentPeriodEnd) : null
        };
      } catch (error) {
        console.error('Error creating subscription:', error);
        throw new Error('Failed to create subscription');
      }
    } else if (subscription.stripeCurrentPeriodEnd && typeof subscription.stripeCurrentPeriodEnd === 'string') {
      // Convert stripeCurrentPeriodEnd to Date if it's a string
      subscription = {
        ...subscription,
        stripeCurrentPeriodEnd: new Date(subscription.stripeCurrentPeriodEnd)
      };
    }

    // Await searchParams access
    const messageParam = await (async () => searchParams?.message)();

    // Validate and process message
    const message = messageParam && Object.keys(messages).includes(messageParam)
      ? (messageParam as MessageType)
      : undefined;
    const messageConfig = message ? messages[message] : null;

    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-20">
        <div className="container mx-auto px-4">
          {messageConfig && (
            <div className={`mb-8 p-4 border rounded-lg text-center ${messageConfig.className}`}>
              <p>{messageConfig.text}</p>
            </div>
          )}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-gray-600">
              Choose the plan that best fits your needs
            </p>
          </div>
          <PricingPlans currentSubscription={subscription} />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error in pricing page:', error);
    return (
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div className="bg-red-50 p-4 rounded-md">
          <h2 className="text-red-800">Error loading pricing information</h2>
          <p className="text-red-600">Please try again later</p>
        </div>
      </div>
    );
  }
}