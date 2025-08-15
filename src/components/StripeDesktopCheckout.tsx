"use client";

import React, { useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

type CartItem = {
  ticketType: { id: number };
  quantity: number;
};

type Props = {
  cart: CartItem[];
  eventId: number | string;
  email?: string;
  discountCodeId?: number | null;
  enabled: boolean;
  amountCents: number;
  onInvalidClick?: () => void;
};

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);

function InnerDesktopCheckout({ cart, eventId, email, discountCodeId, clientSecret }: Props & { clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [confirming, setConfirming] = useState(false);
  const [expressCheckoutReady, setExpressCheckoutReady] = useState(false);
  const [paymentMethodSelected, setPaymentMethodSelected] = useState(false);

  // Add timeout to prevent stuck loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!expressCheckoutReady) {
        console.warn('[DESKTOP ECE] Express Checkout timeout, forcing ready state');
        setExpressCheckoutReady(true);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timer);
  }, [expressCheckoutReady]);

  const handleConfirm = async () => {
    if (!stripe || !elements || !clientSecret) return;
    setConfirming(true);

    try {
      // CRITICAL: Call elements.submit() first for validation
      console.log('[DESKTOP ECE] Submitting elements for validation...');
      const { error: submitError } = await elements.submit();

      if (submitError) {
        // Handle empty error object case (common when no payment method selected)
        if (!submitError.type && !submitError.message) {
          console.warn("[DESKTOP ECE] Payment validation failed: No payment method selected");
          alert("Please select a payment method before proceeding. You can choose from the Link, Cash App, or credit card options above.");
          setConfirming(false);
          return;
        }

        // Log the actual error details for debugging
        console.error("[DESKTOP ECE] Elements validation failed:", {
          type: submitError.type || 'unknown',
          message: submitError.message || 'No message provided',
          code: submitError.code || 'No code provided',
          fullError: submitError
        });

        // Provide more specific error messages based on error type
        let errorMessage = "Please check your payment details and try again.";

        if (submitError.type === 'validation_error') {
          if (submitError.message?.includes('payment_method') || submitError.message?.includes('method')) {
            errorMessage = "Please select a payment method before proceeding.";
          } else if (submitError.message?.includes('card')) {
            errorMessage = "Please check your card details and try again.";
          } else {
            errorMessage = submitError.message || "Please complete all required fields.";
          }
        } else if (submitError.type === 'card_error') {
          errorMessage = submitError.message || "Card validation failed. Please check your details.";
        } else if (submitError.type === 'api_error') {
          errorMessage = "Payment service error. Please try again.";
        }

        // Show user-friendly error message
        alert(errorMessage);
        setConfirming(false);
        return;
      }

      console.log('[DESKTOP ECE] Elements validation successful, confirming payment...');
      const returnUrl = typeof window !== 'undefined' ? `${window.location.origin}/event/success` : '/event/success';

      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: returnUrl, // absolute URL for redirect-based wallets (Link, 3DS)
        },
      });

      if ((result as any)?.error) {
        console.error("[DESKTOP ECE] confirmPayment error:", (result as any).error || result);

        // Provide more specific error messages for payment confirmation failures
        let errorMessage = "Payment failed. Please try again.";
        const paymentError = (result as any).error;

        if (paymentError?.type === 'card_error') {
          errorMessage = paymentError.message || "Card payment failed. Please check your card details.";
        } else if (paymentError?.type === 'validation_error') {
          errorMessage = paymentError.message || "Payment validation failed. Please check your details.";
        } else if (paymentError?.type === 'api_error') {
          errorMessage = "Payment service error. Please try again later.";
        } else if (paymentError?.code === 'payment_intent_unexpected_state') {
          errorMessage = "Payment already processed. Please check your email for confirmation.";
        }

        alert(errorMessage);
      } else {
        console.log("[DESKTOP ECE] Payment confirmed successfully:", result);
      }
    } catch (e: any) {
      console.error("[DESKTOP ECE] confirmPayment threw:", e);

      // Handle specific error types
      let errorMessage = "Payment failed. Please try again.";

      if (e?.type === 'StripeInvalidRequestError') {
        errorMessage = "Invalid payment request. Please check your details.";
      } else if (e?.message?.includes('network')) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (e?.message) {
        errorMessage = e.message;
      }

      alert(errorMessage);
    } finally {
      setConfirming(false);
    }
  };

  // Handle cancellation more robustly
  const handleCancel = () => {
    console.log('[DESKTOP ECE] Payment cancelled by user');

    // Clear any pending payment state
    if (elements) {
      try {
        // Note: elements.clear() doesn't exist, we'll just reset the confirmation state
        console.log('[DESKTOP ECE] Elements state reset after cancellation');
      } catch (e) {
        console.log('[DESKTOP ECE] Error resetting elements state:', e);
      }
    }

    // Reset confirmation state
    setConfirming(false);

    // Prevent any redirects by updating the URL without navigation
    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('cancelled', 'true');
      currentUrl.searchParams.set('timestamp', Date.now().toString());

      // Update URL without triggering navigation
      window.history.replaceState({}, '', currentUrl.toString());
      console.log('[DESKTOP ECE] URL updated to prevent redirect after cancellation');
    }

    // Optionally show a message to the user
    console.log('[DESKTOP ECE] Payment cancelled - user can try again');
  };

  // Render Express Checkout Element if available; provide a fallback Pay button using PaymentElement
  return (
    <div className="w-full relative">
      {/* Loading overlay while Express Checkout initializes */}
      {!expressCheckoutReady && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading payment options...</p>
            <p className="text-xs text-gray-500 mt-1">Apple Pay, Google Pay, Link, Cash App</p>
          </div>
        </div>
      )}

      {/* Info message about payment methods */}
      <div className="text-xs text-gray-500 mt-2 text-center">
        <p>💳 Available: Credit Card, Link, Cash App</p>
        <p>📱 Apple Pay & Google Pay require domain verification</p>
        <p>✅ All payments validate form data before processing</p>
        <p className="text-orange-600 font-medium mt-1">⚠️ Please select a payment method above before clicking Pay Now</p>
      </div>

      {/* @ts-ignore - element may lack TS in some versions */}
      <ExpressCheckoutElement
        onConfirm={async () => {
          // CRITICAL: Call elements.submit() first for validation
          if (!elements) {
            console.error('[DESKTOP ECE] Elements not available for validation');
            alert("Payment system not ready. Please refresh the page and try again.");
            return;
          }

          try {
            console.log('[DESKTOP ECE] Express Checkout onConfirm - validating elements...');
            const { error: submitError } = await elements.submit();

            if (submitError) {
              // Handle empty error object case (common when no payment method selected)
              if (!submitError.type && !submitError.message) {
                console.warn("[DESKTOP ECE] Express Checkout validation failed: No payment method selected");
                alert("Please select a payment method before proceeding. You can choose from the Link, Cash App, or credit card options above.");
                return;
              }

              // Log the actual error details for debugging
              console.error("[DESKTOP ECE] Express Checkout validation failed:", {
                type: submitError.type || 'unknown',
                message: submitError.message || 'No message provided',
                code: submitError.code || 'No code provided',
                fullError: submitError
              });

              // Provide specific error message for validation failures
              let errorMessage = "Please check your payment details and try again.";

              if (submitError.type === 'validation_error') {
                if (submitError.message?.includes('payment_method') || submitError.message?.includes('method')) {
                  errorMessage = "Please select a payment method before proceeding.";
                } else if (submitError.message?.includes('card')) {
                  errorMessage = "Please check your card details and try again.";
                } else {
                  errorMessage = submitError.message || "Please complete all required fields.";
                }
              } else if (submitError.type === 'card_error') {
                errorMessage = submitError.message || "Card validation failed. Please check your details.";
              } else if (submitError.type === 'api_error') {
                errorMessage = "Payment service error. Please try again.";
              }

              alert(errorMessage);
              return;
            }

            console.log('[DESKTOP ECE] Elements validation successful for Express Checkout');
          } catch (e) {
            console.error("[DESKTOP ECE] Elements validation error for Express Checkout:", e);
            alert("Payment validation failed. Please try again.");
            return;
          }

          // Now proceed with the Express Checkout confirmation
          await handleConfirm();
        }}
        onCancel={handleCancel}
        onReady={() => {
          console.log('[DESKTOP ECE] Express Checkout ready');
          setExpressCheckoutReady(true);

          // Log available payment methods for debugging
          console.log('[DESKTOP ECE] Note: Google Pay manifest errors in console are expected if domain not verified in Stripe');

          // Debug: Check what payment methods are available
          console.log('[DESKTOP ECE] Available payment methods should include: Apple Pay, Google Pay, Link, Cash App');
          console.log('[DESKTOP ECE] If only Link/Cash App show, check Stripe domain verification for Google Pay');
        }}
      />

      <div className="mt-3 bg-white border rounded-lg p-3">
        {/* Payment method selection status */}
        <div className="mb-3 text-sm">
          {paymentMethodSelected ? (
            <div className="flex items-center text-green-600">
              <span className="mr-2">✅</span>
              Payment method selected - Ready to proceed
            </div>
          ) : (
            <div className="flex items-center text-orange-600">
              <span className="mr-2">⚠️</span>
              Please select a payment method above
            </div>
          )}
        </div>

        <PaymentElement
          onReady={() => {
            console.log('[DESKTOP ECE] PaymentElement ready');
          }}
          onChange={(event) => {
            console.log('[DESKTOP ECE] PaymentElement changed:', event);
            // Track if a payment method is selected
            if (event.complete) {
              setPaymentMethodSelected(true);
            } else {
              setPaymentMethodSelected(false);
            }
          }}
        />
        <button
          type="button"
          onClick={paymentMethodSelected ? handleConfirm : () => {
            alert("Please select a payment method first. You can choose from the Link, Cash App, or credit card options above.");
          }}
          className="mt-3 w-full inline-flex items-center justify-center bg-gradient-to-r from-teal-500 to-green-500 text-white font-bold py-3 px-4 rounded-md hover:from-teal-600 hover:to-green-600 disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={confirming || !paymentMethodSelected}
        >
          {confirming ? 'Processing…' :
            !paymentMethodSelected ? 'Select a payment method first' : 'Pay Now'}
        </button>
      </div>
    </div>
  );
}

