import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { NextRequest } from 'next/server';

type RouteParams = { params: { id: string } };

export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const transaction = await prisma.ticketTransaction.findUnique({
      where: { id: context.params.id },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ transaction });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction' },
      { status: 500 }
    );
  }
}