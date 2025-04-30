import { stripe } from '@/lib/stripe';

if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL is not set');
}

export default async function SuccessPage({
  searchParams: { session_id },
}: {
  searchParams: { session_id?: string };
}) {
  if (!session_id) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">No session ID provided.</p>
        </div>
      </div>
    );
  }

  try {
    // Get session details from Stripe
    const session = await stripe().checkout.sessions.retrieve(session_id);

    if (!session.metadata?.transactionId) {
      throw new Error('No transaction ID found in session metadata');
    }

    // Get transaction details from our API using the transaction ID from metadata
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/ticket-transactions/${session.metadata.transactionId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch transaction details');
    }
    const transaction = await response.json();

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md max-w-2xl w-full">
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

              {/* Transaction Details */}
              <div className="mt-8 border-t border-gray-200 pt-8">
                <h2 className="text-xl font-semibold mb-4">Transaction Details</h2>
                <div className="space-y-2">
                  <p className="text-gray-600">
                    <span className="font-medium">Transaction ID:</span> {transaction.id}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Event:</span> {transaction.eventId}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Ticket Type:</span> {transaction.ticketType}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Quantity:</span> {transaction.quantity}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Total Amount:</span> ${transaction.totalAmount.toFixed(2)}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Status:</span>{" "}
                    <span className="capitalize">{transaction.status}</span>
                  </p>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="mt-8 border-t border-gray-200 pt-8">
                <a
                  href="/event"
                  className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Return to Event Page
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching session:', error);
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">Failed to load transaction details.</p>
        </div>
      </div>
    );
  }
}