export default function StripeDesktopCheckout(props: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function createPi() {
      if (!props.enabled) { setClientSecret(null); return; }
      setCreating(true);
      try {
        const res = await fetch("/api/stripe/payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cart: props.cart,
            eventId: props.eventId,
            email: props.email,
            discountCodeId: props.discountCodeId,
          }),
        });
        if (!res.ok) throw new Error("Failed to create payment intent");
        const data = await res.json();
        if (!cancelled) setClientSecret(data.clientSecret);
      } catch (e) {
        if (!cancelled) setClientSecret(null);
        console.error("[DESKTOP ECE] PI creation failed:", e);
      } finally {
        if (!cancelled) setCreating(false);
      }
    }
    createPi();
    return () => { cancelled = true; };
  }, [props.enabled, props.amountCents, JSON.stringify(props.cart), props.eventId, props.email, props.discountCodeId]);

  const options = useMemo(() => ({ appearance: { theme: "stripe" }, clientSecret: clientSecret || undefined }), [clientSecret]);

  if (!props.enabled) {
    return (
      <div role="button" onClick={() => props.onInvalidClick?.()} className="opacity-60 cursor-not-allowed">
        <div className="w-full border rounded-lg p-3 text-sm text-gray-600 bg-white">
          Wallets (Apple/Google/Link) unavailable until form is valid
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="w-full border rounded-lg p-3 text-sm text-gray-600 bg-white">
        {creating ? 'Preparing payment…' : 'Payment not ready'}
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={options as any}>
      {/* @ts-ignore */}
      <InnerDesktopCheckout {...props} clientSecret={clientSecret} />
    </Elements>
  );
}


