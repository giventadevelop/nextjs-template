import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, tickets, eventId } = body;

    // Validate input
    if (!email || !tickets || !tickets.length || !eventId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create transaction records for each ticket type
    const transactions = await Promise.all(
      tickets.map(async (ticket: any) => {
        if (ticket.quantity > 0) {
          return prisma.ticketTransaction.create({
            data: {
              email,
              eventId,
              ticketType: ticket.ticketType,
              quantity: ticket.quantity,
              pricePerUnit: ticket.pricePerUnit,
              totalAmount: ticket.totalAmount,
            },
          });
        }
      })
    );

    // Filter out null values (from tickets with quantity 0)
    const completedTransactions = transactions.filter(Boolean);

    return NextResponse.json({
      success: true,
      transactions: completedTransactions,
    });
  } catch (error) {
    console.error('Error processing ticket purchase:', error);
    return NextResponse.json(
      { error: 'Failed to process ticket purchase' },
      { status: 500 }
    );
  }
}