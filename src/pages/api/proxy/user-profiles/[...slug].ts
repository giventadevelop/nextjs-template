import type { NextApiRequest, NextApiResponse } from 'next';
import { getCachedApiJwt, generateApiJwt } from '@/lib/api/jwt';
import { withTenantId } from '@/lib/withTenantId';
import { getTenantId } from '@/lib/env';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!API_BASE_URL) {
      res.status(500).json({ error: 'API base URL not configured' });
      return;
    }

    const { method, query, body } = req;
    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

    if (!allowedMethods.includes(method!)) {
      res.setHeader('Allow', allowedMethods);
      res.status(405).end(`Method ${method} Not Allowed`);
      return;
    }

    const tenantId = getTenantId();
    const slug = query.slug;

    // Build the backend path
    let path = '/api/user-profiles';
    if (slug) {
      if (Array.isArray(slug)) {
        path += '/' + slug.map(encodeURIComponent).join('/');
      } else if (typeof slug === 'string') {
        path += '/' + encodeURIComponent(slug);
      }
    }

    // Remove slug from query before building query string
    const { slug: _omit, ...restQuery } = query;
    const qs = new URLSearchParams(restQuery as Record<string, string>);

    // Only append tenantId.equals for GET/POST list endpoints, not for PATCH/PUT/DELETE by ID
    const isListEndpoint = (method === 'GET' || method === 'POST') && !/\/\d+(\/|$)/.test(path);
    if (isListEndpoint && !Array.from(qs.keys()).includes('tenantId.equals')) {
      qs.append('tenantId.equals', tenantId);
    }

    const queryString = qs.toString();
    const apiUrl = `${API_BASE_URL}${path}${queryString ? `?${queryString}` : ''}`;

    console.log('[UserProfile Proxy] Forwarding to backend URL:', apiUrl);

    // Make the initial request
    let apiRes = await fetchWithJwtRetry(apiUrl, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

        // Special handling for GET /by-user/{userId} 404 errors
    // Step 1: Try to create profile automatically
    // Step 2: If creation fails, fallback to email lookup
    if (method === 'GET' && apiRes.status === 404 && path.includes('/by-user/')) {
      const userId = slug && Array.isArray(slug) ? slug[1] : slug;
      
      if (userId && typeof userId === 'string' && userId.startsWith('user_')) {
        console.log('[UserProfile Proxy] 404 on by-user endpoint, attempting Step 1: create profile for userId:', userId);

        try {
          // Create a minimal user profile
          const createPayload = withTenantId({
            userId: userId,
            email: '', // Will be populated later when user provides email
            firstName: '',
            lastName: '',
            userRole: 'ROLE_USER',
            userStatus: 'ACTIVE',
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          console.log('[UserProfile Proxy] Creating user profile with payload:', createPayload);

          const createRes = await fetchWithJwtRetry(`${API_BASE_URL}/api/user-profiles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createPayload),
          });

          if (createRes.ok) {
            const createdProfile = await createRes.json();
            console.log('[UserProfile Proxy] Successfully created user profile:', createdProfile);

            // Return the created profile
            res.status(200).json(createdProfile);
            return;
                     } else {
             console.error('[UserProfile Proxy] Failed to create user profile:', createRes.status, await createRes.text());
             
             // Step 2: Fallback to email lookup if profile creation fails
             console.log('[UserProfile Proxy] Step 1 failed, attempting Step 2: email lookup fallback...');
             
             try {
               // Try to get user email from multiple sources
               let email = req.headers['x-user-email'] || 
                          req.headers['x-clerk-user-email'] || 
                          req.headers['x-forwarded-user-email'];
               
               // If no email in headers, try to extract from JWT token
               if (!email && req.headers.authorization) {
                 try {
                   const token = req.headers.authorization.split(' ')[1];
                   const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                   email = payload.email || payload.sub; // Clerk JWT might have email or sub
                   console.log('[UserProfile Proxy] Extracted email from JWT:', email);
                 } catch (jwtError) {
                   console.log('[UserProfile Proxy] Could not extract email from JWT:', jwtError);
                 }
               }
               
               if (email) {
                 console.log('[UserProfile Proxy] Attempting email lookup for:', email);
                 
                 const emailLookupUrl = `${API_BASE_URL}/api/user-profiles?email.equals=${encodeURIComponent(email)}&tenantId.equals=${tenantId}`;
                 const emailRes = await fetchWithJwtRetry(emailLookupUrl, { method: 'GET' });
                 
                 if (emailRes.ok) {
                   const emailProfile = await emailRes.json();
                   console.log('[UserProfile Proxy] Email lookup successful, found profile:', emailProfile);
                   
                   // Return the profile found by email
                   res.status(200).json(emailProfile);
                   return;
                 } else {
                   console.log('[UserProfile Proxy] Email lookup also failed:', emailRes.status);
                 }
               } else {
                 console.log('[UserProfile Proxy] No email available for fallback lookup');
               }
             } catch (emailLookupError) {
               console.error('[UserProfile Proxy] Email lookup fallback error:', emailLookupError);
             }
             
             // If all fallbacks fail, return the original 404
             res.status(404).json({ error: 'User profile not found and could not be created or found by email' });
             return;
           }
        } catch (createError) {
          console.error('[UserProfile Proxy] Error creating user profile:', createError);
          // Fall back to original 404 response
          res.status(404).json({ error: 'User profile not found and could not be created' });
          return;
        }
      }
    }

    // Forward x-total-count header for GET requests
    if (method === 'GET') {
      const totalCount = apiRes.headers.get('x-total-count');
      if (totalCount) {
        res.setHeader('x-total-count', totalCount);
      }
      const data = await apiRes.json();
      res.status(apiRes.status).json(data);
      return;
    }

    const data = await apiRes.text();
    res.status(apiRes.status).send(data);

  } catch (err) {
    console.error('[UserProfile Proxy ERROR]', err);
    res.status(500).json({ error: 'Internal server error', details: String(err) });
  }
}

async function fetchWithJwtRetry(apiUrl: string, options: any = {}, debugLabel = '') {
  console.log('[fetchWithJwtRetry] Called with URL:', apiUrl);
  let token = await getCachedApiJwt();
  console.log('[fetchWithJwtRetry] Using JWT:', token);
  let response = await fetch(apiUrl, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
  console.log('[fetchWithJwtRetry] Response status:', response.status);
  if (response.status === 401) {
    token = await generateApiJwt();
    console.log('[fetchWithJwtRetry] Retrying with new JWT:', token);
    response = await fetch(apiUrl, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('[fetchWithJwtRetry] Response status (after retry):', response.status);
  }
  return response;
}

export const config = {
  api: {
    bodyParser: false,
  },
};