"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentRequestButtonElement, useStripe } from '@stripe/react-stripe-js';
import type { PaymentRequest as StripePaymentRequest, StripeElementsOptions } from '@stripe/stripe-js';

type CartItem = {
  ticketType: { id: number };
  quantity: number;
};

type Props = {
  cart: CartItem[];
  eventId: number | string;
  email?: string;
  discountCodeId?: number | null;
  enabled: boolean; // whether fields are valid; when false, we show disabled overlay/placeholder
  showPlaceholder?: boolean; // show a disabled-looking placeholder if not eligible yet
};

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);

function InnerPRB({ cart, eventId, email, discountCodeId, enabled, showPlaceholder }: Props) {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState<StripePaymentRequest | null>(null);
  const [ready, setReady] = useState(false);
  const [eligible, setEligible] = useState(false);

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

        // Debug context
        try {
          const host = typeof window !== 'undefined' ? window.location.host : '';
          const key = (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string) || '';
          console.log('[PRB] init', {
            host,
            amount,
            keyPrefix: key ? key.slice(0, 8) + '…' : 'missing',
            hasClientSecret: !!clientSecret,
          });
        } catch { }

        // We cannot get exact total without duplicating logic on client; rely on server intent amount at confirm time
        const pr = stripe.paymentRequest({
          country: 'US',
          currency: 'usd',
          total: { label: 'Tickets', amount: typeof amount === 'number' ? amount : 0 },
          requestPayerEmail: true,
        });

        const result = await pr.canMakePayment();
        console.log('[PRB] canMakePayment()', result);
        if (result) {
          pr.on('paymentmethod', async (ev) => {
            try {
              const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: ev.paymentMethod.id,
                receipt_email: ev.payerEmail || email,
              });
              if (error) {
                ev.complete('fail');
              } else {
                ev.complete('success');
                const piId = paymentIntent?.id;
                if (piId) {
                  window.location.href = `/event/success?pi=${encodeURIComponent(piId)}`;
                } else {
                  window.location.href = '/event/success';
                }
              }
            } catch {
              ev.complete('fail');
            }
          });
          setPaymentRequest(pr);
          setReady(true);
          setEligible(true);
          console.log('[PRB] button rendered');
        } else {
          setPaymentRequest(null);
          setReady(false);
          setEligible(false);
          console.warn('[PRB] not eligible (no Apple/Google Pay available for this device/browser/domain)');
        }
      } catch {
        setPaymentRequest(null);
        setReady(false);
        setEligible(false);
        console.error('[PRB] failed to initialize');
      }
    })();
  }, [stripe, cart, eventId, email, discountCodeId]);

  // Placeholder when not eligible or not ready
  if ((!stripe || !paymentRequest || !ready) && showPlaceholder) {
    return (
      <div
        id="prb-placeholder"
        style={{
          minHeight: 48,
          height: 48,
          borderRadius: 6,
          background: '#e5e7eb',
          color: '#6b7280',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          cursor: 'not-allowed',
        }}
        aria-disabled
      >
        Apple/Google Pay
      </div>
    );
  }

  if (!stripe || !paymentRequest || !ready) return null;

  return (
    <div id="prb-container" style={{ minHeight: 48, display: 'block', position: 'relative' }}>
      <PaymentRequestButtonElement
        options={{
          paymentRequest,
          style: { paymentRequestButton: { theme: 'dark', height: '48px' } },
        }}
      />
      {!enabled && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.5)',
            borderRadius: 6,
            cursor: 'not-allowed',
          }}
          aria-hidden
        />
      )}
    </div>
  );
}

export function StripePaymentRequestButton(props: Props) {
  const elementsOptions = useMemo<StripeElementsOptions>(() => ({ appearance: { theme: 'stripe' } }), []);
  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      {/* @ts-ignore - stripe types at runtime */}
      <InnerPRB {...props} />
    </Elements>
  );
}


