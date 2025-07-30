import jwt from 'jsonwebtoken';
import { getApiJwtUser, getApiJwtPass } from '../env';

/**
 * Generates a JWT token for API authentication using env credentials.
 * Adjust payload/secret as per backend requirements.
 */
export async function generateApiJwt() {
  // Try AWS Amplify approach - use regular env vars (server-side only)
  const userAws = process.env.API_JWT_USER;
  const passAws = process.env.API_JWT_PASS;
  
  // Try NEXT_PUBLIC_ approach
  const userPublic = process.env.NEXT_PUBLIC_API_JWT_USER;
  const passPublic = process.env.NEXT_PUBLIC_API_JWT_PASS;
  
  // Try helper functions
  const userHelper = getApiJwtUser();
  const passHelper = getApiJwtPass();
  
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  // Debug logging to see what we're getting
  console.log('[JWT DEBUG] AWS style API_JWT_USER:', userAws ? 'SET' : 'UNDEFINED');
  console.log('[JWT DEBUG] AWS style API_JWT_PASS:', passAws ? 'SET' : 'UNDEFINED');
  console.log('[JWT DEBUG] Public NEXT_PUBLIC_API_JWT_USER:', userPublic ? 'SET' : 'UNDEFINED');
  console.log('[JWT DEBUG] Public NEXT_PUBLIC_API_JWT_PASS:', passPublic ? 'SET' : 'UNDEFINED');
  console.log('[JWT DEBUG] Helper getApiJwtUser():', userHelper ? 'SET' : 'UNDEFINED');
  console.log('[JWT DEBUG] Helper getApiJwtPass():', passHelper ? 'SET' : 'UNDEFINED');
  console.log('[JWT DEBUG] API_BASE_URL:', API_BASE_URL ? 'SET' : 'UNDEFINED');
  console.log('[JWT DEBUG] NODE_ENV:', process.env.NODE_ENV);
  
  // Debug: Show all environment variables that contain 'JWT'
  console.log('[JWT DEBUG] All JWT-related env vars:');
  Object.keys(process.env).filter(key => key.includes('JWT')).forEach(key => {
    console.log(`[JWT DEBUG] ${key}:`, process.env[key] ? 'SET' : 'UNDEFINED');
  });
  
  // Use whichever approach works
  const finalUser = userAws || userPublic || userHelper;
  const finalPass = passAws || passPublic || passHelper;
  
  if (!finalUser || !finalPass || !API_BASE_URL) {
    console.log('[JWT DEBUG] Missing values - user:', finalUser, 'pass:', finalPass, 'URL:', API_BASE_URL);
    throw new Error('API JWT credentials or API base URL missing');
  }

  const apiUrl = `${API_BASE_URL}/api/authenticate`;
  const body = {
    username: finalUser,
    password: finalPass,
    rememberMe: true,
  };

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch JWT from backend: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  // The backend should return { id_token: '...' }
  if (!data.id_token) {
    throw new Error('No id_token returned from backend');
  }
  return data.id_token;
}

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

export async function getCachedApiJwt() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && tokenExpiry && now < tokenExpiry - 60) { // 60s buffer
    return cachedToken;
  }
  // Fetch new token
  const token = await generateApiJwt();
  // Decode expiry from JWT
  const [, payloadB64] = token.split('.');
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
  tokenExpiry = payload.exp;
  cachedToken = token;
  return cachedToken;
}