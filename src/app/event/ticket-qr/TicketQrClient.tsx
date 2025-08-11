'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FaCalendarAlt, FaMapMarkerAlt, FaClock, FaTicketAlt, FaDollarSign, FaArrowLeft, FaDownload, FaSpinner } from 'react-icons/fa';
import { formatInTimeZone } from 'date-fns-tz';

interface QrGenerationData {
  sessionId?: string;
  paymentIntent?: string;
  transaction: any;
  eventDetails: any;
  transactionItems: any[];
  heroImageUrl: string;
  needsGeneration?: boolean;
}

export function TicketQrClient() {
  const [generationData, setGenerationData] = useState<QrGenerationData | null>(null);
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const generationStartedRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    // Retrieve generation data from sessionStorage
    try {
      const storedData = sessionStorage.getItem('mobileQrGeneration');
      if (!storedData) {
        setError('No ticket data found. Please return to the success page.');
        setLoading(false);
        return;
      }

      const parsedData = JSON.parse(storedData);
      console.log('[QR Display] Retrieved generation data from sessionStorage:', parsedData);
      
      setGenerationData(parsedData);
      setLoading(false);
      
      // Clear the sessionStorage data after successful retrieval
      sessionStorage.removeItem('mobileQrGeneration');
      
      // Start QR generation if needed
      if (parsedData.needsGeneration) {
        console.log('[QR Display] Starting QR generation process');
        setTimeout(() => {
          startQrGeneration(parsedData);
        }, 2000); // 2 second delay to let page load
      }
    } catch (err) {
      console.error('[QR Display] Error retrieving generation data:', err);
      setError('Failed to load ticket data.');
      setLoading(false);
    }
  }, []);

  const startQrGeneration = async (data: QrGenerationData) => {
    if (generationStartedRef.current) {
      console.log('[QR Display] Generation already started, skipping');
      return;
    }
    generationStartedRef.current = true;
    setGenerating(true);
    setGenerationError(null);

    try {
      console.log('[QR Display] Starting QR code generation for mobile:', {
        transactionId: data.transaction.id,
        eventId: data.eventDetails?.id
      });

      const directUrl = `/api/proxy/events/${data.eventDetails.id}/transactions/${data.transaction.id}/emailHostUrlPrefix/${Buffer.from(window.location.origin).toString('base64')}/qrcode`;
      console.log('[QR Display] Making QR request to:', directUrl);

      // Add timeout for QR generation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('[QR Display] QR request timeout');
        controller.abort();
      }, 20000); // 20 second timeout

      const qrResponse = await fetch(directUrl, {
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Mobile-Request': 'true',
          'X-QR-Page-Generation': 'true'
        }
      });

      clearTimeout(timeoutId);

      if (qrResponse.ok) {
        const qrUrl = await qrResponse.text();
        console.log('[QR Display] QR response received:', qrUrl);
        
        if (qrUrl && qrUrl.trim() && (qrUrl.startsWith('http') || qrUrl.startsWith('data:'))) {
          console.log('[QR Display] QR code generated successfully:', qrUrl);
          setQrCodeImageUrl(qrUrl.trim());
        } else {
          console.log('[QR Display] Invalid QR URL received:', qrUrl);
          setGenerationError('Invalid QR code received from server. Please check your email for the QR code.');
        }
      } else {
        console.log('[QR Display] QR request failed with status:', qrResponse.status);
        const errorText = await qrResponse.text();
        setGenerationError(`QR generation failed (${qrResponse.status}). Please check your email for the QR code.`);
      }
    } catch (error: any) {
      console.error('[QR Display] QR generation error:', error);
      if (error.name === 'AbortError') {
        setGenerationError('QR generation timed out. Please check your email for the QR code.');
      } else {
        setGenerationError('Failed to generate QR code. Please check your email for the QR code.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleGoBack = () => {
    router.push('/');
  };

  const handleDownloadQr = () => {
    if (!qrCodeImageUrl) {
      alert('No QR code available to download. Please check your email for the QR code.');
      return;
    }
    
    try {
      // Create a link to download the QR code
      const link = document.createElement('a');
      link.href = qrCodeImageUrl;
      link.download = `ticket-qr-${generationData?.transaction?.id || 'code'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('[QR Display] Download error:', error);
      alert('Failed to download QR code. Please try again or check your email.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-lg text-gray-600">Loading your ticket...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Ticket</h2>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={handleGoBack}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md flex items-center gap-2 mx-auto"
              >
                <FaArrowLeft />
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!generationData) {
    return null;
  }

  const { transaction, eventDetails, transactionItems, heroImageUrl } = generationData;

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleGoBack}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md flex items-center gap-2"
          >
            <FaArrowLeft />
            Back to Home
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Your Ticket</h1>
          <button
            onClick={handleDownloadQr}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
          >
            <FaDownload />
            Download QR
          </button>
        </div>

        {/* Event Hero Image */}
        {heroImageUrl && (
          <div className="mb-6">
            <Image
              src={heroImageUrl}
              alt={eventDetails?.name || 'Event'}
              width={800}
              height={300}
              className="w-full h-48 object-cover rounded-lg shadow-sm"
            />
          </div>
        )}

        {/* Event Details */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">{eventDetails?.name || 'Event'}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {eventDetails?.startDate && eventDetails?.timezone && (
              <div className="flex items-center gap-2 text-gray-600">
                <FaCalendarAlt />
                <span>
                  {formatInTimeZone(eventDetails.startDate, eventDetails.timezone, 'EEEE, MMMM d, yyyy (zzz)')}
                </span>
              </div>
            )}
            
            {eventDetails?.startTime && (
              <div className="flex items-center gap-2 text-gray-600">
                <FaClock />
                <span>{eventDetails.startTime}</span>
              </div>
            )}
            
            {eventDetails?.venue && (
              <div className="flex items-center gap-2 text-gray-600">
                <FaMapMarkerAlt />
                <span>{eventDetails.venue}</span>
              </div>
            )}
            
            {transaction?.total && (
              <div className="flex items-center gap-2 text-gray-600">
                <FaDollarSign />
                <span>Total: ${(transaction.total / 100).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Transaction Items */}
        {transactionItems && transactionItems.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <FaTicketAlt />
              Ticket Details
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              {transactionItems.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                  <div>
                    <span className="font-medium">{item.ticketTypeName || `Ticket Type #${item.ticketTypeId}`}</span>
                    <span className="text-gray-600 ml-2">× {item.quantity}</span>
                  </div>
                  <span className="font-medium">${((item.priceInCents || 0) / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QR Code Display */}
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Entry QR Code</h3>
          
          {generating && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mx-auto max-w-md mb-4">
              <div className="flex items-center justify-center mb-2">
                <FaSpinner className="animate-spin text-blue-600 text-2xl mr-2" />
                <span className="text-blue-800 font-medium">Generating QR Code...</span>
              </div>
              <p className="text-sm text-blue-700">
                Please wait while we generate your QR code. This may take a moment on mobile devices.
              </p>
            </div>
          )}
          
          {qrCodeImageUrl && !generating && (
            <>
              <div className="inline-block bg-white p-6 rounded-lg shadow-md border-2 border-dashed border-gray-300">
                <Image
                  src={qrCodeImageUrl}
                  alt="Ticket QR Code"
                  width={300}
                  height={300}
                  className="mx-auto rounded-lg"
                />
              </div>
              <p className="text-sm text-gray-600 mt-4 max-w-md mx-auto">
                Show this QR code at the event entrance for quick check-in. 
                You can also download it to save on your device.
              </p>
            </>
          )}
          
          {generationError && !generating && !qrCodeImageUrl && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mx-auto max-w-md">
              <div className="text-yellow-800 mb-2">⚠️ QR Code Generation Issue</div>
              <p className="text-sm text-yellow-700 mb-4">
                {generationError}
              </p>
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">Alternative options:</p>
                <ul className="list-disc list-inside space-y-1 text-left">
                  <li>Check your email for the QR code</li>
                  <li>Show your transaction ID: <strong>{transaction?.id}</strong></li>
                  <li>Contact event support if needed</li>
                </ul>
              </div>
            </div>
          )}
          
          {!generating && !qrCodeImageUrl && !generationError && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mx-auto max-w-md">
              <div className="text-gray-800 mb-2">⏳ QR Code Pending</div>
              <p className="text-sm text-gray-600 mb-4">
                Your QR code will appear here shortly. Your ticket purchase was successful!
              </p>
              <div className="text-sm text-gray-600">
                <p>Transaction ID: <strong>{transaction?.id}</strong></p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          {qrCodeImageUrl && (
            <button
              onClick={handleDownloadQr}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-md flex items-center gap-2 justify-center"
            >
              <FaDownload />
              Download QR Code
            </button>
          )}
          <button
            onClick={handleGoBack}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md flex items-center gap-2 justify-center"
          >
            <FaArrowLeft />
            Return to Home
          </button>
        </div>

        {/* Transaction ID for reference */}
        {transaction?.id && (
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Transaction ID: {transaction.id}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}