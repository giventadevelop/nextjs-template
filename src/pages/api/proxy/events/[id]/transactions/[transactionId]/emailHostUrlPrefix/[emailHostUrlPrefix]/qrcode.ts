import type { NextApiRequest, NextApiResponse } from 'next';
import { getCachedApiJwt, generateApiJwt } from '@/lib/api/jwt';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function fetchWithJwtRetry(apiUrl: string, options: any = {}, debugLabel = '') {
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
  console.log('[QR Code Proxy] Request received:', {
    method: req.method,
    query: req.query
  });

  if (!API_BASE_URL) {
    res.status(500).json({ error: 'API base URL not configured' });
    return;
  }

  const { id, transactionId, emailHostUrlPrefix } = req.query;
  
  if (!id || !transactionId || !emailHostUrlPrefix) {
    res.status(400).json({ error: 'Missing eventId, transactionId, or emailHostUrlPrefix' });
    return;
  }

  // Decode the Base64 emailHostUrlPrefix for logging
  let decodedEmailHostUrlPrefix = '';
  try {
    decodedEmailHostUrlPrefix = Buffer.from(emailHostUrlPrefix as string, 'base64').toString();
  } catch (error) {
    console.error('[QR Code Proxy] Failed to decode emailHostUrlPrefix:', error);
  }

  // Create backend URL that matches the API specification
  const apiUrl = `${API_BASE_URL}/api/events/${id}/transactions/${transactionId}/emailHostUrlPrefix/${emailHostUrlPrefix}/qrcode`;

  console.log('[QR Code Proxy] Backend API call:', {
    eventId: id,
    transactionId: transactionId,
    emailHostUrlPrefix: decodedEmailHostUrlPrefix,
    encodedEmailHostUrlPrefix: emailHostUrlPrefix,
    backendUrl: apiUrl
  });

  try {
    console.log('[QR Code Proxy] Calling fetchWithJwtRetry with:', {
      url: apiUrl,
      method: req.method
    });

    const response = await fetchWithJwtRetry(apiUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
    }, 'event-transaction-qrcode');
    
    console.log('[QR Code Proxy] Backend response received:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      ok: response.ok
    });
    
    // Handle response as text since backend returns S3 URL as plain text
    const data = await response.text();
    console.log('[QR Code Proxy] S3 URL received:', {
      dataLength: data.length,
      dataPreview: data.substring(0, 100),
      fullData: data
    });
    
    if (!response.ok) {
      console.error('[QR Code Proxy] Backend returned error:', {
        status: response.status,
        statusText: response.statusText,
        errorData: data
      });
    }
    
    res.status(response.status).send(data);
  } catch (error: any) {
    console.error('[QR Code Proxy] EXCEPTION during QR proxy:', {
      message: error.message,
      stack: error.stack,
      apiUrl,
      eventId: id,
      transactionId,
      emailHostUrlPrefix: decodedEmailHostUrlPrefix
    });
    res.status(500).json({ error: 'Failed to fetch QR code', details: error.message });
  }
}