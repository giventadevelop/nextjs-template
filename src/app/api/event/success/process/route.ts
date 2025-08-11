import { NextRequest, NextResponse } from 'next/server';
import { processStripeSessionServer, fetchTransactionQrCode } from '@/app/event/success/ApiServerActions';
import { fetchEventDetailsByIdServer } from '@/app/admin/events/[id]/media/ApiServerActions';
import { getAppUrl } from '@/lib/env';

async function fetchTransactionItemsByTransactionId(transactionId: number) {
  const res = await fetch(`${getAppUrl()}/api/proxy/event-ticket-transaction-items?transactionId.equals=${transactionId}`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

async function fetchTicketTypeById(ticketTypeId: number) {
  const res = await fetch(`${getAppUrl()}/api/proxy/event-ticket-types/${ticketTypeId}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

async function getHeroImageUrl(eventId: number) {
  const defaultHeroImageUrl = `/images/default_placeholder_hero_image.jpeg?v=${Date.now()}`;
  let imageUrl: string | null = null;
  try {
    const flyerRes = await fetch(`${getAppUrl()}/api/proxy/event-medias?eventId.equals=${eventId}&eventFlyer.equals=true`, { cache: 'no-store' });
    if (flyerRes.ok) {
      const flyerData = await flyerRes.json();
      if (Array.isArray(flyerData) && flyerData.length > 0 && flyerData[0].fileUrl) {
        imageUrl = flyerData[0].fileUrl;
      }
    }
    if (!imageUrl) {
      const featuredRes = await fetch(`${getAppUrl()}/api/proxy/event-medias?eventId.equals=${eventId}&isFeaturedImage.equals=true`, { cache: 'no-store' });
      if (featuredRes.ok) {
        const featuredData = await featuredRes.json();
        if (Array.isArray(featuredData) && featuredData.length > 0 && featuredData[0].fileUrl) {
          imageUrl = featuredData[0].fileUrl;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching hero image:', error);
  }
  return imageUrl || defaultHeroImageUrl;
}

export async function POST(req: NextRequest) {
  try {
    const { session_id } = await req.json();
    if (!session_id) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }
    const result = await processStripeSessionServer(session_id);
    const transaction = result?.transaction;
    const userProfile = result?.userProfile;
    if (!transaction) {
      return NextResponse.json({ transaction: null }, { status: 200 });
    }
    let eventDetails = transaction.event;
    if (!eventDetails?.id && transaction.eventId) {
      eventDetails = await fetchEventDetailsByIdServer(transaction.eventId);
    }
    let qrCodeData = null;
    if (transaction.id && eventDetails?.id) {
      try {
        console.log('[QR Code Debug] Attempting to fetch QR code for:', {
          eventId: eventDetails.id,
          transactionId: transaction.id,
          baseUrl: getAppUrl()
        });
        qrCodeData = await fetchTransactionQrCode(eventDetails.id, transaction.id);
        console.log('[QR Code Debug] QR code fetched successfully:', {
          hasQrCodeImageUrl: !!qrCodeData?.qrCodeImageUrl,
          qrCodeImageUrl: qrCodeData?.qrCodeImageUrl
        });
      } catch (err: any) {
        console.error('[QR Code Debug] Failed to fetch QR code:', {
          error: err.message,
          transactionId: transaction.id,
          eventId: eventDetails.id,
          errorType: err.constructor.name
        });
        // Don't set qrCodeData to indicate it's not ready yet - polling will handle this
        qrCodeData = null;
      }
    } else {
      console.log('[QR Code Debug] Skipping QR code fetch - missing IDs:', {
        transactionId: transaction.id,
        eventId: eventDetails?.id
      });
    }
    // Fetch transaction items and ticket type names
    let transactionItems = [];
    if (transaction.id) {
      transactionItems = await fetchTransactionItemsByTransactionId(transaction.id as number);
      const ticketTypeCache: Record<number, any> = {};
      for (const item of transactionItems) {
        if (!item.ticketTypeName && item.ticketTypeId) {
          if (!ticketTypeCache[item.ticketTypeId as number]) {
            const ticketType = await fetchTicketTypeById(item.ticketTypeId as number);
            ticketTypeCache[item.ticketTypeId as number] = ticketType;
          }
          item.ticketTypeName = ticketTypeCache[item.ticketTypeId as number]?.name || `Ticket Type #${item.ticketTypeId}`;
        }
      }
    }
    // Fetch hero image URL
    let heroImageUrl = eventDetails?.id ? await getHeroImageUrl(eventDetails.id as number) : null;
    return NextResponse.json({ transaction, userProfile, eventDetails, qrCodeData, transactionItems, heroImageUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const session_id = searchParams.get('session_id');
    const pi = searchParams.get('pi');
    if (!session_id && !pi) {
      return NextResponse.json({ error: 'Missing session_id or pi' }, { status: 400 });
    }
    // Only look up, do not create — for PaymentIntent path, read from backend by paymentIntentId
    let result = null as any;
    if (session_id) {
      result = await processStripeSessionServer(session_id);
    }
    let transaction = result?.transaction as any;
    let userProfile = result?.userProfile as any;
    if (!transaction && pi) {
      // Find transaction by paymentIntentId via proxy
      const params = new URLSearchParams({ 'stripePaymentIntentId.equals': pi });
      const txRes = await fetch(`${getAppUrl()}/api/proxy/event-ticket-transactions?${params.toString()}`, { cache: 'no-store' });
      if (txRes.ok) {
        const arr = await txRes.json();
        if (Array.isArray(arr) && arr.length > 0) {
          transaction = arr[0];
        }
      }
    }
    if (!transaction) {
      return NextResponse.json({ transaction: null }, { status: 200 });
    }
    let eventDetails = transaction.event;
    if (!eventDetails?.id && transaction.eventId) {
      eventDetails = await fetchEventDetailsByIdServer(transaction.eventId);
    }
    let qrCodeData = null;
    if (transaction.id && eventDetails?.id) {
      try {
        console.log('[QR Code Debug GET] Attempting to fetch QR code for:', {
          eventId: eventDetails.id,
          transactionId: transaction.id,
          baseUrl: getAppUrl()
        });
        qrCodeData = await fetchTransactionQrCode(eventDetails.id, transaction.id);
        console.log('[QR Code Debug GET] QR code fetched successfully:', {
          hasQrCodeImageUrl: !!qrCodeData?.qrCodeImageUrl,
          qrCodeImageUrl: qrCodeData?.qrCodeImageUrl
        });
      } catch (err: any) {
        console.error('[QR Code Debug GET] Failed to fetch QR code:', {
          error: err.message,
          transactionId: transaction.id,
          eventId: eventDetails.id,
          errorType: err.constructor.name
        });
        // Don't set qrCodeData to indicate it's not ready yet - polling will handle this
        qrCodeData = null;
      }
    } else {
      console.log('[QR Code Debug GET] Skipping QR code fetch - missing IDs:', {
        transactionId: transaction.id,
        eventId: eventDetails?.id
      });
    }
    // Fetch transaction items and ticket type names
    let transactionItems = [];
    if (transaction.id) {
      transactionItems = await fetchTransactionItemsByTransactionId(transaction.id as number);
      const ticketTypeCache: Record<number, any> = {};
      for (const item of transactionItems) {
        if (!item.ticketTypeName && item.ticketTypeId) {
          if (!ticketTypeCache[item.ticketTypeId as number]) {
            const ticketType = await fetchTicketTypeById(item.ticketTypeId as number);
            ticketTypeCache[item.ticketTypeId as number] = ticketType;
          }
          item.ticketTypeName = ticketTypeCache[item.ticketTypeId as number]?.name || `Ticket Type #${item.ticketTypeId}`;
        }
      }
    }
    // Fetch hero image URL
    let heroImageUrl = eventDetails?.id ? await getHeroImageUrl(eventDetails.id as number) : null;
    return NextResponse.json({ transaction, userProfile, eventDetails, qrCodeData, transactionItems, heroImageUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}