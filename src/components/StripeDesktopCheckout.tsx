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

function InnerDesktopCheckout({ cart, eventId, email, discountCodeId, enabled, amountCents }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Create a fresh PaymentIntent whenever enabled + amount changes
  useEffect(() => {
    let cancelled = false;
    async function createPi() {
      if (!enabled) {
        setClientSecret(null);
        return;
      }
      setCreating(true);
      try {
        const res = await fetch("/api/stripe/payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cart, eventId, email, discountCodeId }),
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
    return () => {
      cancelled = true;
    };
  }, [enabled, amountCents, JSON.stringify(cart), eventId, email, discountCodeId]);

  if (!enabled) return null;
  if (!clientSecret) {
    return (
      <div className="w-full border rounded-lg p-3 text-sm text-gray-600 bg-white">
        {creating ? "Preparing payment…" : "Payment not ready"}
      </div>
    );
  }

  const handleConfirm = async () => {
    if (!stripe || !elements || !clientSecret) return;
    try {
      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: "/event/success", // our success page handles both session and pi flows
        },
      });
      if ((result as any)?.error) {
        console.error("[DESKTOP ECE] confirmPayment error:", (result as any).error);
        alert((result as any).error?.message || "Payment failed. Please try again.");
      }
    } catch (e: any) {
      console.error("[DESKTOP ECE] confirmPayment threw:", e);
      alert(e?.message || "Payment failed. Please try again.");
    }
  };

  // Render Express Checkout Element if available; provide a fallback Pay button using PaymentElement
  return (
    <div className="w-full">
      {/* @ts-ignore - element may lack TS in some versions */}
      <ExpressCheckoutElement
        onConfirm={async () => {
          // With a prepared PI, ExpressCheckout can confirm via confirmPayment on our elements
          await handleConfirm();
        }}
      />

      <div className="mt-3 bg-white border rounded-lg p-3">
        <PaymentElement />
        <button
          type="button"
          onClick={handleConfirm}
          className="mt-3 w-full inline-flex items-center justify-center bg-gradient-to-r from-teal-500 to-green-500 text-white font-bold py-3 px-4 rounded-md hover:from-teal-600 hover:to-green-600"
        >
          Pay now
        </button>
      </div>
    </div>
  );
}

export default function StripeDesktopCheckout(props: Props) {
  const options = useMemo(() => ({
    appearance: { theme: "stripe" },
    // clientSecret is set inside Inner via confirmPayment; Elements can be rendered without it
  }), []);

  if (!props.enabled) {
    return (
      <div role="button" onClick={() => props.onInvalidClick?.()} className="opacity-60 cursor-not-allowed">
        <div className="w-full border rounded-lg p-3 text-sm text-gray-600 bg-white">
          Wallets (Apple/Google/Link) unavailable until form is valid
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={options as any}>
      {/* @ts-ignore */}
      <InnerDesktopCheckout {...props} />
    </Elements>
  );
}


