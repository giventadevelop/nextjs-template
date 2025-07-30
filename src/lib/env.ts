/**
 * Lazily loads API JWT user from environment variables, supporting AMPLIFY_ and unprefixed names.
 */
export function getApiJwtUser() {
  const amplifyUser = process.env.AMPLIFY_API_JWT_USER;
  const apiUser = process.env.API_JWT_USER;
  const publicUser = process.env.NEXT_PUBLIC_API_JWT_USER;
  
  console.log('[ENV DEBUG] AMPLIFY_API_JWT_USER:', amplifyUser ? 'SET' : 'UNDEFINED');
  console.log('[ENV DEBUG] API_JWT_USER:', apiUser ? 'SET' : 'UNDEFINED');
  console.log('[ENV DEBUG] NEXT_PUBLIC_API_JWT_USER:', publicUser ? 'SET' : 'UNDEFINED');
  
  return amplifyUser || apiUser || publicUser;
}

/**
 * Lazily loads API JWT password from environment variables, supporting AMPLIFY_ and unprefixed names.
 */
export function getApiJwtPass() {
  const amplifyPass = process.env.AMPLIFY_API_JWT_PASS;
  const apiPass = process.env.API_JWT_PASS;
  const publicPass = process.env.NEXT_PUBLIC_API_JWT_PASS;
  
  console.log('[ENV DEBUG] AMPLIFY_API_JWT_PASS:', amplifyPass ? 'SET' : 'UNDEFINED');
  console.log('[ENV DEBUG] API_JWT_PASS:', apiPass ? 'SET' : 'UNDEFINED');
  console.log('[ENV DEBUG] NEXT_PUBLIC_API_JWT_PASS:', publicPass ? 'SET' : 'UNDEFINED');
  
  return amplifyPass || apiPass || publicPass;
}

/**
 * Lazily loads tenant ID from environment variables (NEXT_PUBLIC_TENANT_ID).
 * Throws an error if not set.
 */
export function getTenantId() {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID;
  if (!tenantId) {
    throw new Error('NEXT_PUBLIC_TENANT_ID is not set in environment variables');
  }
  return tenantId;
}

/**
 * Get the app URL for port-agnostic configuration
 * This is used for server-side API calls to ensure the application works on any port
 * Returns the full URL including protocol (e.g., "http://localhost:3000" or "https://mcefee.org")
 */
export function getAppUrl(): string {
  // In production, use the actual domain
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_APP_URL || 'https://mcefee.org';
  }
  // In development, use localhost with dynamic port detection
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * Get the email host URL prefix for QR code generation
 * This is used to ensure QR codes work properly in email contexts
 * Returns the full URL including protocol (e.g., "http://localhost:3000" or "https://mcefee.org")
 */
export function getEmailHostUrlPrefix(): string {
  // In production, use the actual domain
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_APP_URL || 'https://mcefee.org';
  }
  // In development, use localhost
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}