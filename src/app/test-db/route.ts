import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Try to create a test transaction
    const testTransaction = await prisma.ticketTransaction.create({
      data: {
        email: 'test@example.com',
        eventId: 'test-event',
        ticketType: 'TEST',
        quantity: 1,
        pricePerUnit: 10,
        totalAmount: 10,
        status: 'test',
      },
    });

    // If successful, delete the test transaction
    await prisma.ticketTransaction.delete({
      where: {
        id: testTransaction.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Database connection successful'
    });
  } catch (error) {
    console.error('Database test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500
    });
  }
}