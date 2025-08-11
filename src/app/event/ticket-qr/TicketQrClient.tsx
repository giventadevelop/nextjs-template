"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingTicket from "../success/LoadingTicket";
import Image from "next/image";
import {
  FaCheckCircle, FaTicketAlt, FaCalendarAlt, FaUser, FaEnvelope,
  FaMoneyBillWave, FaInfoCircle, FaReceipt, FaMapPin, FaClock, FaTags
} from "react-icons/fa";
import { formatInTimeZone } from "date-fns-tz";
import LocationDisplay from '@/components/LocationDisplay';

function formatTime(time: string): string {
  if (!time) return '';
  if (time.match(/AM|PM/i)) return time;
  const [hourStr, minute] = time.split(':');
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour.toString().padStart(2, '0')}:${minute} ${ampm}`;
}

export default function TicketQrClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [qrCodeData, setQrCodeData] = useState<any>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Component initialization debug
  console.log('[MOBILE QR DEBUG] TicketQrClient component mounted');
  console.log('[MOBILE QR DEBUG] User Agent:', typeof window !== 'undefined' ? navigator.userAgent : 'SSR');
  console.log('[MOBILE QR DEBUG] Window dimensions:', typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'SSR');
  console.log('[MOBILE QR DEBUG] Referrer:', typeof window !== 'undefined' ? document.referrer : 'SSR');
  console.log('[MOBILE QR DEBUG] Session storage data:', typeof window !== 'undefined' ? {
    stripe_session_id: sessionStorage.getItem('stripe_session_id'),
    stripe_payment_intent: sessionStorage.getItem('stripe_payment_intent')
  } : 'SSR');

  // Get session_id or payment_intent from URL params or sessionStorage
  const session_id = searchParams?.get('session_id') || 
                    (typeof window !== 'undefined' ? sessionStorage.getItem('stripe_session_id') : null);
  const payment_intent = searchParams?.get('pi') || 
                        (typeof window !== 'undefined' ? sessionStorage.getItem('stripe_payment_intent') : null);
  
  // Determine which identifier to use
  const identifier = session_id || payment_intent;

  // Debug logging for parameter retrieval
  console.log('[TicketQrClient] Parameter retrieval debug:', {
    urlParams: {
      session_id: searchParams?.get('session_id'),
      pi: searchParams?.get('pi')
    },
    sessionStorage: typeof window !== 'undefined' ? {
      stripe_session_id: sessionStorage.getItem('stripe_session_id'),
      stripe_payment_intent: sessionStorage.getItem('stripe_payment_intent')
    } : null,
    finalValues: {
      session_id,
      payment_intent,
      identifier
    },
    currentUrl: typeof window !== 'undefined' ? window.location.href : 'SSR'
  });

  // Helper to get ticket number
  function getTicketNumber(transaction: any) {
    return (
      transaction?.transactionReference ||
      transaction?.transaction_reference ||
      (transaction?.id ? `TKTN${transaction.id}` : '')
    );
  }

  // Call mobile debug endpoint to verify mobile flow is working
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const debugMobile = async () => {
        try {
          console.log('[MOBILE QR DEBUG] Calling mobile debug endpoint...');
          const response = await fetch(`/api/debug/mobile?page=ticket-qr&pi=${payment_intent || 'none'}&session_id=${session_id || 'none'}`);
          const data = await response.json();
          console.log('[MOBILE QR DEBUG] Mobile debug response:', data);
        } catch (error) {
          console.error('[MOBILE QR DEBUG] Mobile debug endpoint error:', error);
        }
      };
      debugMobile();
    }
  }, [session_id, payment_intent]);

  // First, load transaction data
  useEffect(() => {
    if (!identifier) {
      console.error('[MOBILE QR DEBUG] Missing identifier - session_id:', session_id, 'payment_intent:', payment_intent);
      setError('Missing session ID or payment intent');
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function fetchTransactionData() {
      try {
        console.log('[MOBILE QR DEBUG] Starting transaction fetch');
        console.log('[MOBILE QR DEBUG] Fetching transaction data for identifier:', identifier);
        console.log('[MOBILE QR DEBUG] session_id:', session_id);
        console.log('[MOBILE QR DEBUG] payment_intent:', payment_intent);
        console.log('[MOBILE QR DEBUG] URL params:', Object.fromEntries(searchParams?.entries() || []));
        
        // Build the appropriate query parameters
        const queryParams = new URLSearchParams();
        if (session_id) {
          queryParams.set('session_id', session_id);
          console.log('[TicketQrClient] Added session_id to query params');
        } else if (payment_intent) {
          queryParams.set('pi', payment_intent);
          console.log('[TicketQrClient] Added pi to query params');
        }
        queryParams.set('_t', Date.now().toString());
        
        const apiUrl = `/api/event/success/process?${queryParams.toString()}`;
        console.log('[TicketQrClient] Making GET request to:', apiUrl);
        
        // Try to GET the transaction
        const getRes = await fetch(apiUrl, {
          cache: 'no-store'
        });
        
        if (getRes.ok) {
          const data = await getRes.json();
          if (data.transaction && !cancelled) {
            console.log('[TicketQrClient] Transaction data loaded:', data.transaction.id);
            setResult(data);
            setLoading(false);
            return;
          }
        }
        
        // If not found, POST to create it
        const postBody: any = {};
        if (session_id) {
          postBody.session_id = session_id;
          console.log('[TicketQrClient] POST body with session_id:', postBody);
        } else if (payment_intent) {
          postBody.pi = payment_intent;
          console.log('[TicketQrClient] POST body with pi:', postBody);
        }
        
        console.log('[TicketQrClient] Making POST request to create transaction');
        const postRes = await fetch("/api/event/success/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(postBody),
        });
        
        if (!postRes.ok) throw new Error(await postRes.text());
        const postData = await postRes.json();
        
        if (!cancelled) {
          console.log('[MOBILE QR DEBUG] Transaction created:', postData.transaction.id);
          setResult(postData);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('[MOBILE QR DEBUG] Error loading transaction:', err);
          console.error('[MOBILE QR DEBUG] Error details:', {
            message: err?.message,
            stack: err?.stack,
            identifier,
            session_id,
            payment_intent
          });
          setError(err?.message || "Failed to load transaction");
          setLoading(false);
        }
      }
    }
    
    fetchTransactionData();
    return () => { cancelled = true; };
  }, [identifier, session_id, payment_intent]);

  // Second, once transaction is loaded, fetch QR code
  useEffect(() => {
    if (!result?.transaction || qrCodeData) return;
    
    let cancelled = false;
    async function fetchQrCode() {
      try {
        const { transaction, eventDetails } = result;
        console.log('[MOBILE QR DEBUG] Fetching QR code for transaction:', transaction.id);
        console.log('[MOBILE QR DEBUG] Event details:', { id: eventDetails?.id, title: eventDetails?.title });
        
        // Use current window location for emailHostUrlPrefix
        const emailHostUrlPrefix = window.location.origin;
        const encodedEmailHostUrlPrefix = btoa(emailHostUrlPrefix);
        const qrApiUrl = `/api/proxy/events/${eventDetails.id}/transactions/${transaction.id}/emailHostUrlPrefix/${encodedEmailHostUrlPrefix}/qrcode`;
        
        console.log('[MOBILE QR DEBUG] QR API call:', {
          emailHostUrlPrefix,
          encodedEmailHostUrlPrefix,
          qrApiUrl,
          eventId: eventDetails.id,
          transactionId: transaction.id
        });
        
        const qrRes = await fetch(qrApiUrl);
        
        console.log('[MOBILE QR DEBUG] QR response status:', qrRes.status);
        
        if (qrRes.ok) {
          const qrUrl = await qrRes.text();
          if (!cancelled) {
            console.log('[MOBILE QR DEBUG] QR code received:', qrUrl);
            setQrCodeData({ qrCodeImageUrl: qrUrl });
          }
        } else {
          const errorText = await qrRes.text();
          console.error('[MOBILE QR DEBUG] QR fetch failed:', qrRes.status, errorText);
          throw new Error(`QR code fetch failed: ${qrRes.status} - ${errorText}`);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('[MOBILE QR DEBUG] QR code error:', err);
          console.error('[MOBILE QR DEBUG] QR error details:', {
            message: err?.message,
            stack: err?.stack
          });
          setQrError(err?.message || "Failed to load QR code");
        }
      }
    }
    
    fetchQrCode();
    return () => { cancelled = true; };
  }, [result]);

  if (loading) {
    return <LoadingTicket sessionId={identifier || ''} />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center p-4">
        <FaInfoCircle className="text-4xl text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">Error</h1>
        <p className="text-gray-600 mt-2">{error}</p>
        <button 
          onClick={() => router.push('/')}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Return Home
        </button>
      </div>
    );
  }

  const { transaction, userProfile, eventDetails, transactionItems, heroImageUrl: fetchedHeroImageUrl } = result || {};

  if (!transaction) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center p-4">
        <FaInfoCircle className="text-4xl text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">Transaction Not Found</h1>
        <p className="text-gray-600 mt-2">We could not find the details for your transaction.</p>
        <button 
          onClick={() => router.push('/')}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100" style={{ overflowX: 'hidden' }}>
      
      {/* HERO SECTION */}
      <section className="hero-section" style={{
        position: 'relative',
        marginTop: '0',
        backgroundColor: 'transparent',
        minHeight: '400px',
        overflow: 'hidden',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 0 0 0'
      }}>
        <img
          src={fetchedHeroImageUrl || "/images/default_placeholder_hero_image.jpeg"}
          alt="Event Hero"
          className="hero-image"
          style={{
            margin: '0 auto',
            padding: '0',
            display: 'block',
            width: '100%',
            maxWidth: '100%',
            height: 'auto',
            objectFit: 'cover',
            borderRadius: '0'
          }}
        />
      </section>

      {/* Main content container */}
      <div className="max-w-5xl mx-auto px-8 py-8" style={{ marginTop: '80px' }}>
        
        {/* Payment Success Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 ring-4 ring-white -mt-16 mb-4">
              <FaCheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Payment Successful!</h1>
            <p className="mt-2 text-gray-600">
              Thank you for your purchase. Your tickets for <strong>{eventDetails?.title}</strong> are confirmed.<br />
              A confirmation is sent to your email: <strong>{transaction.email}</strong>
            </p>
          </div>
        </div>

        {/* Event Details Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
            {eventDetails?.title}
          </h2>
          {eventDetails?.caption && (
            <div className="text-lg text-teal-700 font-semibold mb-4">{eventDetails.caption}</div>
          )}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-gray-600 mb-4">
            <div className="flex items-center gap-2">
              <FaCalendarAlt />
              <span>{formatInTimeZone(eventDetails?.startDate, eventDetails?.timezone, 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <FaClock />
              <span>
                {formatTime(eventDetails?.startTime)}{eventDetails?.endTime ? ` - ${formatTime(eventDetails.endTime)}` : ''}
                {' '}
                ({formatInTimeZone(eventDetails?.startDate, eventDetails?.timezone, 'zzz')})
              </span>
            </div>
            {eventDetails?.location && (
              <div className="flex items-center gap-2">
                <LocationDisplay location={eventDetails.location} />
              </div>
            )}
          </div>
          {eventDetails?.description && <p className="text-gray-700 text-base">{eventDetails.description}</p>}
        </div>

        {/* QR Code Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 text-center">
          {!qrCodeData && !qrError && (
            <div className="text-lg text-teal-700 font-semibold flex items-center justify-center gap-2">
              <FaTicketAlt className="animate-bounce" />
              Please wait while your tickets are created…
            </div>
          )}
          {qrError && (
            <div className="text-red-500 font-semibold">{qrError}</div>
          )}
          {qrCodeData && (
            <>
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="text-lg font-semibold text-gray-800">Your Ticket QR Code</div>
                {qrCodeData.qrCodeImageUrl ? (
                  <img 
                    src={qrCodeData.qrCodeImageUrl} 
                    alt="Ticket QR Code" 
                    className="mx-auto w-48 h-48 object-contain border border-gray-300 rounded-lg shadow" 
                  />
                ) : (
                  <div className="text-gray-500">QR code not available.</div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Transaction Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-3 mb-6">
            <FaReceipt className="text-teal-500" />
            Transaction Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {getTicketNumber(transaction) && (
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1"><FaTicketAlt /> Ticket #</label>
                <p className="text-lg text-gray-800 font-medium">{getTicketNumber(transaction)}</p>
              </div>
            )}
            {transaction.firstName && (
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1"><FaUser /> Name</label>
                <p className="text-lg text-gray-800 font-medium">{transaction.firstName}</p>
              </div>
            )}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1"><FaEnvelope /> Email</label>
              <p className="text-lg text-gray-800 font-medium">{transaction.email}</p>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1"><FaCalendarAlt /> Date of Purchase</label>
              <p className="text-lg text-gray-800 font-medium">{new Date(transaction.purchaseDate).toLocaleString()}</p>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1"><FaMoneyBillWave /> Amount Paid</label>
              <p className="text-lg text-gray-800 font-medium">${(transaction.finalAmount ?? transaction.totalAmount ?? 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <button 
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}