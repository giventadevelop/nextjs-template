/**
 * Lazily loads API JWT user from environment variables, prioritizing AMPLIFY_ prefix for AWS Amplify.
 */
export function getApiJwtUser() {
  return (
    process.env.AMPLIFY_API_JWT_USER ||
    process.env.API_JWT_USER ||
    process.env.NEXT_PUBLIC_API_JWT_USER
  );
}

/**
 * Lazily loads API JWT password from environment variables, prioritizing AMPLIFY_ prefix for AWS Amplify.
 */
export function getApiJwtPass() {
  return (
    process.env.AMPLIFY_API_JWT_PASS ||
    process.env.API_JWT_PASS ||
    process.env.NEXT_PUBLIC_API_JWT_PASS
  );
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
 * Returns the full URL including protocol (e.g., "http://localhost:3000" or "https://www.adwiise.com")
 */
export function getAppUrl(): string {
  // Log all relevant environment variables for debugging
  console.log('[getAppUrl] Environment debug:', {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    AMPLIFY_NEXT_PUBLIC_APP_URL: process.env.AMPLIFY_NEXT_PUBLIC_APP_URL,
    AWS_LAMBDA_FUNCTION_NAME: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
    AMPLIFY_APP_ID: !!process.env.AMPLIFY_APP_ID,
    VERCEL: !!process.env.VERCEL,
    NETLIFY: !!process.env.NETLIFY
  });
  
  // Always prefer explicit URL environment variables
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.AMPLIFY_NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    console.log('[getAppUrl] Using explicit app URL:', appUrl);
    return appUrl;
  }
  
  // Check for AWS Lambda/Amplify environment indicators
  const isAWSLambda = process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.AMPLIFY_APP_ID;
  const isVercel = process.env.VERCEL || process.env.VERCEL_URL;
  const isNetlify = process.env.NETLIFY;
  
  // If we're in a cloud environment or production, use production domain
  if (process.env.NODE_ENV === 'production' || isAWSLambda || isVercel || isNetlify) {
    console.log('[getAppUrl] Using production domain - detected cloud environment');
    return 'https://www.adwiise.com';
  }
  
  // In development, use localhost with dynamic port detection
  console.log('[getAppUrl] Using localhost - local development detected');
  return 'http://localhost:3000';
}

/**
 * Get the email host URL prefix for QR code generation
 * This is used to ensure QR codes work properly in email contexts
 * Returns the full URL including protocol (e.g., "http://localhost:3000" or "https://www.adwiise.com")
 */
export function getEmailHostUrlPrefix(): string {
  // Always prefer explicit NEXT_PUBLIC_APP_URL if set
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // Check for cloud environment indicators
  const isAWSLambda = process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.AMPLIFY_APP_ID;
  const isVercel = process.env.VERCEL || process.env.VERCEL_URL;
  const isNetlify = process.env.NETLIFY;
  
  // If we're in a cloud environment or production, use production domain
  if (process.env.NODE_ENV === 'production' || isAWSLambda || isVercel || isNetlify) {
    return 'https://www.adwiise.com';
  }
  
  // In development, use localhost
  return 'http://localhost:3000';
}