import type { NextApiRequest, NextApiResponse } from 'next';
import { getCachedApiJwt, generateApiJwt } from '@/lib/api/jwt';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function fetchWithJwtRetry(apiUrl: string, options: any = {}) {
  let token = await getCachedApiJwt();
  let response = await fetch(apiUrl, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
  if (response.status === 401) {
    token = await generateApiJwt();
    response = await fetch(apiUrl, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  }
  return response;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!API_BASE_URL) {
    res.status(500).json({ error: 'API base URL not configured' });
    return;
  }

  const { id, transactionId, emailHostUrlPrefix } = req.query;
  
  if (!id || !transactionId || !emailHostUrlPrefix) {
    res.status(400).json({ error: 'Missing eventId, transactionId, or emailHostUrlPrefix' });
    return;
  }

  // Construct the backend URL using the route parameters
  const apiUrl = `${API_BASE_URL}/api/events/${id}/transactions/${transactionId}/emailHostUrlPrefix/${emailHostUrlPrefix}/qrcode`;

  // Add mobile detection and debugging
  const userAgent = req.headers['user-agent'] || '';
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
  const isMobileHeader = req.headers['x-mobile-request'] === 'true';
  const isQrPageGeneration = req.headers['x-qr-page-generation'] === 'true';
  
  console.log('[QR Code Proxy] Request details:', {
    eventId: id,
    transactionId,
    emailHostUrlPrefix,
    isMobile,
    isMobileHeader,
    isQrPageGeneration,
    userAgent: userAgent.substring(0, 100) + '...',
    method: req.method
  });
  console.log('[QR Code Proxy] Backend URL:', apiUrl);

  try {
    const response = await fetchWithJwtRetry(apiUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
        ...(isMobileHeader && { 'X-Mobile-Request': 'true' }),
        ...(isQrPageGeneration && { 'X-QR-Page-Generation': 'true' })
      },
    });
    
    console.log('[QR Code Proxy] Backend response status:', response.status);
    console.log('[QR Code Proxy] Backend response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('[QR Code Proxy] Backend error response:', errorText);
      res.status(response.status).json({ error: 'Backend error', details: errorText });
      return;
    }
    
    // Check if the response is an image
    const contentType = response.headers.get('content-type');
    console.log('[QR Code Proxy] Content-Type:', contentType);
    
    if (contentType && contentType.startsWith('image/')) {
      // Handle image response - convert to base64 data URL
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const dataUrl = `data:${contentType};base64,${base64}`;
      
      console.log('[QR Code Proxy] Image response converted to data URL, length:', dataUrl.length);
      res.status(200).send(dataUrl);
    } else {
      // Handle text response
      const data = await response.text();
      console.log('[QR Code Proxy] Text response:', data);
      res.status(response.status).send(data);
    }
  } catch (error) {
    console.error('Error in QR code proxy:', error);
    res.status(500).json({ error: 'Failed to fetch QR code' });
  }
}