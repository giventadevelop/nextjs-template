"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentRequestButtonElement, useStripe } from '@stripe/react-stripe-js';

type CartItem = {
  ticketType: { id: number };
  quantity: number;
};

type Props = {
  cart: CartItem[];
  eventId: number | string;
  email?: string;
  discountCodeId?: number | null;
};

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);

function InnerPRB({ cart, eventId, email, discountCodeId }: Props) {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState<stripe.paymentRequest.PaymentRequest | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!stripe) return;

    (async () => {
      try {
        // Ask server for clientSecret (also computes total amount)
        const res = await fetch('/api/stripe/payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cart, eventId, email, discountCodeId }),
        });
        if (!res.ok) return;
        const { clientSecret, amount } = await res.json();
        if (!clientSecret) return;

        // We cannot get exact total without duplicating logic on client; rely on server intent amount at confirm time
        const pr = stripe.paymentRequest({
          country: 'US',
          currency: 'usd',
          total: { label: 'Tickets', amount: typeof amount === 'number' ? amount : 0 },
          requestPayerEmail: true,
        });

        const result = await pr.canMakePayment();
        if (result) {
          pr.on('paymentmethod', async (ev) => {
            try {
              const { error } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: ev.paymentMethod.id,
                receipt_email: ev.payerEmail || email,
              });
              if (error) {
                ev.complete('fail');
              } else {
                ev.complete('success');
                window.location.href = '/event/success';
              }
            } catch {
              ev.complete('fail');
            }
          });
          setPaymentRequest(pr);
          setReady(true);
        } else {
          setPaymentRequest(null);
          setReady(false);
        }
      } catch {
        setPaymentRequest(null);
        setReady(false);
      }
    })();
  }, [stripe, cart, eventId, email, discountCodeId]);

  if (!stripe || !paymentRequest || !ready) return null;
  return <PaymentRequestButtonElement options={{ paymentRequest }} />;
}

export function StripePaymentRequestButton(props: Props) {
  const elementsOptions = useMemo(() => ({ appearance: { theme: 'stripe' } }), []);
  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      {/* @ts-ignore - stripe types at runtime */}
      <InnerPRB {...props} />
    </Elements>
  );
}


