'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

interface TicketType {
  id: number;
  name: string;
  price: number;
  description: string;
  available: number;
}

const EventPage = () => {
  const router = useRouter();
  const { user } = useUser();
  const [selectedTickets, setSelectedTickets] = useState<{ [key: number]: number }>({});
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const ticketTypes: TicketType[] = [
    {
      id: 1,
      name: 'Regular Ticket',
      price: 40,
      description: 'Early Bird tickets',
      available: 100
    },
    {
      id: 2,
      name: 'Regular Kids',
      price: 25,
      description: 'Early Bird Ticket for kids between 5-15 years. Kids Under 5 – FREE Admission!',
      available: 50
    },
    {
      id: 3,
      name: 'Preferred Tickets',
      price: 60,
      description: 'Early Bird tickets',
      available: 50
    },
    {
      id: 4,
      name: 'Preferred Kids',
      price: 45,
      description: 'Early Bird tickets for kids between 5-15 years',
      available: 30
    },
    {
      id: 5,
      name: 'VIP',
      price: 125,
      description: 'VIP access with exclusive perks',
      available: 20
    },
    {
      id: 6,
      name: 'VVIP',
      price: 250,
      description: 'Very VIP access with premium exclusive perks',
      available: 10
    }
  ];

  const handleTicketChange = (ticketId: number, quantity: number) => {
    if (quantity >= 0) {
      setSelectedTickets(prev => ({
        ...prev,
        [ticketId]: quantity
      }));
    }
  };

  const calculateTotal = () => {
    return Object.entries(selectedTickets).reduce((total, [ticketId, quantity]) => {
      const ticket = ticketTypes.find(t => t.id === parseInt(ticketId));
      return total + (ticket?.price || 0) * quantity;
    }, 0);
  };

  const handlePurchase = async () => {
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      alert("Please sign in to purchase tickets");
      return;
    }

    const ticketsToCheckout = Object.entries(selectedTickets)
      .filter(([_, quantity]) => quantity > 0)
      .map(([ticketId, quantity]) => {
        const ticket = ticketTypes.find(t => t.id === parseInt(ticketId));
        return {
          type: ticket?.name || '',
          quantity: quantity,
          price: ticket?.price || 0
        };
      });

    if (ticketsToCheckout.length === 0) {
      alert("Please select at least one ticket");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch("/api/stripe/event-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tickets: ticketsToCheckout,
          eventId: "kanj-cine-star-2025",
          email: user.emailAddresses[0].emailAddress,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to create checkout session. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Event Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Kanj Cine Star Nite 2025
          </h1>
          <p className="text-xl text-gray-600">
            Join us for an unforgettable cinematic experience!
          </p>
          <div className="mt-4 text-gray-600">
            <p>Date: March 15, 2025</p>
            <p>Location: Kanj Cinema Complex, Downtown</p>
          </div>
        </div>

        {/* Event Image */}
        <div className="relative h-96 mb-12 rounded-lg overflow-hidden">
          <Image
            src="/kanj_cine_star_nite_2025.webp"
            alt="Kanj Cine Star Nite 2025"
            fill
            style={{ objectFit: 'cover' }}
            priority
          />
        </div>

        {/* Ticket Selection */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-6">Select Your Tickets</h2>

          <div className="space-y-6">
            {ticketTypes.map(ticket => (
              <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{ticket.name}</h3>
                  <p className="text-gray-500">{ticket.description}</p>
                  <p className="text-sm text-gray-600 mt-1">Available: {ticket.available}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-xl font-semibold">${ticket.price}</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleTicketChange(ticket.id, (selectedTickets[ticket.id] || 0) - 1)}
                      className="bg-gray-200 text-gray-600 px-3 py-1 rounded-md hover:bg-gray-300"
                      disabled={!selectedTickets[ticket.id]}
                    >
                      -
                    </button>
                    <span className="w-8 text-center">{selectedTickets[ticket.id] || 0}</span>
                    <button
                      onClick={() => handleTicketChange(ticket.id, (selectedTickets[ticket.id] || 0) + 1)}
                      className="bg-gray-200 text-gray-600 px-3 py-1 rounded-md hover:bg-gray-300"
                      disabled={selectedTickets[ticket.id] >= ticket.available}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-6">Order Summary</h2>
          <div className="space-y-4">
            {Object.entries(selectedTickets).map(([ticketId, quantity]) => {
              if (quantity > 0) {
                const ticket = ticketTypes.find(t => t.id === parseInt(ticketId));
                return (
                  <div key={ticketId} className="flex justify-between">
                    <span>{ticket?.name} x {quantity}</span>
                    <span>${(ticket?.price || 0) * quantity}</span>
                  </div>
                );
              }
              return null;
            })}
            <div className="border-t pt-4">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>${calculateTotal()}</span>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 after:content-['*'] after:ml-0.5 after:text-red-500">
                Email address for tickets
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-3 rounded-md border border-gray-300 shadow-sm focus:border-[#39E079] focus:ring-[#39E079] text-base placeholder:text-gray-400"
                  placeholder="you@example.com"
                  required
                  aria-required="true"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">Your tickets will be sent to this email address</p>
            </div>

            <button
              onClick={handlePurchase}
              disabled={isProcessing || calculateTotal() === 0 || !email.trim()}
              className="w-full bg-[#39E079] text-white py-3 px-4 rounded-md hover:bg-[#32c96d] focus:outline-none focus:ring-2 focus:ring-[#39E079] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                `Purchase Tickets - $${calculateTotal()}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventPage;