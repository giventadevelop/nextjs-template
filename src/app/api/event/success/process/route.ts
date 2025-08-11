import { NextRequest, NextResponse } from 'next/server';
import { processStripeSessionServer, fetchTransactionQrCode } from '@/app/event/success/ApiServerActions';
import { fetchEventDetailsByIdServer } from '@/app/admin/events/[id]/media/ApiServerActions';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function fetchTransactionItemsByTransactionId(transactionId: number) {
  const res = await fetch(`${APP_URL}/api/proxy/event-ticket-transaction-items?transactionId.equals=${transactionId}`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

async function fetchTicketTypeById(ticketTypeId: number) {
  const res = await fetch(`${APP_URL}/api/proxy/event-ticket-types/${ticketTypeId}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

async function getHeroImageUrl(eventId: number) {
  const defaultHeroImageUrl = `/images/default_placeholder_hero_image.jpeg?v=${Date.now()}`;
  let imageUrl: string | null = null;
  try {
    const flyerRes = await fetch(`${APP_URL}/api/proxy/event-medias?eventId.equals=${eventId}&eventFlyer.equals=true`, { cache: 'no-store' });
    if (flyerRes.ok) {
      const flyerData = await flyerRes.json();
      if (Array.isArray(flyerData) && flyerData.length > 0 && flyerData[0].fileUrl) {
        imageUrl = flyerData[0].fileUrl;
      }
    }
    if (!imageUrl) {
      const featuredRes = await fetch(`${APP_URL}/api/proxy/event-medias?eventId.equals=${eventId}&isFeaturedImage.equals=true`, { cache: 'no-store' });
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

// Function to get session_id from payment intent
async function getSessionIdFromPaymentIntent(paymentIntentId: string): Promise<string | null> {
  try {
    console.log('[Payment Intent] Looking up session for payment intent:', paymentIntentId);
    
    // Get the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    // The session ID should be in the metadata or we need to search for it
    if (paymentIntent.metadata?.session_id) {
      console.log('[Payment Intent] Found session_id in metadata:', paymentIntent.metadata.session_id);
      return paymentIntent.metadata.session_id;
    }
    
    // If not in metadata, we need to search checkout sessions
    // This is more expensive but necessary for mobile flows
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: paymentIntentId,
      limit: 1
    });
    
    if (sessions.data.length > 0) {
      const sessionId = sessions.data[0].id;
      console.log('[Payment Intent] Found session_id via lookup:', sessionId);
      return sessionId;
    }
    
    console.log('[Payment Intent] No session found for payment intent:', paymentIntentId);
    return null;
  } catch (error) {
    console.error('[Payment Intent] Error looking up session:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, pi } = body;
    
    console.log('[API POST] Received body:', {
      session_id,
      pi,
      body
    });
    
    if (!session_id && !pi) {
      console.log('[API POST] Missing both session_id and pi parameters');
      return NextResponse.json({ error: 'Missing session_id or pi (payment_intent)' }, { status: 400 });
    }
    
    // For payment intent, we need to process it by session_id (requires conversion)
    // For now, we'll use the same processStripeSessionServer function which expects session_id
    let result = null;
    if (session_id) {
      result = await processStripeSessionServer(session_id);
    } else if (pi) {
      // Payment intent processing - convert to session_id first
      console.log('[API] Processing payment intent:', pi);
      const sessionId = await getSessionIdFromPaymentIntent(pi);
      if (!sessionId) {
        return NextResponse.json({ error: 'Could not find session for payment intent' }, { status: 404 });
      }
      result = await processStripeSessionServer(sessionId);
    }
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
          transactionId: transaction.id
        });
        qrCodeData = await fetchTransactionQrCode(eventDetails.id, transaction.id);
        console.log('[QR Code Debug] QR code fetched successfully:', qrCodeData);
      } catch (err) {
        console.error('[QR Code Debug] Failed to fetch QR code:', err);
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
    
    console.log('[API GET] Received parameters:', {
      session_id,
      pi,
      url: req.url,
      searchParams: Object.fromEntries(searchParams.entries())
    });
    
    if (!session_id && !pi) {
      console.log('[API GET] Missing both session_id and pi parameters');
      return NextResponse.json({ error: 'Missing session_id or pi (payment_intent)' }, { status: 400 });
    }
    
    // Only look up, do not create
    let result = null;
    if (session_id) {
      result = await processStripeSessionServer(session_id);
    } else if (pi) {
      console.log('[API GET] Processing payment intent:', pi);
      const sessionId = await getSessionIdFromPaymentIntent(pi);
      if (!sessionId) {
        return NextResponse.json({ error: 'Could not find session for payment intent' }, { status: 404 });
      }
      result = await processStripeSessionServer(sessionId);
    }
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
        qrCodeData = await fetchTransactionQrCode(eventDetails.id, transaction.id);
      } catch (err) {
        qrCodeData = null;
      }
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