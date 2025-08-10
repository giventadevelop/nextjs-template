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
  const [processing, setProcessing] = useState(false);
  const [canMakePaymentResult, setCanMakePaymentResult] = useState<any>(null);

  useEffect(() => {
    if (!stripe || !enabled) return;

    // Create PR only once per enable window
    const pr = stripe.paymentRequest({
      country: 'US',
      currency: 'usd',
      total: { label: 'Tickets', amount: typeof amountCents === 'number' ? amountCents : 0 },
      requestPayerEmail: true,
    });

    pr.canMakePayment().then((result) => {
      console.log('[PRB] canMakePayment()', result);
      if (!result) {
        setPaymentRequest(null);
        setReady(false);
        setEligible(false);
        return;
      }
      setCanMakePaymentResult(result);
      pr.on('paymentmethod', async (ev) => {
        if (processing) {
          try { ev.complete('fail'); } catch { }
          return;
        }
        setProcessing(true);
        try {
          const isApplePay = !!(canMakePaymentResult && (canMakePaymentResult.applePay || (canMakePaymentResult as any).apple_pay));
          // For Apple Pay on iOS/Safari: immediately complete to prevent sheet timeout
          if (isApplePay) {
            try { ev.complete('success'); } catch { }
          }

          // Use prefetched clientSecret if available to reduce latency
          let secret = clientSecret;
          if (!secret) {
            const res = await fetch('/api/stripe/payment-intent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cart, eventId, email, discountCodeId }),
            });
            if (!res.ok) {
              if (!isApplePay) { try { ev.complete('fail'); } catch { } }
              alert('Unable to start payment. Please try again.');
              setProcessing(false);
              return;
            }
            const data = await res.json();
            secret = data.clientSecret as string;
            if (secret) setClientSecret(secret);
          }
          const { error, paymentIntent } = await stripe.confirmCardPayment(secret, {
            payment_method: ev.paymentMethod.id,
            receipt_email: ev.payerEmail || email,
          });
          if (error) {
            console.error('[PRB] confirmCardPayment error:', {
              message: error.message,
              type: (error as any)?.type,
              code: (error as any)?.code,
              decline_code: (error as any)?.decline_code,
            });
            if (!isApplePay) { try { ev.complete('fail'); } catch { } }
            alert(error.message || 'Payment failed. Please try another method.');
            setProcessing(false);
          } else {
            console.log('[PRB] confirmCardPayment success:', { id: paymentIntent?.id, status: paymentIntent?.status });
            if (!isApplePay) { try { ev.complete('success'); } catch { } }
            const piId = paymentIntent?.id;
            window.location.href = piId ? `/event/success?pi=${encodeURIComponent(piId)}` : '/event/success';
          }
        } catch (e: any) {
          console.error('[PRB] confirmCardPayment thrown:', e);
          const isApplePay = !!(canMakePaymentResult && (canMakePaymentResult.applePay || (canMakePaymentResult as any).apple_pay));
          if (!isApplePay) { try { ev.complete('fail'); } catch { } }
          alert(e?.message || 'Payment failed. Please try again.');
          setProcessing(false);
        }
      });
      setPaymentRequest(pr);
      setReady(true);
      setEligible(true);
    }).catch(() => {
      setPaymentRequest(null);
      setReady(false);
      setEligible(false);
    });

    // No cleanup needed; PR button will be recreated when enabled changes
  }, [stripe, enabled]);

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
        if (typeof data?.amount === 'number') {
          try {
            paymentRequest.update({ total: { label: 'Tickets', amount: data.amount } });
          } catch { }
        }
      } catch { }
    };
    prepare();
  }, [paymentRequest, enabled, cart, eventId, email, discountCodeId, amountCents]);

  // If not ready yet or not enabled, show branded static image placeholder
  const renderPlaceholderImage = (
    <div
      style={{
        position: 'relative',
        borderRadius: 8,
        border: '1px solid #e5e7eb',
        background: '#fff',
        padding: 6,
      }}
      aria-disabled
    >
      <img
        src="/images/both_apple_google_pay_button.png"
        alt="Apple Pay / Google Pay"
        style={{
          width: '100%',
          height: 48,
          objectFit: 'contain',
          borderRadius: 4,
          display: 'block',
        }}
      />
      {/* Non-clickable overlay to indicate disabled state */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'transparent',
          cursor: 'not-allowed',
          borderRadius: 8,
        }}
      />
    </div>
  );

  if (!stripe || !paymentRequest || !ready) {
    return showPlaceholder ? renderPlaceholderImage : null;
  }

  // When enabled, render live PR button

  return (
    <div id="prb-container" style={{ minHeight: 48, display: 'block', position: 'relative' }}>
      <PaymentRequestButtonElement
        options={{
          paymentRequest,
          style: { paymentRequestButton: { theme: 'dark', height: '48px' } },
        }}
      />
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


