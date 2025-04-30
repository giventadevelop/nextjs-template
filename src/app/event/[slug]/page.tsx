'use client';
import { useState } from 'react';

export default function EventPage() {
  const [tickets, setTickets] = useState(1);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null); // Set this based on your auth context

  async function handleCheckout() {
    try {
      setLoading(true);
      console.log('Starting checkout request...', {
        tickets,
        eventId: "kanj-cine-star-2025",
        email: email?.trim(),
        hasUserId: !!userId
      });

      let response = await fetch("/api/stripe/event-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tickets,
          eventId: "kanj-cine-star-2025",
          email: email.trim(),
          userId: userId || null
        })
      });

      // Log the response status
      console.log('Checkout response status:', response.status);

      if (!response.ok) {
        // Try to get error details
        const errorText = await response.text();
        console.error('Checkout error details:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Checkout response:', {
        hasUrl: !!data.url,
        success: !!data.url
      });

      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      alert("Failed to create checkout session. Please try again.");
    } catch (error) {
      console.error("Detailed error:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof Error ? error.constructor.name : 'Unknown'
      });
      alert("Failed to create checkout session. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Rest of your component code...
}