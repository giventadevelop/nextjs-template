'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface TicketType {
  id: number;
  name: string;
  price: number;
  description: string;
  available: number;
}

const EventPage = () => {
  const [selectedTickets, setSelectedTickets] = useState<{ [key: number]: number }>({});

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
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>${calculateTotal()}</span>
              </div>
            </div>
            <button
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors mt-6 disabled:bg-gray-400"
              disabled={calculateTotal() === 0}
              onClick={() => alert('Proceeding to checkout...')}
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventPage;