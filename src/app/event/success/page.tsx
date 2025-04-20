import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";
import Link from "next/link";

export default async function SuccessPage({
  searchParams: { session_id },
}: {
  searchParams: { session_id?: string };
}) {
  if (!session_id) {
    redirect('/event');
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.status !== 'complete') {
      redirect('/event');
    }

    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white shadow-xl rounded-lg overflow-hidden">
            {/* Success Banner */}
            <div className="bg-green-500 h-2" />

            {/* Content */}
            <div className="p-8">
              <div className="text-center">
                {/* Success Icon */}
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
                <div className="space-y-3">
                  <p className="text-lg text-gray-600">
                    Thank you for your purchase. Your tickets have been confirmed.
                  </p>
                  <p className="text-gray-500">
                    A confirmation email has been sent to {session.customer_email}
                  </p>
                </div>

                {/* Divider */}
                <div className="my-8 border-t border-gray-200" />

                {/* Navigation Links */}
                <div className="space-y-4">
                  <Link
                    href="/event"
                    className="inline-block w-full sm:w-auto px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors duration-200"
                  >
                    Explore More Events
                  </Link>
                  <div className="sm:mt-0 mt-4">
                    <Link
                      href="/"
                      className="inline-block text-green-600 hover:text-green-700 font-medium"
                    >
                      Return to Home
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching session:', error);
    redirect('/event');
  }
}