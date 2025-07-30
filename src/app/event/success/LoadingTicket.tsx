"use client";
import Image from "next/image";
import { useEffect, useState } from 'react';

interface LoadingTicketProps {
  sessionId?: string;
}

export default function LoadingTicket({ sessionId }: LoadingTicketProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);

  console.log('LoadingTicket received sessionId:', sessionId);
  console.log('LoadingTicket image status - loaded:', isLoaded, 'error:', hasError);

  // Fetch hero image data using sessionId - get eventId from Stripe session and fetch hero image directly
  useEffect(() => {
    if (sessionId) {
      const fetchHeroImage = async () => {
        try {
          console.log('LoadingTicket: Fetching hero image for session:', sessionId);
          
          // First, try to get eventId from Stripe session
          const stripeResponse = await fetch('/api/stripe/get-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId })
          });
          
          if (stripeResponse.ok) {
            const stripeData = await stripeResponse.json();
            const eventId = stripeData.metadata?.eventId;
            console.log('LoadingTicket: Got eventId from Stripe:', eventId);
            
            if (eventId) {
              // Fetch hero image like tickets page does
              const eventIdNum = parseInt(eventId);
              let imageUrl = null;
              
              // Try flyer first
              const flyerRes = await fetch(`/api/proxy/event-medias?eventId.equals=${eventIdNum}&eventFlyer.equals=true`, { cache: 'no-store' });
              if (flyerRes.ok) {
                const flyerData = await flyerRes.json();
                if (Array.isArray(flyerData) && flyerData.length > 0 && flyerData[0].fileUrl) {
                  imageUrl = flyerData[0].fileUrl;
                }
              }
              
              // Try featured image if no flyer
              if (!imageUrl) {
                const featuredRes = await fetch(`/api/proxy/event-medias?eventId.equals=${eventIdNum}&isFeaturedImage.equals=true`, { cache: 'no-store' });
                if (featuredRes.ok) {
                  const featuredData = await featuredRes.json();
                  if (Array.isArray(featuredData) && featuredData.length > 0 && featuredData[0].fileUrl) {
                    imageUrl = featuredData[0].fileUrl;
                  }
                }
              }
              
              if (imageUrl) {
                setHeroImageUrl(imageUrl);
                console.log('LoadingTicket: Successfully fetched hero image URL:', imageUrl);
              } else {
                console.log('LoadingTicket: No hero image found for eventId:', eventId);
              }
            }
          } else {
            console.error('LoadingTicket: Failed to get Stripe session data');
          }
        } catch (error) {
          console.error('LoadingTicket: Failed to fetch hero image:', error);
        }
      };
      fetchHeroImage();
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* HERO SECTION - Full width bleeding to edges */}
      <section className="hero-section" style={{ position: 'relative', marginTop: '0', paddingTop: '0', padding: '0', margin: '0', backgroundColor: 'transparent', height: '400px', overflow: 'hidden', width: '100%' }}>
        <Image
          src={heroImageUrl || "/images/default_placeholder_hero_image.jpeg"}
          alt="Event Hero"
          fill
          className="hero-image object-cover"
          onLoad={() => {
            console.log('Hero image loaded successfully');
            setIsLoaded(true);
          }}
          onError={(e) => {
            console.error('Hero image failed to load:', e);
            setHasError(true);
          }}
        />
        <div className="hero-overlay" style={{ opacity: 0.1, height: '5px', padding: '20' }}></div>
      </section>

      {/* CSS Styles for hero section */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .hero-image {
            width: 100%;
            height: auto; /* Let image dictate height */
            object-fit: cover; /* Cover full width, may crop height */
            object-position: center;
            display: block;
            margin: 0;
            padding: 0; /* Remove padding to bleed to edges */
          }

          .hero-section {
            min-height: 10vh;
            background-color: transparent !important; /* Remove coral background */
            padding-top: 40px; /* Top padding to prevent header cut-off */
            margin-left: calc(-50vw + 50%) !important;
            margin-right: calc(-50vw + 50%) !important;
            width: 100vw !important;
          }

          @media (max-width: 768px) {
            .hero-image {
              height: auto; /* Let image dictate height on mobile */
              padding: 0; /* Remove padding to bleed to edges on mobile */
            }
          }

          @media (max-width: 767px) {
            .hero-section {
              padding-top: 50px !important; /* Extra mobile top padding */
              margin-top: 0 !important;
              min-height: 5vh !important;
              background-color: transparent !important; /* Remove coral background on mobile */
              margin-left: calc(-50vw + 50%) !important;
              margin-right: calc(-50vw + 50%) !important;
              width: 100vw !important;
            }

          }
        `
      }} />

      {/* Loading content - flex-grow to push footer down */}
      <div className="flex-grow flex flex-col items-center justify-center min-h-[200px] p-6 animate-pulse" style={{ marginTop: '80px' }}>
        <Image
          src="/images/selling-tickets-vector-loading-image.jpg"
          alt="Ticket Loading"
          width={180}
          height={180}
          className="mb-4 rounded shadow-lg"
          priority
        />
        <div className="text-xl font-bold text-teal-700 mb-2">Please wait while your ticket is generated</div>
        <div className="text-gray-600 text-base text-center">It may take a few minutes.<br />Do not close this page.</div>
      </div>


    </div>
  );
}