import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuth } from "@clerk/nextjs/server";
import { headers } from "next/headers";

export async function authenticatedRequest(
  req: NextRequest,
  handler: (userId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return await handler(userId);
  } catch (error) {
    console.error('Authentication error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function getServerAuth() {
  try {
    // Ensure headers are read first
    await headers();

    const { userId } = await auth();
    if (!userId) {
      throw new Error('No authenticated session found');
    }

    return { userId };
  } catch (error) {
    console.error('Server auth error:', error);
    throw error;
  }
}

export async function getUserAuth() {
  try {
    const { userId } = await getServerAuth();
    const { sessionClaims } = await auth();
    return {
      session: {
        user: {
          id: userId,
          ...sessionClaims,
        },
      },
    };
  } catch (error) {
    console.error('User auth error:', error);
    return {
      session: null,
    };
  }
}