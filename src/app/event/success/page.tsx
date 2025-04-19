import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";

async function createTicketTransaction(session: any, userId: string) {
  try {
    const ticketData = JSON.parse(session.metadata.tickets);

    // Create a transaction for each ticket type
    for (const ticket of ticketData) {
      await db.ticketTransaction.create({
        data: {
          userId: userId,
          eventId: session.metadata.eventId,
          email: session.metadata.email,
          ticketType: ticket.type,
          quantity: ticket.quantity,
          pricePerUnit: ticket.price,
          totalAmount: ticket.price * ticket.quantity,
          status: 'completed',
          purchaseDate: new Date(),
        },
      });
    }
  } catch (error) {
    console.error('Error creating ticket transaction:', error);
    throw error;
  }
}

async function getCheckoutSession(sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    });
    return session;
  } catch (error) {
    console.error('Error retrieving checkout session:', error);
    return null;
  }
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  const sessionId = searchParams.session_id;
  if (!sessionId) {
    redirect('/event');
  }

  const session = await getCheckoutSession(sessionId);
  if (!session) {
    redirect('/event?error=invalid-session');
  }

  // Create ticket transaction in database
  try {
    await createTicketTransaction(session, userId);
  } catch (error) {
    console.error('Failed to create ticket transaction:', error);
    redirect('/event?error=transaction-failed');
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#39E079] mx-auto mb-4"></div>
            <p className="text-gray-600">Processing your purchase...</p>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>
          <h1 className="mt-3 text-center text-2xl font-bold tracking-tight text-gray-900">
            Payment successful!
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Thank you for your purchase. Your tickets have been confirmed.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Order Summary
                </h2>
                <div className="mt-2 space-y-4">
                  {session.line_items?.data.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex justify-between text-sm text-gray-500"
                    >
                      <span>{item.description}</span>
                      <span>
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(item.amount_total / 100)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between text-base font-medium text-gray-900">
                      <span>Total</span>
                      <span>
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }).format((session.amount_total ?? 0) / 100)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Link
                  href="/dashboard"
                  className="flex w-full justify-center rounded-md bg-[#39E079] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#32c96d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#39E079]"
                >
                  Go to Dashboard
                </Link>
                <Link
                  href="/event"
                  className="flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  View More Events
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  );
}