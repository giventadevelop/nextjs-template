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
  amountCents?: number; // optional current total for display
};

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);

function InnerPRB({ cart, eventId, email, discountCodeId, enabled, showPlaceholder, amountCents }: Props) {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState<StripePaymentRequest | null>(null);
  const [ready, setReady] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    if (!stripe) return;

    (async () => {
      try {
        // Debug context
        try {
          const host = typeof window !== 'undefined' ? window.location.host : '';
          const key = (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string) || '';
          console.log('[PRB] init', {
            host,
            amount: typeof amountCents === 'number' ? amountCents : 0,
            keyPrefix: key ? key.slice(0, 8) + '…' : 'missing',
            hasClientSecret: !!clientSecret,
          });
        } catch { }

        // We cannot get exact total without duplicating logic on client; rely on server intent amount at confirm time
        const pr = stripe.paymentRequest({
          country: 'US',
          currency: 'usd',
          total: { label: 'Tickets', amount: typeof amountCents === 'number' ? amountCents : 0 },
          requestPayerEmail: true,
        });

        const result = await pr.canMakePayment();
        console.log('[PRB] canMakePayment()', result);
        if (result) {
          pr.on('paymentmethod', async (ev) => {
            try {
              if (!enabled) {
                ev.complete('fail');
                alert('Please enter a valid email and select at least one ticket.');
                return;
              }
              let secret = clientSecret;
              if (!secret) {
                const res = await fetch('/api/stripe/payment-intent', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ cart, eventId, email, discountCodeId }),
                });
                if (!res.ok) {
                  ev.complete('fail');
                  alert('Unable to start payment. Please try again.');
                  return;
                }
                const data = await res.json();
                secret = data.clientSecret;
                setClientSecret(secret || null);
              }
              const { error, paymentIntent } = await stripe.confirmCardPayment(secret as string, {
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
  }, [stripe]);

  // Update total and pre-create client secret when eligible
  useEffect(() => {
    if (!paymentRequest) return;
    try { paymentRequest.update({ total: { label: 'Tickets', amount: typeof amountCents === 'number' ? amountCents : 0 } }); } catch { }
    const prepare = async () => {
      if (!enabled) return;
      try {
        const res = await fetch('/api/stripe/payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cart, eventId, email, discountCodeId }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.clientSecret) setClientSecret(data.clientSecret);
      } catch { }
    };
    prepare();
  }, [paymentRequest, enabled, cart, eventId, email, discountCodeId, amountCents]);

  // Placeholder when not eligible or not ready
  if ((!stripe || !paymentRequest || !ready) && showPlaceholder) {
    return (
      <div
        id="prb-placeholder"
        style={{
          minHeight: 48,
          height: 48,
          borderRadius: 6,
          background: '#000',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          cursor: 'default',
        }}
        aria-disabled
      >
         Pay / G Pay
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


