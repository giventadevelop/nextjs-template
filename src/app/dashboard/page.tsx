import { auth } from "@clerk/nextjs";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Navbar } from "@/components/Navbar";
import { DashboardContent } from "@/components/DashboardContent";
import { Suspense } from "react";

interface Task {
  id: string;
  title: string;
  status: string;
  completed: boolean;
  priority: string;
}

interface PageProps {
  searchParams: { success?: string; session_id?: string };
}

async function checkSubscriptionStatus(userId: string, isReturnFromStripe: boolean = false) {
  // If returning from Stripe, try up to 3 times with a 1-second delay
  const maxAttempts = isReturnFromStripe ? 3 : 1;
  const delayMs = 1000; // 1 second

  for (let i = 0; i < maxAttempts; i++) {
    const subscription = await db.subscription.findFirst({
      where: { userId },
      select: {
        stripeSubscriptionId: true,
        stripePriceId: true,
        stripeCurrentPeriodEnd: true,
        status: true,
      },
    });

    console.log('Subscription check attempt', i + 1, ':', {
      userId,
      subscription,
      isReturnFromStripe,
      attemptNumber: i + 1,
      maxAttempts,
    });

    // If no subscription record exists, redirect to pricing
    if (!subscription) {
      return false;
    }

    // Check for valid subscription - include 'active', 'trialing', and 'incomplete' (payment processing)
    const validStatuses = ['active', 'trialing', 'incomplete'];
    const isValid = subscription.stripeSubscriptionId &&
      validStatuses.includes(subscription.status || '');

    if (isValid) {
      return true;
    }

    // Only wait if we're returning from Stripe and this isn't the last attempt
    if (isReturnFromStripe && i < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return false;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  // Initialize headers and auth
  const headersList = await headers();
  const cookiesList = await cookies();
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Get search params
  const success = searchParams?.success;
  const sessionId = searchParams?.session_id;
  const isReturnFromStripe = Boolean(success === 'true' || sessionId);

  // Check subscription status with more retries if returning from Stripe
  const hasActiveSubscription = await checkSubscriptionStatus(userId, isReturnFromStripe);

  if (!hasActiveSubscription) {
    // If we're returning from Stripe but subscription isn't active yet, wait a bit longer
    if (isReturnFromStripe) {
      // Wait for 2 seconds more
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Check one final time
      const finalCheck = await checkSubscriptionStatus(userId, true);
      if (!finalCheck) {
        redirect('/pricing?message=subscription-pending');
      }
    } else {
      redirect('/pricing?message=subscription-required');
    }
  }

  const tasks = await db.task.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      status: true,
      completed: true,
      priority: true,
    },
  }) || [];

  const stats = {
    total: tasks.length,
    completed: tasks.filter((task: Task) => task.status === 'completed').length,
    inProgress: tasks.filter((task: Task) => task.status === 'in_progress').length,
    pending: tasks.filter((task: Task) => task.status === 'pending').length,
    highPriority: tasks.filter((task: Task) => task.priority === "high").length,
  };

  return (
    <>
      <Navbar />
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#39E079] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your dashboard...</p>
            </div>
          </div>
        }
      >
        <DashboardContent tasks={tasks} stats={stats} />
      </Suspense>
    </>
  );
}
