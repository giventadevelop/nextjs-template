"use client";
import { useEffect, useRef, useState } from "react";
import LoadingTicket from "./LoadingTicket";
import Image from "next/image";
import {
  FaCheckCircle, FaTicketAlt, FaCalendarAlt, FaUser, FaEnvelope,
  FaMoneyBillWave, FaInfoCircle, FaReceipt, FaMapPin, FaClock, FaTags
} from "react-icons/fa";
import { formatInTimeZone } from "date-fns-tz";
import LocationDisplay from '@/components/LocationDisplay';
import { useRouter, useSearchParams } from 'next/navigation';

interface SuccessClientProps {
  session_id: string;
}

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

export default function SuccessClient({ session_id }: SuccessClientProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [readyToShowNotFound, setReadyToShowNotFound] = useState(false);
  const qrPollingStartedRef = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Hero image is handled by the HydrationSafeHeroImage component

  // Check if we were redirected due to already processed payment
  useEffect(() => {
    const paymentStatus = searchParams?.get('payment');
    if (paymentStatus === 'already-processed') {
      console.log('User was redirected due to already processed payment');
      // You could show a toast or notification here if needed
    }
  }, [searchParams]);

  // Handle refresh detection - only redirect on actual refresh attempts
  useEffect(() => {
    const url = new URL(window.location.href);
    const pi = url.searchParams.get('pi');

    // Use either session_id or pi for tracking
    const identifier = session_id || pi;
    if (!identifier) return;

    const completedKey = `success_completed_${identifier}`;

    // Check if this transaction was already completed and we're seeing it again
    const wasCompleted = sessionStorage.getItem(completedKey);

    // Only redirect if we're sure this is a refresh AND the transaction was previously completed
    if (wasCompleted) {
      // Use a more conservative approach - only redirect if it's clearly a refresh
      const isDefiniteRefresh = (
        performance.navigation?.type === 1 || // Modern browsers: 1 = TYPE_RELOAD
        (performance as any).navigation?.type === 'reload' // Some browsers use string
      );

      // Add a delay to ensure it's not just a quick navigation
      if (isDefiniteRefresh) {
        console.log('Success page refresh detected after completion - redirecting to home');
        setTimeout(() => {
          window.location.replace('/?payment=already-processed');
        }, 100);
        return;
      } else {
        console.log('Success page revisited but not a refresh - allowing access');
      }
    }

    console.log('Success page accessed for:', identifier);
  }, [session_id]);

  // Enhanced back button prevention
  useEffect(() => {
    console.log('Setting up enhanced navigation prevention...');

    // Check if we're on a Stripe URL and redirect
    if (window.location.href.includes('checkout.stripe.com')) {
      console.log('Detected Stripe URL - redirecting to home');
      window.location.replace('/');
      return;
    }

    // Enhanced back button prevention
    const handlePopState = (e: PopStateEvent) => {
      console.log('Back button detected - preventing navigation and redirecting to home');
      e.preventDefault();
      window.location.replace('/');
    };

    // Handle page reload attempts - redirect to home instead
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Let the refresh detection in the other useEffect handle this
      console.log('Page unload detected - refresh detection will handle redirect');
    };

    // Enhanced keydown prevention for F5 and Ctrl+R
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
        console.log('Refresh attempt detected - preventing');
        e.preventDefault();
        window.location.replace('/');
        return false;
      }
    };

    // Add event listeners
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Push current state to prevent back navigation
    window.history.pushState(null, '', window.location.href);
    window.history.pushState(null, '', window.location.href);

    console.log('Enhanced navigation prevention setup complete');

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Helper to get ticket number from either camelCase or snake_case, or fallback to 'TKTN'+id
  function getTicketNumber(transaction: any) {
    return (
      transaction?.transactionReference ||
      transaction?.transaction_reference ||
      (transaction?.id ? `TKTN${transaction.id}` : '')
    );
  }

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      const isMobile = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
      console.log('[Success Debug] Starting fetchData on:', { isMobile, session_id });
      
      setLoading(true);
      setError(null);
      setReadyToShowNotFound(false);
      try {
        const url = new URL(window.location.href);
        const pi = url.searchParams.get('pi');
        // 1. Try to GET the transaction by session_id or pi (idempotency)
        const qs = session_id ? `session_id=${encodeURIComponent(session_id)}` : (pi ? `pi=${encodeURIComponent(pi)}` : '');
        console.log('[QR Debug] Fetching success data with URL:', `/api/event/success/process?${qs}`);
        const getRes = await fetch(`/api/event/success/process?${qs}`);
        console.log('[QR Debug] Initial fetch response:', { status: getRes.status, ok: getRes.ok });
        if (getRes.ok) {
          const data = await getRes.json();
          console.log('[QR Debug] Success data received:', {
            hasTransaction: !!data.transaction,
            hasQrCode: !!data.qrCodeData,
            qrCodeData: data.qrCodeData
          });
          if (data.transaction) {
            if (!cancelled) {
              setResult(data);
              // Hero image is handled by HydrationSafeHeroImage component

              // Mark as completed if we have QR code already
              if (data.qrCodeData && (data.qrCodeData.qrCodeImageUrl || data.qrCodeData.qrCodeData)) {
                const url = new URL(window.location.href);
                const pi = url.searchParams.get('pi');
                const identifier = session_id || pi;
                if (identifier) {
                  const completedKey = `success_completed_${identifier}`;
                  sessionStorage.setItem(completedKey, 'true');
                  console.log('[Success Debug] Marked transaction as completed with QR:', identifier);
                }
              }
            }
            console.log('[Success Debug] Setting loading to false - transaction found immediately');
            setLoading(false);
            return;
          }
        }
        // 2a. If PI path: poll a few times to allow webhook to create
        if (pi && !session_id) {
          // Poll up to ~30s because webhook + fee patch may take time in prod
          const maxTries = 20; // 20 * 1.5s ≈ 30s
          for (let i = 0; i < maxTries; i++) {
            if (cancelled) break;
            await new Promise(res => setTimeout(res, 1500));
            const pollRes = await fetch(`/api/event/success/process?pi=${encodeURIComponent(pi)}`);
            if (pollRes.ok) {
              const data = await pollRes.json();
              if (data.transaction) {
                if (!cancelled) {
                  setResult(data);

                  // Mark as completed if we have QR code
                  if (data.qrCodeData && (data.qrCodeData.qrCodeImageUrl || data.qrCodeData.qrCodeData)) {
                    const completedKey = `success_completed_${pi}`;
                    sessionStorage.setItem(completedKey, 'true');
                    console.log('[Success Debug] Marked PI transaction as completed with QR:', pi);
                  }
                }
                setLoading(false);
                return;
              }
            }
          }
          // Exhausted polling without a transaction
          setReadyToShowNotFound(true);
        }
        // 2b. If not found and session_id exists, POST to create it (Checkout session only)
        if (session_id) {
          const postRes = await fetch("/api/event/success/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id }),
          });
          if (!postRes.ok) throw new Error(await postRes.text());
          const postData = await postRes.json();
          if (!cancelled) {
            setResult(postData);
            // Hero image is handled by HydrationSafeHeroImage component

            // Mark as completed if we have QR code
            if (postData.qrCodeData && (postData.qrCodeData.qrCodeImageUrl || postData.qrCodeData.qrCodeData)) {
              const completedKey = `success_completed_${session_id}`;
              sessionStorage.setItem(completedKey, 'true');
              console.log('[Success Debug] Marked session transaction as completed with QR:', session_id);
            }
          }
        }
        // If we reach here without a transaction, mark ready to show not found
        setReadyToShowNotFound(true);
      } catch (err: any) {
        if (!cancelled) {
          console.error('[Success Debug Mobile] Error in fetchData:', {
            error: err?.message || "Unknown error",
            isMobile: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent),
            stack: err?.stack,
            sessionId: session_id
          });
          setError(err?.message || "Unknown error");
        }
      } finally {
        if (!cancelled) {
          const isMobile = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
          console.log('[Success Debug Mobile] Setting loading to false in finally block:', {
            isMobile,
            sessionId: session_id,
            hadError: !!error
          });
          setLoading(false);
        }
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [session_id]);

  // Poll specifically for QR code after transaction exists (mobile-safe, single loop with backoff)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (qrPollingStartedRef.current) return; // prevent duplicate loops on mobile re-renders
      if (!result?.transaction || result?.qrCodeData) return;
      qrPollingStartedRef.current = true;
      const url = new URL(window.location.href);
      const pi = url.searchParams.get('pi');
      const qs = session_id ? `session_id=${encodeURIComponent(session_id)}` : (pi ? `pi=${encodeURIComponent(pi)}` : '');
      // Exponential-ish backoff to avoid hammering (approx total ~60s for mobile)
      const delays = [1000, 2000, 3000, 5000, 8000, 12000, 15000, 20000];
      
      // Check if this is mobile
      const isMobile = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
      console.log('[QR Debug Mobile] Device detection:', { 
        isMobile, 
        userAgent: navigator.userAgent.substring(0, 100),
        screen: { width: window.screen.width, height: window.screen.height },
        viewport: { width: window.innerWidth, height: window.innerHeight },
        connectionType: (navigator as any).connection?.effectiveType || 'unknown'
      });

      console.log('[QR Debug Mobile] Starting QR code polling for:', { 
        transactionId: result.transaction.id, 
        eventId: result.eventDetails?.id,
        isMobile,
        sessionId: session_id,
        pi: pi,
        queryString: qs
      });

      for (let i = 0; i < delays.length; i++) {
        if (cancelled) {
          console.log('[QR Debug Mobile] Polling cancelled at attempt:', i + 1);
          break;
        }
        
        console.log(`[QR Debug Mobile] Starting attempt ${i + 1}/${delays.length} after ${delays[i]}ms delay`);
        await new Promise(res => setTimeout(res, delays[i]));

        try {
          const startTime = Date.now();
          const res = await fetch(`/api/event/success/process?${qs}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'X-Mobile-Request': isMobile ? 'true' : 'false'
            }
          });
          const fetchTime = Date.now() - startTime;

          console.log(`[QR Debug Mobile] Fetch completed in ${fetchTime}ms:`, {
            attempt: i + 1, 
            delayMs: delays[i],
            status: res.status,
            ok: res.ok,
            fetchTimeMs: fetchTime,
            headers: Object.fromEntries(res.headers.entries())
          });

          if (res.ok) {
            const data = await res.json();
            console.log('[QR Debug Mobile] QR poll response data:', {
              attempt: i + 1, 
              hasTransaction: !!data?.transaction,
              hasEventDetails: !!data?.eventDetails,
              hasQrCode: !!data?.qrCodeData,
              qrData: data?.qrCodeData,
              transactionId: data?.transaction?.id,
              eventId: data?.eventDetails?.id
            });

            if (data?.qrCodeData && (data.qrCodeData.qrCodeImageUrl || data.qrCodeData.qrCodeData)) {
              console.log('[QR Debug Mobile] QR code found! Setting result and breaking loop:', {
                qrCodeImageUrl: data.qrCodeData.qrCodeImageUrl,
                hasQrCodeData: !!data.qrCodeData.qrCodeData,
                attempt: i + 1,
                isMobile
              });
              
              if (!cancelled) {
                setResult((prev: any) => {
                  const updated = { ...(prev || {}), ...data };
                  console.log('[QR Debug Mobile] Updated result state:', {
                    hasQrCode: !!updated.qrCodeData,
                    transactionId: updated.transaction?.id
                  });
                  return updated;
                });

                // Mark as completed now that we have QR code
                const url = new URL(window.location.href);
                const pi = url.searchParams.get('pi');
                const identifier = session_id || pi;
                if (identifier) {
                  const completedKey = `success_completed_${identifier}`;
                  sessionStorage.setItem(completedKey, 'true');
                  console.log('[QR Debug Mobile] Marked transaction as completed:', identifier);
                }
              }
              break;
            } else {
              console.log(`[QR Debug Mobile] QR code not ready yet on attempt ${i + 1}/${delays.length}`);
            }
          } else {
            const errorText = await res.text();
            console.warn(`[QR Debug Mobile] QR poll failed on attempt ${i + 1}:`, {
              status: res.status,
              statusText: res.statusText,
              errorText,
              fetchTimeMs: fetchTime
            });
          }
        } catch (error) {
          console.error(`[QR Debug Mobile] QR poll error on attempt ${i + 1}:`, {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            isMobile
          });
        }
      }

      if (!cancelled) {
        console.log('[QR Debug Mobile] QR polling completed - all attempts exhausted:', {
          totalAttempts: delays.length,
          isMobile,
          hasResult: !!result,
          hasQrCode: !!result?.qrCodeData
        });
      }
    })();
    return () => { 
      cancelled = true;
      console.log('[QR Debug Mobile] Cleanup: QR polling effect cancelled');
    };
  }, [result?.transaction, session_id]);

  if (loading) {
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
    console.log('[Success Debug Mobile] Showing LoadingTicket - loading state true:', {
      isMobile,
      sessionId: session_id,
      hasResult: !!result,
      hasTransaction: !!result?.transaction,
      hasQrCode: !!result?.qrCodeData,
      hasEventDetails: !!result?.eventDetails,
      readyToShowNotFound
    });
    return <LoadingTicket sessionId={session_id} />;
  }
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center p-4">
        <FaInfoCircle className="text-4xl text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">Error</h1>
        <p className="text-gray-600 mt-2">{error}</p>
      </div>
    );
  }
  const { transaction, userProfile, eventDetails, qrCodeData, transactionItems, heroImageUrl: fetchedHeroImageUrl } = result || {};

  // Clear hero image storage since we're on success page
  if (fetchedHeroImageUrl) {
    // Don't update heroImageUrl state, handled by component
    // Clear storage since we have the actual data now
    sessionStorage.removeItem('eventHeroImageUrl');
    sessionStorage.removeItem('eventId');
    localStorage.removeItem('eventHeroImageUrl');
    localStorage.removeItem('eventId');
  }
  if (!transaction && !readyToShowNotFound) {
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
    console.log('[Success Debug Mobile] Showing LoadingTicket - no transaction and not ready for not found:', {
      isMobile,
      sessionId: session_id,
      hasTransaction: !!transaction,
      readyToShowNotFound,
      hasResult: !!result
    });
    return <LoadingTicket sessionId={session_id} />;
  }
  if (!transaction && readyToShowNotFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center p-4">
        <FaInfoCircle className="text-4xl text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">Transaction Not Found</h1>
        <p className="text-gray-600 mt-2">We could not find the details for your transaction. Please check your email for a confirmation.</p>
      </div>
    );
  }
  // If we have a transaction but eventDetails not ready yet, keep showing loading UI
  if (transaction && !eventDetails?.id && !readyToShowNotFound) {
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
    console.log('[Success Debug Mobile] Showing LoadingTicket - have transaction but no event details:', {
      isMobile,
      sessionId: session_id,
      hasTransaction: !!transaction,
      hasEventDetails: !!eventDetails?.id,
      eventDetailsId: eventDetails?.id,
      readyToShowNotFound
    });
    return <LoadingTicket sessionId={session_id} />;
  }
  // If we have transaction and event details but QR code not ready yet, keep loading
  // Don't show "not found" until we've exhausted all attempts
  if (transaction && eventDetails?.id && !qrCodeData) {
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
    console.log('[Success Debug Mobile] Showing LoadingTicket - have transaction and event details but no QR code:', {
      isMobile,
      sessionId: session_id,
      hasTransaction: !!transaction,
      transactionId: transaction?.id,
      hasEventDetails: !!eventDetails?.id,
      eventId: eventDetails?.id,
      hasQrCode: !!qrCodeData,
      qrCodeData: qrCodeData,
      qrPollingStarted: qrPollingStartedRef.current
    });
    return <LoadingTicket sessionId={session_id} />;
  }
  if (!eventDetails?.id && readyToShowNotFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center p-4">
        <FaInfoCircle className="text-4xl text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">Event Details Not Found</h1>
        <p className="text-gray-600 mt-2">We could not find the event details for your transaction.</p>
      </div>
    );
  }
  const displayName = transaction?.firstName || '';
  let qrError: string | null = null;
  // If qrCodeData is an error object, handle it
  if (qrCodeData && qrCodeData.error) qrError = qrCodeData.error;

  // Log successful page render
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
  console.log('[Success Debug Mobile] Rendering main success page:', {
    isMobile,
    sessionId: session_id,
    hasTransaction: !!transaction,
    transactionId: transaction?.id,
    hasEventDetails: !!eventDetails?.id,
    eventId: eventDetails?.id,
    hasQrCode: !!qrCodeData,
    displayName,
    qrError
  });

  return (
    <div className="min-h-screen bg-gray-100" style={{ overflowX: 'hidden' }}>

      {/* HERO SECTION - Full width bleeding to header */}
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
        <div className="hero-overlay" style={{ opacity: 0.1, height: '5px', padding: '20' }}></div>
      </section>

      {/* Responsive Hero Image CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .hero-image {
            width: 100%;
            max-width: 100%;
            height: auto;
            object-fit: cover;
            object-position: center;
            display: block;
            margin: 0 auto;
            padding: 0;
            border-radius: 0;
          }

          .hero-section {
            min-height: 15vh;
            background-color: transparent !important;
            padding: 80px 0 0 0 !important;
            width: 100% !important;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }

          @media (max-width: 768px) {
            .hero-image {
              width: 100%;
              max-width: 100%;
              height: auto;
              padding: 0;
              border-radius: 0;
            }

            .hero-section {
              padding: 80px 0 0 0 !important;
              min-height: 12vh !important;
            }
          }

          @media (max-width: 480px) {
            .hero-image {
              width: 100%;
              padding: 0;
              border-radius: 0;
            }

            .hero-section {
              padding: 80px 0 0 0 !important;
              min-height: 10vh !important;
            }
          }
        `
      }} />

      {/* Main content container - ui_style_guide.mdc compliant */}
      <div className="max-w-5xl mx-auto px-8 py-8" style={{ marginTop: '80px' }}>
        {/* Enhanced Warning Message */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <FaInfoCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Important:</strong> Please do not refresh this page, use the back button, or press F5.
                Your payment has been processed successfully. If you need to return to the home page,
                use the navigation menu above. Any attempt to refresh or go back will redirect you to the homepage.
              </p>
            </div>
          </div>
        </div>

        {/* Payment Success Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 ring-4 ring-white -mt-16 mb-4">
              <FaCheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Payment Successful!</h1>
            <p className="mt-2 text-gray-600">
              Thank you for your purchase. Your tickets for <strong>{eventDetails.title}</strong> are confirmed.<br />
              A confirmation is sent to your email: <strong>{transaction.email}</strong>
            </p>
          </div>
        </div>

        {/* Event Details Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
            {eventDetails.title}
          </h2>
          {eventDetails.caption && (
            <div className="text-lg text-teal-700 font-semibold mb-4">{eventDetails.caption}</div>
          )}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-gray-600 mb-4">
            <div className="flex items-center gap-2">
              <FaCalendarAlt />
              <span>{formatInTimeZone(eventDetails.startDate, eventDetails.timezone, 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <FaClock />
              <span>
                {formatTime(eventDetails.startTime)}{eventDetails.endTime ? ` - ${formatTime(eventDetails.endTime)}` : ''}
                {' '}
                ({formatInTimeZone(eventDetails.startDate, eventDetails.timezone, 'zzz')})
              </span>
            </div>
            {eventDetails.location && (
              <div className="flex items-center gap-2">
                <LocationDisplay location={eventDetails.location} />
              </div>
            )}
          </div>
          {eventDetails.description && <p className="text-gray-700 text-base">{eventDetails.description}</p>}
        </div>

        {/* QR Code Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 text-center">
          {!qrCodeData && !qrError && (
            <div className="text-lg text-teal-700 font-semibold flex items-center justify-center gap-2">
              <FaTicketAlt className="animate-bounce" />
              Please wait while your QR code is being generated…
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
                  <img src={qrCodeData.qrCodeImageUrl} alt="Ticket QR Code" className="mx-auto w-48 h-48 object-contain border border-gray-300 rounded-lg shadow" />
                ) : qrCodeData.qrCodeData ? (
                  <div className="bg-gray-100 p-4 rounded text-xs break-all max-w-full">{qrCodeData.qrCodeData}</div>
                ) : (
                  <div className="text-gray-500">QR code not available at this time. Please check your email for your ticket.</div>
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
            {displayName && (
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1"><FaUser /> Name</label>
                <p className="text-lg text-gray-800 font-medium">{displayName}</p>
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
            {transaction.discountAmount && transaction.discountAmount > 0 && (
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1"><FaTags /> Discount Applied</label>
                <p className="text-lg text-green-600 font-medium">-${transaction.discountAmount.toFixed(2)}</p>
              </div>
            )}
            {transaction.discountAmount && transaction.discountAmount > 0 && (
              <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Price Breakdown</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Original Amount:</span>
                    <span className="text-gray-800">${(transaction.totalAmount ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount:</span>
                    <span className="text-green-600">-${transaction.discountAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span className="text-gray-800 font-semibold">Final Amount:</span>
                    <span className="text-gray-800 font-semibold">${(transaction.finalAmount ?? transaction.totalAmount ?? 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Transaction Item Breakdown */}
        {transactionItems && transactionItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-3 mb-6">
              <FaTicketAlt className="text-teal-500" />
              Ticket Breakdown
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Ticket Type</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Quantity</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Price Per Unit</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactionItems.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2">{item.ticketTypeName || `Ticket Type #${item.ticketTypeId}`}</td>
                      <td className="px-4 py-2">{item.quantity}</td>
                      <td className="px-4 py-2">${item.pricePerUnit.toFixed(2)}</td>
                      <td className="px-4 py-2">${item.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}