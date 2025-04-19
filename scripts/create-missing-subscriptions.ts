import { db } from "@/lib/db";

async function createMissingSubscriptions() {
  try {
    // Get all user profiles that don't have a subscription
    const usersWithoutSubscription = await db.userProfile.findMany({
      where: {
        subscription: null
      },
      select: {
        userId: true
      }
    });

    console.log(`Found ${usersWithoutSubscription.length} users without subscription records`);

    // Create subscription records for each user
    for (const user of usersWithoutSubscription) {
      await db.subscription.create({
        data: {
          userId: user.userId,
          stripeCustomerId: `pending_${user.userId}`,
          status: 'pending'
        }
      });
      console.log(`Created subscription record for user ${user.userId}`);
    }

    console.log('Successfully created all missing subscription records');
  } catch (error) {
    console.error('Error creating subscription records:', error);
  } finally {
    await db.$disconnect();
  }
}

createMissingSubscriptions()
  .then(() => console.log('Done'))
  .catch(console.error);