import { auth } from '@clerk/nextjs';
import { headers, cookies } from 'next/headers';
import { Metadata } from 'next';
import { PricingPlans } from '@/components/subscription/PricingPlans';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';

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

export const metadata: Metadata = {
  title: "Pricing - TaskMngr",
  description: "Choose the right plan for your needs",
};

export default async function PricingPage({ searchParams }: PageProps) {
  // Initialize headers and auth
  await headers();
  await cookies(); // Ensure cookies are ready
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Await searchParams access
  const messageParam = await (async () => searchParams?.message)();

  const subscription = await db.subscription.findFirst({
    where: { userId },
  });

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
}