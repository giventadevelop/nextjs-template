import { auth } from "@clerk/nextjs";
import { NextResponse } from 'next/server';
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/DashboardContent";
import { Suspense } from "react";

interface UserTaskDTO {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  completed: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

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
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  stripeCurrentPeriodEnd?: string;
  status: string;
  userProfile?: UserProfileDTO;
}

async function checkSubscriptionStatus(userId: string, isReturnFromStripe: boolean = false) {
  // If returning from Stripe, try up to 3 times with a 1-second delay
  const maxAttempts = isReturnFromStripe ? 3 : 1;
  const delayMs = 1000; // 1 second
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl) {
    throw new Error('API base URL not configured');
  }


  let userProfile: UserProfileDTO | null = null;

  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }
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

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${apiBaseUrl}/api/user-subscriptions/by-profile/${userProfile?.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return false;
        }
        throw new Error(`Failed to fetch subscription: ${response.statusText}`);
      }

      const subscriptions: UserSubscriptionDTO[] = await response.json();
      const subscription = subscriptions[0]; // Get the first subscription

      console.log('Subscription check attempt', i + 1, ':', {
        userId,
        subscription,
        isReturnFromStripe,
        attemptNumber: i + 1,
        maxAttempts,
      });

      // If no subscription record exists, return false
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
    } catch (error) {
      console.error('Error checking subscription status:', error);
      if (i === maxAttempts - 1) {
        throw error;
      }
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

  // Get all tasks for the user
  let tasks = [];
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user-tasks?userId.equals=${userId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store', // Disable caching to always get fresh data
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch tasks: ${response.statusText}`);
    }

    tasks = await response.json();

    // Sort tasks by createdAt in descending order
    tasks.sort((a: UserTaskDTO, b: UserTaskDTO) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  } catch (error) {
    console.error('Error fetching tasks:', error);
    tasks = []; // Fallback to empty array on error
  }

  const stats = {
    total: tasks.length,
    completed: tasks.filter((task: Task) => task.status === 'completed').length,
    inProgress: tasks.filter((task: Task) => task.status === 'in_progress').length,
    pending: tasks.filter((task: Task) => task.status === 'pending').length,
    highPriority: tasks.filter((task: Task) => task.priority === "high").length,
  };

  return (
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
  );
}
