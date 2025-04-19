import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { Webhook } from 'svix';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function validateRequest(request: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env');
  }

  // Get the headers
  const headersList = await headers();
  const svix_id = headersList.get("svix-id");
  const svix_timestamp = headersList.get("svix-timestamp");
  const svix_signature = headersList.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    });
  }

  // Get the body
  const payload = await request.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400
    });
  }

  return evt;
}

export async function POST(request: Request) {
  const evt = await validateRequest(request);

  if (evt instanceof Response) {
    return evt;
  }

  const eventType = evt.type;
  console.log(`Processing Clerk webhook event: ${eventType}`);

  try {
    switch (eventType) {
      case 'user.created': {
        const { id, email_addresses, ...attributes } = evt.data;
        console.log('User created:', { id, email: email_addresses[0]?.email_address });

        // Create user profile and subscription with minimal required fields
        await db.userProfile.create({
          data: {
            userId: id,
            email: email_addresses[0]?.email_address,
            subscription: {
              create: {
                status: 'pending'
              }
            }
          },
        });

        console.log('Created user profile and subscription records');
        break;
      }

      case 'user.updated': {
        const { id, email_addresses, ...attributes } = evt.data;
        console.log('User updated:', { id, email: email_addresses[0]?.email_address });

        // Update user profile if needed
        await db.userProfile.update({
          where: { userId: id },
          data: {
            email: email_addresses[0]?.email_address,
          },
        });
        break;
      }

      case 'user.deleted': {
        const { id } = evt.data;
        console.log('User deleted:', { id });

        // Delete user profile and related data
        await db.userProfile.delete({
          where: { userId: id },
        });
        break;
      }
    }

    return new Response('Webhook processed successfully', { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      `Webhook Error: ${error instanceof Error ? error.message : 'Unknown Error'}`,
      { status: 500 }
    );
  }
}