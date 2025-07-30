import { auth, currentUser } from '@clerk/nextjs/server';
import { UserProfileDTO } from '@/types';
import { getTenantId, getAppUrl } from '@/lib/env';

export async function fetchUserProfileServer(userId: string): Promise<UserProfileDTO | null> {
  const baseUrl = getAppUrl();

  try {
    // Try to fetch the profile by userId
    const url = `${baseUrl}/api/proxy/user-profiles/by-user/${userId}`;
    let response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });

    if (response.ok) {
      const data = await response.json();
      return Array.isArray(data) ? data[0] : data;
    } else if (response.status === 404) {
      // Fallback: lookup by email
      const user = await currentUser();
      const email = user?.emailAddresses?.[0]?.emailAddress || "";
      if (email) {
        const emailUrl = `${baseUrl}/api/proxy/user-profiles?email.equals=${encodeURIComponent(email)}`;
        const emailRes = await fetch(emailUrl, {
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store'
        });
        if (emailRes.ok) {
          const emailData = await emailRes.json();
          return Array.isArray(emailData) ? emailData[0] : emailData;
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export async function updateUserProfileServer(profileId: number, payload: Partial<UserProfileDTO>): Promise<UserProfileDTO | null> {
  const baseUrl = getAppUrl();

  try {
    const response = await fetch(`${baseUrl}/api/proxy/user-profiles/${profileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return null;
  }
}

export async function createUserProfileServer(payload: Omit<UserProfileDTO, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserProfileDTO | null> {
  const baseUrl = getAppUrl();

  try {
    const response = await fetch(`${baseUrl}/api/proxy/user-profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        tenantId: getTenantId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    });

    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Error creating user profile:', error);
    return null;
  }
}

export async function resubscribeEmailServer(email: string, token: string): Promise<boolean> {
  const baseUrl = getAppUrl();

  try {
    const response = await fetch(`${baseUrl}/api/proxy/user-profiles/resubscribe-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`);
    return response.ok;
  } catch (error) {
    console.error('Error resubscribing email:', error);
    return false;
  }
}

export async function checkEmailSubscriptionServer(email: string): Promise<{ isSubscribed: boolean; token?: string }> {
  const baseUrl = getAppUrl();

  try {
    const url = `${baseUrl}/api/proxy/user-profiles?email.equals=${encodeURIComponent(email)}`;
    const response = await fetch(url, { method: 'GET' });

    if (response.ok) {
      const data = await response.json();
      const profile = Array.isArray(data) ? data[0] : data;
      return {
        isSubscribed: !profile?.emailUnsubscribed,
        token: profile?.emailUnsubscribeToken
      };
    }
    return { isSubscribed: false };
  } catch (error) {
    console.error('Error checking email subscription:', error);
    return { isSubscribed: false };
  }
}